import {
    getAppleLibraryPlaylists,
    getApplePlaylistName,
    getApplePlaylistTracks
} from './apple-playlists.js';
import {
    observeFirebaseAuthState,
    signInToFirebase,
    signOutFromFirebase
} from './firebase-api.js';
import { compareTracklists } from './tracklist-comparison.js';
import { getYoutubeTracklistByApplePlaylistName } from './youtube-tracklists.js';

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
    let musicInstance;
    let isInitializing = false;
    let selectedPlaylist = null;
    let playlistTotalCount = 0;
    let comparisonTracks = null;
    const transferredPlaylistIds = new Set();

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
        if (musicInstance) {
            return musicInstance;
        }

        const config = await loadAppConfig();

        await MusicKit.configure({
            developerToken: config.developerToken,
            app: config.app,
        });

        musicInstance = MusicKit.getInstance();
        return musicInstance;
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
            const music = await ensureMusicKitConfigured();

            shellView.setLandingStatus('Requesting access to your Apple Music account…');
            if (!music.isAuthorized) {
                await music.authorize();
            }

            shellView.setLandingStatus('Loading your library playlists…');
            const playlists = await getAppleLibraryPlaylists(music);
            playlistTotalCount = playlists.length;
            playlistsView.renderPlaylists(playlists, handlePlaylistSelected);
            playlistsView.setPlaylistCount({
                transferredCount: transferredPlaylistIds.size,
                totalCount: playlistTotalCount
            });

            shellView.setLandingStatus('');
            shellView.hideLandingShell();
            shellView.showAppShell();
            watchFirebaseSignInState();
        } catch (error) {
            console.error('Failed to start MusicKit flow', error);
            const message = error instanceof Error ? error.message : 'Unable to connect to Apple Music. Please try again.';
            shellView.setLandingStatus(message);
        } finally {
            isInitializing = false;
            shellView.setLandingLoadingState(false);
        }
    }

    function watchFirebaseSignInState() {
        observeFirebaseAuthState(
            (user) => {
                handleObservedFirebaseUser(user);
            },
            (error) => {
                const message = error instanceof Error ? error.message : 'Unable to verify Google Firebase sign-in.';
                shellView.setStatus(message);
                console.error('Failed to observe Firebase sign-in state', error);
            }
        );
    }

    function handleObservedFirebaseUser(user) {
        if (!user || user.uid !== firebaseSession.userId) {
            reloadAppAfterFirebaseSessionChanged();
            return;
        }

        applyFirebaseUser(user);
        shellView.renderFirebaseSignedIn(firebaseSession.userName);
    }

    function applyFirebaseUser(user) {
        firebaseSession.userId = user?.uid ?? '';
        firebaseSession.userName = user?.email?.split('@')[0] ?? '';
    }

    async function ensureFirebaseSignedIn() {
        const { user } = await signInToFirebase();
        applyFirebaseUser(user);
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

    function reloadAppAfterFirebaseSessionChanged() {
        window.location.reload();
    }

    function handlePlaylistSelected(playlist) {
        selectedPlaylist = playlist;
        selectedPlaylistView.clearSelectedAction();
        selectedPlaylistView.showSelectedPlaylist({
            name: getApplePlaylistName(playlist),
            isTransferred: transferredPlaylistIds.has(playlist.id)
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
            const tracks = await getApplePlaylistTracks(musicInstance, selectedPlaylist.id);
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
            const playlistName = getApplePlaylistName(selectedPlaylist);
            const tracklistData = await getYoutubeTracklistByApplePlaylistName(playlistName);

            if (!tracklistData) {
                selectedPlaylistView.showTracksError(`No YouTube Music equivalent playlist found.`);
                return;
            }

            selectedPlaylistView.renderTracks(tracklistData.tracks);
        } catch (error) {
            console.error('Failed to load YouTube Music tracks from Firebase', error);
            selectedPlaylistView.showTracksError('Failed to load the YouTube Music equivalent for this playlist.');
        }
    }

    async function handleComparisonRequested() {
        selectedPlaylistView.showComparisonSelected();
        comparisonTracks = null;
        comparisonView.showLoading();

        try {
            const playlistName = getApplePlaylistName(selectedPlaylist);
            const [appleTracks, youtubeTracklistData] = await Promise.all([
                getApplePlaylistTracks(musicInstance, selectedPlaylist.id),
                getYoutubeTracklistByApplePlaylistName(playlistName)
            ]);

            if (!youtubeTracklistData) {
                comparisonView.showError('No YouTube Music equivalent playlist found.');
                return;
            }

            comparisonTracks = {
                youtubeTracks: youtubeTracklistData.tracks,
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

    function handleMarkPlaylistTransferred() {
        transferredPlaylistIds.add(selectedPlaylist.id);
        playlistsView.setPlaylistTransferred(selectedPlaylist.id, true);
        playlistsView.setPlaylistCount({
            transferredCount: transferredPlaylistIds.size,
            totalCount: playlistTotalCount
        });
        selectedPlaylistView.setTransferredState(true);
    }

    function bindEvents() {
        shellView.onConnect(handleInitializeApp);
        shellView.onFirebaseSignOut(handleFirebaseSignOut);
        selectedPlaylistView.onAppleTracksRequested(handleAppleTracksRequested);
        selectedPlaylistView.onYoutubeTracksRequested(handleYoutubeTracksRequested);
        selectedPlaylistView.onComparisonRequested(handleComparisonRequested);
        selectedPlaylistView.onTransferRequested(handleMarkPlaylistTransferred);
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
