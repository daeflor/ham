import {
    getCurrentFirebaseUser,
    observeFirebaseAuthState,
    signInToFirebase,
    signOutFromFirebase
} from './firebase-api.js';
import { createLibrary } from './library.js';
import { compareTracklists } from './tracklist-comparison.js';

/**
 * @typedef {ReturnType<typeof import('./shell-view.js').createShellView>} ShellView
 * @typedef {ReturnType<typeof import('./playlists-view.js').createPlaylistsView>} PlaylistsView
 * @typedef {ReturnType<typeof import('./selected-playlist-view.js').createSelectedPlaylistView>} SelectedPlaylistView
 * @typedef {ReturnType<typeof import('./comparison-view.js').createComparisonView>} ComparisonView
 */

/**
 * @param {{
 *   shellView: ShellView,
 *   playlistsView: PlaylistsView,
 *   selectedPlaylistView: SelectedPlaylistView,
 *   comparisonView: ComparisonView
 * }} views
 */
export function createAppController({ shellView, playlistsView, selectedPlaylistView, comparisonView }) {
    let musicKitInstance;
    let library;
    let isInitializing = false;
    let selectedPlaylistId = null;
    let comparisonTracks = null;

    const firebaseSession = {
        userId: '',
        userName: ''
    };

    async function loadAppConfig() {
        const response = await fetch('./config/config.local.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Missing config/config.local.json. Run 'npm run generate-config' to create it.`);
        }

        const config = await response.json();
        const developerToken = String(config?.developerToken ?? '').trim();
        if (!developerToken) {
            throw new Error('config/config.local.json is missing developerToken.');
        }

        return {
            developerToken,
            app: {
                name: String(config?.app?.name ?? 'HAM'),
                build: String(config?.app?.build ?? '0.0.1')
            }
        };
    }

    async function ensureMusicKitConfigured() {
        if (musicKitInstance) {
            return musicKitInstance;
        }

        const config = await loadAppConfig();

        await MusicKit.configure({
            developerToken: config.developerToken,
            app: config.app,
        });

        musicKitInstance = MusicKit.getInstance();
        return musicKitInstance;
    }

    async function handleInitializeApp() {
        if (isInitializing) {
            return;
        }

        isInitializing = true;
        shellView.setLandingLoadingState(true);
        shellView.setLandingStatus('Signing into Google Firebase…');

        try {
            await ensureFirebaseSignedIn();

            shellView.setLandingStatus('Configuring MusicKit…');
            const musicKit = await ensureMusicKitConfigured();

            shellView.setLandingStatus('Requesting access to your Apple Music account…');
            if (!musicKit.isAuthorized) {
                await musicKit.authorize();
            }

            shellView.setLandingStatus('Loading your library…');
            library = createLibrary(musicKit);
            await library.initialize();
            playlistsView.renderPlaylists(library.getPlaylists(), handlePlaylistSelected);
            playlistsView.setPlaylistCount(library.getPlaylistTransferCounts());

            shellView.setLandingStatus('');
            shellView.hideLandingShell();
            shellView.showAppShell();
            watchFirebaseSessionChanges();
        } catch (error) {
            console.error('Failed to start MusicKit flow', error);
            const message = error instanceof Error ? error.message : 'Unable to connect to Apple Music. Please try again.';
            shellView.setLandingStatus(message);
        } finally {
            isInitializing = false;
            shellView.setLandingLoadingState(false);
        }
    }

    async function ensureFirebaseSignedIn() {
        const cachedUser = await getCurrentFirebaseUser();
        const user = cachedUser ?? (await signInToFirebase()).user;
        firebaseSession.userId = user?.uid ?? '';
        firebaseSession.userName = user?.email?.split('@')[0] ?? '';
        shellView.renderFirebaseSignedIn(firebaseSession.userName);
    }

    async function handleFirebaseSignOut() {
        try {
            await signOutFromFirebase();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to sign out of Google Firebase.';
            shellView.setStatus(message);
            console.error('Failed to sign out of Firebase', error);
        }
    }

    // Watches for unexpected changes to the Firebase session (e.g., user signs out in another tab) and reloads the app if the user has changed or signed out
    function watchFirebaseSessionChanges() {
        observeFirebaseAuthState(
            (user) => {
                if (!user || user.uid !== firebaseSession.userId) {
                    reloadAppAfterFirebaseSessionChanged();
                }
            },
            (error) => {
                const message = error instanceof Error ? error.message : 'Unable to verify Google Firebase sign-in.';
                shellView.setStatus(message);
                console.error('Failed to observe Firebase sign-in state', error);
            }
        );
    }

    function reloadAppAfterFirebaseSessionChanged() {
        window.location.reload();
    }

    function handlePlaylistSelected(playlist) {
        selectedPlaylistId = playlist.id;
        shellView.setStatus('');
        selectedPlaylistView.clearSelectedAction();
        selectedPlaylistView.showSelectedPlaylist({
            name: playlist.name,
            isTransferred: playlist.isTransferred
        });
        selectedPlaylistView.clearTracks();
        selectedPlaylistView.hideTracks();
        comparisonTracks = null;
        comparisonView.clearComparison();
        comparisonView.hideComparison();
    }

    async function handleAppleTracksRequested() {
        comparisonView.hideComparison();
        selectedPlaylistView.showTracksLoading('apple-tracks');

        try {
            const tracks = await library.getLiveAppleMusicTracks(selectedPlaylistId);
            selectedPlaylistView.renderTracks(tracks);
        } catch (error) {
            console.error('Failed to load tracks', error);
            selectedPlaylistView.showTracksError('Failed to load tracks for this playlist.');
        }
    }

    async function handleYoutubeTracksRequested() {
        comparisonView.hideComparison();
        selectedPlaylistView.showTracksLoading('youtube-tracks');

        try {
            const youtubeTracks = await library.getStoredYoutubeMusicTracks(selectedPlaylistId);

            if (!youtubeTracks) {
                selectedPlaylistView.showTracksError(`No YouTube Music equivalent playlist found.`);
                return;
            }

            selectedPlaylistView.renderTracks(youtubeTracks);
        } catch (error) {
            console.error('Failed to load YouTube Music tracks from Firebase', error);
            selectedPlaylistView.showTracksError('Failed to load the YouTube Music equivalent for this playlist.');
        }
    }

    async function handleYoutubeComparisonRequested() {
        selectedPlaylistView.showYoutubeComparisonSelected();
        comparisonTracks = null;
        comparisonView.showLoading();

        try {
            const [appleTracks, youtubeTracks] = await Promise.all([
                library.getLiveAppleMusicTracks(selectedPlaylistId),
                library.getStoredYoutubeMusicTracks(selectedPlaylistId)
            ]);

            if (!youtubeTracks) {
                comparisonView.showError('No YouTube Music equivalent playlist found.');
                return;
            }

            comparisonTracks = {
                youtubeTracks,
                appleTracks
            };
            renderCurrentComparison();
        } catch (error) {
            console.error('Failed to compare tracklists', error);
            comparisonView.showError('Failed to compare the Apple Music and YouTube Music tracklists.');
        }
    }

    function renderCurrentComparison() {
        if (!comparisonTracks) {
            return;
        }

        const comparison = compareTracklists(
            comparisonTracks.youtubeTracks,
            comparisonTracks.appleTracks,
            comparisonView.getComparisonOptions()
        );

        comparisonView.renderComparison({
            removedTracks: comparison.removedTracks,
            addedTracks: comparison.addedTracks,
            matchedTrackCount: comparison.matchedTracks.length
        });
    }

    async function transferPlaylist() {
        // Keep track of the playlist ID being transferred in case the user selects a different playlist while the transfer is in progress
        const transferringPlaylistId = selectedPlaylistId;

        try {
            selectedPlaylistView.setTransferInProgress(true);
            await library.storeAppleMusicTracks(transferringPlaylistId);
            playlistsView.setPlaylistTransferred(transferringPlaylistId, true);
            playlistsView.setPlaylistCount(library.getPlaylistTransferCounts());
            if (selectedPlaylistId === transferringPlaylistId) {
                selectedPlaylistView.setTransferredState(true);
            }
        } catch (error) {
            console.error('Failed to save Apple Music transfer data', error);
            const message = error instanceof Error ? error.message : 'Unable to save Apple Music transfer data.';
            shellView.setStatus(message);
        } finally {
            selectedPlaylistView.setTransferInProgress(false);
        }
    }

    function bindEvents() {
        shellView.onConnect(handleInitializeApp);
        shellView.onFirebaseSignOut(handleFirebaseSignOut);
        selectedPlaylistView.onAppleTracksRequested(handleAppleTracksRequested);
        selectedPlaylistView.onYoutubeTracksRequested(handleYoutubeTracksRequested);
        selectedPlaylistView.onYoutubeComparisonRequested(handleYoutubeComparisonRequested);
        selectedPlaylistView.onTransferRequested(transferPlaylist);
        comparisonView.onComparisonOptionsChanged(renderCurrentComparison);
    }

    function start() {
        console.info('MusicKit loaded');
        bindEvents();
    }

    return {
        start
    };
}
