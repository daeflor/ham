import { waitForAppReady } from './utils.js';
import { fetchLibraryPlaylists, fetchPlaylistTracks } from './musickit-api.js';
import { createUIController } from './ui.js';

await waitForAppReady();

const elements = {
    appShellEl: document.getElementById('appShell'),
    landingShellEl: document.getElementById('landingShell'),
    connectButtonEl: document.getElementById('connectButton'),
    landingStatusEl: document.getElementById('landingStatus'),
    statusEl: document.getElementById('status'),
    playlistListEl: document.getElementById('playlistList'),
    playlistTitleEl: document.getElementById('playlistTitle'),
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
let appConfigPromise;

async function loadAppConfig() {
    if (appConfigPromise) {
        return appConfigPromise;
    }

    appConfigPromise = fetch('./config.local.json', { cache: 'no-store' })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error('Missing config.local.json. Run node generate-token.js to create it.');
            }

            const config = await response.json();
            const developerToken = String(config?.developerToken ?? '').trim();
            if (!developerToken) {
                throw new Error('config.local.json is missing developerToken.');
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

function showAppShell() {
    elements.appShellEl.hidden = false;
    elements.appShellEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const playlistName = playlist?.attributes?.name ?? 'Tracks';

    ui.setSelectedPlaylistButton(playlistId);
    ui.setPlaylistTitle(`Tracks — ${playlistName}`);
    ui.clearTracks();

    try {
        ui.setStatus('Loading tracks…');
        const tracks = await fetchPlaylistTracks(musicInstance, playlistId);
        ui.setStatus('');
        ui.renderTracks(tracks);
    } catch (error) {
        console.error('Failed to load tracks', error);
        ui.setStatus('Failed to load tracks for this playlist.');
        elements.tracksEmptyEl.hidden = false;
        ui.setTracksEmptyText('Failed to load tracks.');
        elements.tracksTableEl.hidden = true;
        elements.paginationEl.hidden = true;
    }
}

async function startExperience() {
    if (isInitializing) {
        return;
    }

    isInitializing = true;
    elements.connectButtonEl.disabled = true;
    elements.connectButtonEl.textContent = 'Connecting…';
    setLandingStatus('Preparing MusicKit…');
    showAppShell();

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
        ui.setTracksEmptyText('Select a playlist to view tracks.');
        ui.renderPlaylists(playlists, loadTracksForPlaylist);

        elements.landingShellEl.hidden = true;
        setLandingStatus('');
    } catch (error) {
        console.error('Failed to start MusicKit flow', error);
        const message = error instanceof Error ? error.message : 'Unable to connect to Apple Music. Please try again.';
        ui.setStatus(message);
        setLandingStatus(message);
        elements.connectButtonEl.disabled = false;
        elements.connectButtonEl.textContent = 'Connect Apple Music';
    } finally {
        isInitializing = false;
    }
}

elements.connectButtonEl.addEventListener('click', startExperience);