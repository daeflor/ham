import { waitForAppReady } from './utils.js';
import { fetchLibraryPlaylists, fetchPlaylistTracks } from './musickit-api.js';
import { createUIController } from './ui.js';

await waitForAppReady();

const elements = {
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
const music = MusicKit.getInstance();

try {
    ui.setStatus('Authorizing…');
    if (!music.isAuthorized) {
        await music.authorize();
    }
    ui.setStatus('');
    console.info('MusicKit authorized');
} catch (error) {
    console.error('MusicKit authorization failed', error);
    ui.setStatus('Authorization failed. Please refresh and try again.');
    throw error;
}

let playlists = [];
try {
    ui.setStatus('Loading playlists…');
    playlists = await fetchLibraryPlaylists(music);
    ui.setStatus('');
} catch (error) {
    console.error('Failed to load playlists', error);
    ui.setStatus('Failed to load playlists.');
    ui.renderPlaylists([], () => { });
    throw error;
}

ui.clearTracks();
ui.setTracksEmptyText('Select a playlist to view tracks.');

ui.renderPlaylists(playlists, async (playlist) => {
    const playlistId = playlist.id;
    const playlistName = playlist?.attributes?.name ?? 'Tracks';

    ui.setSelectedPlaylistButton(playlistId);
    ui.setPlaylistTitle(`Tracks — ${playlistName}`);
    ui.clearTracks();

    try {
        ui.setStatus('Loading tracks…');
        const tracks = await fetchPlaylistTracks(music, playlistId);
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
});