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

export function createAppController({ shellView, playlistsView, selectedPlaylistView }) {
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
            playlistsView.renderPlaylists(playlists, handlePlaylistSelected);
            playlistsView.setPlaylistCount(playlists.length);
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

    function handlePlaylistSelected(playlist) {
        selectedPlaylist = playlist;
        playlistsView.setSelectedPlaylistButton(playlist.id);
        selectedPlaylistView.clearSelectedAction();
        selectedPlaylistView.showSelectedPlaylist({
            name: getApplePlaylistName(playlist)
        });
        selectedPlaylistView.showPlaylistActions({
            isFirebaseSignedIn: firebaseSession.isSignedIn
        });
        selectedPlaylistView.clearTrackView();
    }

    function handleAppleTracksRequested() {
        void loadAppleMusicTracks(selectedPlaylist);
    }

    async function loadAppleMusicTracks(playlist) {
        selectedPlaylistView.showTracksLoading('apple-tracks');

        try {
            const tracks = await getApplePlaylistTracks(musicInstance, playlist.id);
            selectedPlaylistView.renderTracks(tracks);
        } catch (error) {
            console.error('Failed to load tracks', error);
            selectedPlaylistView.showTracksError('Failed to load tracks for this playlist.');
        }
    }

    function handleYoutubeTracksRequested() {
        void loadYouTubeMusicTracks(selectedPlaylist);
    }

    async function loadYouTubeMusicTracks(playlist) {
        selectedPlaylistView.showTracksLoading('youtube-tracks');

        try {
            const playlistName = getApplePlaylistName(playlist);
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

    function syncFirebaseUi() {
        shellView.renderFirebaseSession({
            isCheckingAuth: isFirebaseCheckingAuth,
            isSigningIn: isFirebaseSigningIn,
            session: firebaseSession
        });

        selectedPlaylistView.setIntegrationState({
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

    async function handleFirebaseSignIn() {
        if (isFirebaseSigningIn || firebaseSession.isSignedIn) {
            return;
        }

        isFirebaseSigningIn = true;
        syncFirebaseUi();
        shellView.setStatus('Opening Google sign-in…');

        try {
            const result = await signInToFirebase();
            applyFirebaseUser(result.user);
            shellView.setStatus('');
        } catch (error) {
            console.error('Failed to sign into Firebase', error);
            const message = error instanceof Error ? error.message : 'Unable to sign into Google Firebase.';
            shellView.setStatus(message);
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
            shellView.setStatus('');
        } catch (error) {
            console.error('Failed to sign out of Firebase', error);
            const message = error instanceof Error ? error.message : 'Unable to sign out of Google Firebase.';
            shellView.setStatus(message);
        } finally {
            isFirebaseSigningIn = false;
            syncFirebaseUi();
        }
    }

    function bindEvents() {
        shellView.onConnect(startExperience);
        shellView.onFirebaseSignIn(handleFirebaseSignIn);
        shellView.onFirebaseSignOut(handleFirebaseSignOut);
        selectedPlaylistView.onAppleTracksRequested(handleAppleTracksRequested);
        selectedPlaylistView.onYoutubeTracksRequested(handleYoutubeTracksRequested);
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
