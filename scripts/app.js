import { waitForAppReady } from './utils.js';
import { fetchLibraryPlaylists, fetchPlaylistTracks } from './musickit-api.js';
import { createUIController } from './ui.js';
import { retrieveTracklistDataFromFirestoreByTitle, signInToFirebase, signOutFromFirebase } from './firebase.js';

await waitForAppReady();

const elements = {
    appShellEl: document.getElementById('appShell'),
    landingShellEl: document.getElementById('landingShell'),
    landingActionsEl: document.getElementById('landingActions'),
    connectButtonEl: document.getElementById('connectButton'),
    landingStatusEl: document.getElementById('landingStatus'),
    firebaseButtonEl: document.getElementById('firebaseButton'),
    firebaseSessionEl: document.getElementById('firebaseSession'),
    firebaseUserEl: document.getElementById('firebaseUser'),
    firebaseSignOutButtonEl: document.getElementById('firebaseSignOutButton'),
    statusEl: document.getElementById('status'),
    playlistListEl: document.getElementById('playlistList'),
    playlistCountEl: document.getElementById('playlistCount'),
    detailPanelEl: document.getElementById('detailPanel'),
    selectionCardEl: document.getElementById('selectionCard'),
    selectionTitleEl: document.getElementById('selectionTitle'),
    selectionDescriptionEl: document.getElementById('selectionDescription'),
    playlistActionsEl: document.getElementById('playlistActions'),
    showAppleTracksButtonEl: document.getElementById('showAppleTracksButton'),
    showYoutubeTracksButtonEl: document.getElementById('showYoutubeTracksButton'),
    showComparisonButtonEl: document.getElementById('showComparisonButton'),
    viewIntroEl: document.getElementById('viewIntro'),
    tracksViewEl: document.getElementById('tracksView'),
    trackSummaryEl: document.getElementById('trackSummary'),
    copyTracksButtonEl: document.getElementById('copyTracksButton'),
    copyFeedbackEl: document.getElementById('copyFeedback'),
    tracksEmptyEl: document.getElementById('tracksEmpty'),
    tracksTableEl: document.getElementById('tracksTable'),
    tracksBodyEl: document.getElementById('tracksBody'),
    paginationEl: document.getElementById('pagination'),
    prevPageBtn: document.getElementById('prevPage'),
    nextPageBtn: document.getElementById('nextPage'),
    pageInfoEl: document.getElementById('pageInfo')
};

if (Object.values(elements).some(el => !el)) {
    console.error('Missing required DOM elements; check index.html');
    throw new Error('Missing required DOM elements');
}

const ui = createUIController(elements);

console.info('MusicKit loaded');

let musicInstance;
let isInitializing = false;
let isFirebaseSigningIn = false;
let appConfigPromise;
let selectedPlaylist = null;

const playlistTracksCache = new Map();
const youtubeTracklistCache = new Map();
const firebaseSession = {
    isSignedIn: false,
    userName: ''
};

function parseDurationToMillis(value) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const parts = value.split(':').map(part => Number.parseInt(part, 10));
    if (parts.length < 2 || parts.length > 3 || parts.some(part => Number.isNaN(part))) {
        return undefined;
    }

    return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
}

function convertStoredYoutubeTrack(track) {
    return {
        attributes: {
            name: track.title,
            artistName: track.artist,
            albumName: track.album,
            durationInMillis: parseDurationToMillis(track.duration)
        }
    };
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

function setLandingStatus(message) {
    elements.landingStatusEl.textContent = message;
}

function setLandingLoadingState(isLoading) {
    elements.landingActionsEl.hidden = isLoading;
    elements.landingShellEl.classList.toggle('heroLoading', isLoading);
}

function syncFirebaseUi() {
    const isSignedIn = firebaseSession.isSignedIn;

    elements.firebaseButtonEl.hidden = isSignedIn;
    elements.firebaseSessionEl.hidden = !isSignedIn;
    elements.firebaseButtonEl.disabled = isFirebaseSigningIn || isSignedIn;
    elements.firebaseButtonEl.textContent = isFirebaseSigningIn
        ? 'Signing into Google Firebase…'
        : 'Sign into Google Firebase';
    elements.firebaseUserEl.textContent = firebaseSession.userName;
    elements.firebaseSignOutButtonEl.disabled = isFirebaseSigningIn;

    ui.setIntegrationState({
        isFirebaseSignedIn: isSignedIn
    });
}

function showAppShell() {
    elements.appShellEl.hidden = false;
    elements.appShellEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getPlaylistName(playlist) {
    return playlist?.attributes?.name ?? 'Untitled playlist';
}

function getPlaylistDescription(playlist) {
    const rawDescription = playlist?.attributes?.description;
    if (typeof rawDescription === 'string' && rawDescription.trim()) {
        return rawDescription.trim();
    }

    const standardDescription = rawDescription?.standard;
    if (typeof standardDescription === 'string' && standardDescription.trim()) {
        return standardDescription.trim();
    }

    return '';
}

function handlePlaylistSelected(playlist) {
    selectedPlaylist = playlist;
    ui.setSelectedPlaylistButton(playlist.id);
    ui.clearSelectedAction();
    ui.showSelectedPlaylist({
        name: getPlaylistName(playlist),
        description: getPlaylistDescription(playlist)
    });
    ui.showPlaylistActions({
        isFirebaseSignedIn: firebaseSession.isSignedIn
    });
    ui.showViewIntro('');
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
    const playlistName = getPlaylistName(playlist);

    ui.setSelectedPlaylistButton(playlistId);
    ui.showTracksLoading(playlistName);

    try {
        let tracks = playlistTracksCache.get(playlistId);
        if (!tracks) {
            tracks = await fetchPlaylistTracks(musicInstance, playlistId);
            playlistTracksCache.set(playlistId, tracks);
        }
        ui.setStatus('');
        ui.renderTracks(tracks, { playlistName });
    } catch (error) {
        console.error('Failed to load tracks', error);
        ui.setStatus('Failed to load tracks for this playlist.');
        ui.showTracksError('Failed to load tracks for this playlist.');
    }
}

async function loadYoutubeTracksForPlaylist(playlist) {
    const playlistName = getPlaylistName(playlist);

    ui.showTracksLoading(playlistName, {
        actionKey: 'youtube-tracks',
        sourceName: 'YouTube Music'
    });

    try {
        let tracklistData;
        if (youtubeTracklistCache.has(playlistName)) {
            tracklistData = youtubeTracklistCache.get(playlistName);
        } else {
            tracklistData = await retrieveTracklistDataFromFirestoreByTitle(playlistName);
            youtubeTracklistCache.set(playlistName, tracklistData);
        }

        if (!tracklistData) {
            ui.setStatus(`No YouTube Music equivalent found for ${playlistName}.`);
            ui.showTracksError(`No YouTube Music equivalent found for ${playlistName}.`);
            return;
        }

        if (!Array.isArray(tracklistData.tracks)) {
            throw new TypeError('The matching Firebase tracklist does not include a tracks array.');
        }

        const tracks = tracklistData.tracks.map(convertStoredYoutubeTrack);
        ui.setStatus('');
        ui.renderTracks(tracks, {
            actionKey: 'youtube-tracks',
            playlistName: `${tracklistData.title ?? playlistName} (YouTube Music)`,
            emptyMessage: 'No YouTube Music tracks found in this playlist.'
        });
    } catch (error) {
        console.error('Failed to load YouTube Music tracks from Firebase', error);
        ui.setStatus('Failed to load the YouTube Music equivalent for this playlist.');
        ui.showTracksError('Failed to load the YouTube Music equivalent for this playlist.');
    }
}

async function startExperience() {
    if (isInitializing) {
        return;
    }

    isInitializing = true;
    elements.connectButtonEl.disabled = true;
    elements.connectButtonEl.textContent = 'Connecting…';
    setLandingLoadingState(true);
    setLandingStatus('Preparing MusicKit…');

    try {
        const music = await ensureMusicKitConfigured();

        ui.setStatus('Authorizing…');
        setLandingStatus('Requesting access to your Apple Music account…');
        if (!music.isAuthorized) {
            await music.authorize();
        }
        ui.setStatus('');
        console.info('MusicKit authorized');

        ui.setStatus('Loading playlists…');
        setLandingStatus('Loading your library playlists…');
        const playlists = await fetchLibraryPlaylists(music);
        ui.setStatus('');
        ui.clearTracks();
        ui.showViewIntro('Select a playlist to reveal the Apple Music, YouTube Music, and comparison options.');
        ui.renderPlaylists(playlists, handlePlaylistSelected);
        ui.setPlaylistCount(playlists.length);
        syncFirebaseUi();

        showAppShell();
        elements.landingShellEl.hidden = true;
        setLandingStatus('');
    } catch (error) {
        console.error('Failed to start MusicKit flow', error);
        const message = error instanceof Error ? error.message : 'Unable to connect to Apple Music. Please try again.';
        ui.setStatus(message);
        setLandingStatus(message);
        setLandingLoadingState(false);
        elements.connectButtonEl.disabled = false;
        elements.connectButtonEl.textContent = 'Show Apple Music playlists';
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
    ui.setStatus('Opening Google sign-in…');

    try {
        const result = await signInToFirebase();
        youtubeTracklistCache.clear();
        firebaseSession.isSignedIn = true;
        firebaseSession.userName = getFirebaseUserName(result.user);
        ui.setStatus('');
    } catch (error) {
        console.error('Failed to sign into Firebase', error);
        const message = error instanceof Error ? error.message : 'Unable to sign into Google Firebase.';
        ui.setStatus(message);
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
        youtubeTracklistCache.clear();
        firebaseSession.isSignedIn = false;
        firebaseSession.userName = '';
        ui.setStatus('');
    } catch (error) {
        console.error('Failed to sign out of Firebase', error);
        const message = error instanceof Error ? error.message : 'Unable to sign out of Google Firebase.';
        ui.setStatus(message);
    } finally {
        isFirebaseSigningIn = false;
        syncFirebaseUi();
    }
}

elements.connectButtonEl.addEventListener('click', startExperience);
elements.firebaseButtonEl.addEventListener('click', handleFirebaseSignIn);
elements.firebaseSignOutButtonEl.addEventListener('click', handleFirebaseSignOut);
elements.showAppleTracksButtonEl.addEventListener('click', async () => {
    if (!selectedPlaylist) {
        console.warn('Apple tracks action invoked without a selected playlist.');
        return;
    }

    await loadTracksForPlaylist(selectedPlaylist);
});
elements.showYoutubeTracksButtonEl.addEventListener('click', async () => {
    if (!selectedPlaylist) {
        console.warn('YouTube tracks action invoked without a selected playlist.');
        return;
    }

    if (!firebaseSession.isSignedIn) {
        ui.setStatus('Sign into Google Firebase to load YouTube Music equivalents.');
        return;
    }

    await loadYoutubeTracksForPlaylist(selectedPlaylist);
});
