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

    await MusicKit.configure({

        app: {
            name: 'HAM',
            build: '0.0.1',
        },
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
        ui.setStatus('Unable to connect to Apple Music. Please try again.');
        setLandingStatus('Unable to connect to Apple Music. Please try again.');
        elements.connectButtonEl.disabled = false;
        elements.connectButtonEl.textContent = 'Connect Apple Music';
    } finally {
        isInitializing = false;
    }
}

elements.connectButtonEl.addEventListener('click', startExperience);