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
import { clearYoutubeTracklistCache, getYoutubeTracklistByApplePlaylistName } from './youtube-tracklists.js';

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
    let isFirebaseAuthPending = false;
    let selectedPlaylist = null;
    let playlistTotalCount = 0;
    const transferredPlaylistIds = new Set();

    const firebaseSession = {
        isSignedIn: false,
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
        shellView.setLandingStatus('Configuring MusicKit…');

        try {
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

            watchFirebaseSignInState();

            shellView.setLandingStatus('');
            shellView.hideLandingShell();
            shellView.showAppShell();
        } catch (error) {
            console.error('Failed to start MusicKit flow', error);
            const message = error instanceof Error ? error.message : 'Unable to connect to Apple Music. Please try again.';
            shellView.setLandingStatus(message);
        } finally {
            isInitializing = false;
        }
    }

    function handlePlaylistSelected(playlist) {
        selectedPlaylist = playlist;
        playlistsView.setSelectedPlaylistButton(playlist.id);
        selectedPlaylistView.clearSelectedAction();
        selectedPlaylistView.showSelectedPlaylist({
            name: getApplePlaylistName(playlist)
        });
        selectedPlaylistView.clearTracks();
        selectedPlaylistView.hideTracks();
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

    function handleComparisonRequested() {
        selectedPlaylistView.showComparisonSelected();
        comparisonView.renderComparison({
            isTransferred: transferredPlaylistIds.has(selectedPlaylist.id),
            removedTracks: getPlaceholderRemovedTracks(),
            addedTracks: getPlaceholderAddedTracks()
        });
    }

    function handleSaveCurrentVersion() {
        comparisonView.showStatus('Saved this playlist as the latest Apple Music version.');
    }

    function handleMarkPlaylistTransferred() {
        transferredPlaylistIds.add(selectedPlaylist.id);
        playlistsView.setPlaylistTransferred(selectedPlaylist.id, true);
        playlistsView.setPlaylistCount({
            transferredCount: transferredPlaylistIds.size,
            totalCount: playlistTotalCount
        });
        comparisonView.setTransferredState(true);
        comparisonView.showStatus('Marked as transferred.');
    }

    function watchFirebaseSignInState() {
        observeFirebaseAuthState(
            (user) => {
                isFirebaseAuthPending = false;
                applyFirebaseUser(user);
                syncFirebaseUi();
            },
            (error) => {
                isFirebaseAuthPending = false;
                applyFirebaseUser(null);
                syncFirebaseUi();
                console.error('Failed to observe Firebase sign-in state', error);
            }
        );
    }

    function syncFirebaseUi() {
        shellView.renderFirebaseSession({
            isAuthPending: isFirebaseAuthPending,
            session: firebaseSession
        });

        selectedPlaylistView.setFirebaseConnectionState({
            isFirebaseSignedIn: firebaseSession.isSignedIn
        });
    }

    function applyFirebaseUser(user) {
        const userId = user?.uid ?? '';
        if (firebaseSession.userId !== userId) {
            clearYoutubeTracklistCache();
        }

        firebaseSession.isSignedIn = Boolean(user);
        firebaseSession.userId = userId;
        firebaseSession.userName = user?.email?.split('@')[0] ?? 'Unknown User';
    }

    async function handleFirebaseSignIn() {
        if (isFirebaseAuthPending || firebaseSession.isSignedIn) {
            return;
        }

        isFirebaseAuthPending = true;
        syncFirebaseUi();

        try {
            const result = await signInToFirebase();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to sign into Google Firebase.';
            shellView.setStatus(message);
            console.error('Failed to sign into Firebase', error);
        }
    }

    async function handleFirebaseSignOut() {
        if (isFirebaseAuthPending || !firebaseSession.isSignedIn) {
            return;
        }

        isFirebaseAuthPending = true;

        try {
            await signOutFromFirebase();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to sign out of Google Firebase.';
            shellView.setStatus(message);
            console.error('Failed to sign out of Firebase', error);
        }
    }

    function getPlaceholderRemovedTracks() {
        return [
            { title: 'Old Moon', artist: 'The Field Notes', album: 'After Images', readableDuration: '4:12' },
            { title: 'Static Bloom', artist: 'Glass Harbor', album: 'Half-Light', readableDuration: '3:48' },
            { title: 'Northbound', artist: 'Mara Vale', album: 'Quiet Signals', readableDuration: '5:07' }
        ];
    }

    function getPlaceholderAddedTracks() {
        return [
            { title: 'Bright Circuit', artist: 'Glass Harbor', album: 'New Weather', readableDuration: '3:39' },
            { title: 'Low Tide Edit', artist: 'Mara Vale', album: 'Quiet Signals', readableDuration: '4:44' },
            { title: 'Paper Sun', artist: 'The Field Notes', album: 'After Images', readableDuration: '3:58' }
        ];
    }

    function bindEvents() {
        shellView.onConnect(handleInitializeApp);
        shellView.onFirebaseSignIn(handleFirebaseSignIn);
        shellView.onFirebaseSignOut(handleFirebaseSignOut);
        selectedPlaylistView.onAppleTracksRequested(handleAppleTracksRequested);
        selectedPlaylistView.onYoutubeTracksRequested(handleYoutubeTracksRequested);
        selectedPlaylistView.onComparisonRequested(handleComparisonRequested);
        comparisonView.onSaveCurrentVersion(handleSaveCurrentVersion);
        comparisonView.onMarkTransferred(handleMarkPlaylistTransferred);
    }

    function start() {
        console.info('MusicKit loaded');
        bindEvents();
    }

    return {
        start
    };
}
