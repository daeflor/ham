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

export function createAppController({ shellView, workspaceView }) {
    let musicInstance;
    let isInitializing = false;
    let isFirebaseCheckingAuth = true;
    let isFirebaseSigningIn = false;
    let appConfigPromise;
    let selectedPlaylist = null;

    const firebaseSession = {
        isSignedIn: false,
        userId: '',
        userName: ''
    };

    function getFirebaseUserName(user) {
        const email = String(user?.email ?? '').trim();
        if (email.includes('@')) {
            return email.split('@')[0];
        }

        const displayName = String(user?.displayName ?? '').trim();
        if (displayName) {
            return displayName;
        }

        return 'Signed in';
    }

    async function loadAppConfig() {
        if (appConfigPromise) {
            return appConfigPromise;
        }

        appConfigPromise = fetch('./config/config.local.json', { cache: 'no-store' })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Missing config/config.local.json. Run npm run generate-config to create it.');
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
            })
            .catch((error) => {
                appConfigPromise = undefined;
                throw error;
            });

        return appConfigPromise;
    }

    function syncFirebaseUi() {
        shellView.renderFirebaseSession({
            isCheckingAuth: isFirebaseCheckingAuth,
            isSigningIn: isFirebaseSigningIn,
            session: firebaseSession
        });

        workspaceView.setIntegrationState({
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
        firebaseSession.userName = user ? getFirebaseUserName(user) : '';
    }

    function watchFirebaseSignInState() {
        observeFirebaseAuthState(
            (user) => {
                applyFirebaseUser(user);
                isFirebaseCheckingAuth = false;
                syncFirebaseUi();
            },
            (error) => {
                console.error('Failed to observe Firebase sign-in state', error);
                applyFirebaseUser(null);
                isFirebaseCheckingAuth = false;
                syncFirebaseUi();
            }
        );
    }

    function handlePlaylistSelected(playlist) {
        selectedPlaylist = playlist;
        workspaceView.setSelectedPlaylistButton(playlist.id);
        workspaceView.clearSelectedAction();
        workspaceView.showSelectedPlaylist({
            name: getApplePlaylistName(playlist)
        });
        workspaceView.showPlaylistActions({
            isFirebaseSignedIn: firebaseSession.isSignedIn
        });
        workspaceView.clearTrackView();
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

    async function loadTracksForPlaylist(playlist) {
        const playlistId = playlist.id;
        const playlistName = getApplePlaylistName(playlist);

        workspaceView.setSelectedPlaylistButton(playlistId);
        workspaceView.showTracksLoading(playlistName);

        try {
            const tracks = await getApplePlaylistTracks(musicInstance, playlistId);
            workspaceView.setStatus('');
            workspaceView.renderTracks(tracks, { playlistName });
        } catch (error) {
            console.error('Failed to load tracks', error);
            workspaceView.setStatus('Failed to load tracks for this playlist.');
            workspaceView.showTracksError('Failed to load tracks for this playlist.');
        }
    }

    async function loadYoutubeTracksForPlaylist(playlist) {
        const playlistName = getApplePlaylistName(playlist);

        workspaceView.showTracksLoading(playlistName, {
            actionKey: 'youtube-tracks',
            sourceName: 'YouTube Music'
        });

        try {
            const tracklistData = await getYoutubeTracklistByApplePlaylistName(playlistName);

            if (!tracklistData) {
                workspaceView.setStatus(`No YouTube Music equivalent found for ${playlistName}.`);
                workspaceView.showTracksError(`No YouTube Music equivalent found for ${playlistName}.`);
                return;
            }

            workspaceView.setStatus('');
            workspaceView.renderTracks(tracklistData.tracks, {
                actionKey: 'youtube-tracks',
                playlistName: `${tracklistData.title ?? playlistName} (YouTube Music)`,
                emptyMessage: 'No YouTube Music tracks found in this playlist.'
            });
        } catch (error) {
            console.error('Failed to load YouTube Music tracks from Firebase', error);
            workspaceView.setStatus('Failed to load the YouTube Music equivalent for this playlist.');
            workspaceView.showTracksError('Failed to load the YouTube Music equivalent for this playlist.');
        }
    }

    async function startExperience() {
        if (isInitializing) {
            return;
        }

        isInitializing = true;
        shellView.setConnectButtonLoading();
        shellView.setLandingLoadingState(true);
        shellView.setLandingStatus('Preparing MusicKit…');

        try {
            const music = await ensureMusicKitConfigured();

            shellView.setLandingStatus('Requesting access to your Apple Music account…');
            if (!music.isAuthorized) {
                await music.authorize();
            }

            shellView.setLandingStatus('Loading your library playlists…');
            const playlists = await getAppleLibraryPlaylists(music);
            workspaceView.renderPlaylists(playlists, handlePlaylistSelected);
            workspaceView.setPlaylistCount(playlists.length);
            syncFirebaseUi();

            shellView.showAppShell();
            shellView.hideLandingShell();
            shellView.setLandingStatus('');
        } catch (error) {
            console.error('Failed to start MusicKit flow', error);
            const message = error instanceof Error ? error.message : 'Unable to connect to Apple Music. Please try again.';
            shellView.setLandingStatus(message);
        } finally {
            isInitializing = false;
        }
    }

    async function handleFirebaseSignIn() {
        if (isFirebaseSigningIn || firebaseSession.isSignedIn) {
            return;
        }

        isFirebaseSigningIn = true;
        syncFirebaseUi();
        workspaceView.setStatus('Opening Google sign-in…');

        try {
            const result = await signInToFirebase();
            applyFirebaseUser(result.user);
            workspaceView.setStatus('');
        } catch (error) {
            console.error('Failed to sign into Firebase', error);
            const message = error instanceof Error ? error.message : 'Unable to sign into Google Firebase.';
            workspaceView.setStatus(message);
        } finally {
            isFirebaseSigningIn = false;
            syncFirebaseUi();
        }
    }

    async function handleFirebaseSignOut() {
        if (isFirebaseSigningIn || !firebaseSession.isSignedIn) {
            return;
        }

        isFirebaseSigningIn = true;
        syncFirebaseUi();

        try {
            await signOutFromFirebase();
            applyFirebaseUser(null);
            workspaceView.setStatus('');
        } catch (error) {
            console.error('Failed to sign out of Firebase', error);
            const message = error instanceof Error ? error.message : 'Unable to sign out of Google Firebase.';
            workspaceView.setStatus(message);
        } finally {
            isFirebaseSigningIn = false;
            syncFirebaseUi();
        }
    }

    function handleAppleTracksRequested() {
        if (!selectedPlaylist) {
            console.warn('Apple tracks action invoked without a selected playlist.');
            return;
        }

        void loadTracksForPlaylist(selectedPlaylist);
    }

    function handleYoutubeTracksRequested() {
        if (!selectedPlaylist) {
            console.warn('YouTube tracks action invoked without a selected playlist.');
            return;
        }

        if (!firebaseSession.isSignedIn) {
            workspaceView.setStatus('Sign into Google Firebase to load YouTube Music equivalents.');
            return;
        }

        void loadYoutubeTracksForPlaylist(selectedPlaylist);
    }

    function bindEvents() {
        shellView.onConnect(startExperience);
        shellView.onFirebaseSignIn(handleFirebaseSignIn);
        shellView.onFirebaseSignOut(handleFirebaseSignOut);
        workspaceView.onAppleTracksRequested(handleAppleTracksRequested);
        workspaceView.onYoutubeTracksRequested(handleYoutubeTracksRequested);
    }

    function start() {
        console.info('MusicKit loaded');
        bindEvents();
        watchFirebaseSignInState();
    }

    return {
        start
    };
}
