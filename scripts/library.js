import {
    retrieveTracklistDataFromFirestore,
    updateTracklistDataInFirestore
} from './firebase-api.js';
import { fetchLibraryPlaylists, fetchPlaylistTracks } from './musickit-api.js';
import { Track } from './track.js';

export function createLibrary(musicKit) {
    const playlistsById = new Map(); // A map of all current playlists by their Apple Music ID
    const liveAppleMusicTracksByPlaylistId = new Map();
    const storedAppleMusicTracksByPlaylistId = new Map();
    const storedYoutubeMusicTracksByPlaylistId = new Map();

    async function initialize() {
        // Fetch the user's Apple Music playlists and store them in the playlistsById map with the
        // playlist name, Apple Music ID, and default transferred status
        const appleMusicPlaylists = await fetchLibraryPlaylists(musicKit);
        for (const appleMusicPlaylist of appleMusicPlaylists) {
            playlistsById.set(appleMusicPlaylist?.id, {
                id: appleMusicPlaylist?.id,
                name: appleMusicPlaylist?.attributes?.name ?? 'Untitled playlist',
                isTransferred: false
            });
        }

        // For each playlist in the Apple Music library, load the corresponding tracklist data in
        // Firestore and cache the Apple Music and YouTube Music tracks in their respective maps
        await Promise.all(getPlaylists().map(loadStoredTracklist));
    }

    function getPlaylists() {
        return [...playlistsById.values()];
    }

    function getPlaylist(playlistId) {
        const playlist = playlistsById.get(playlistId);
        if (!playlist) {
            throw new Error('No playlist found with the provided ID: ' + playlistId);
        }

        return playlist;
    }

    function getPlaylistTransferCounts() {
        const playlists = getPlaylists();
        return {
            transferredCount: playlists.filter(playlist => playlist.isTransferred).length,
            totalCount: playlists.length
        };
    }

    async function getLiveAppleMusicTracks(playlistId) {
        if (liveAppleMusicTracksByPlaylistId.has(playlistId)) {
            return liveAppleMusicTracksByPlaylistId.get(playlistId);
        }

        const appleMusicTracks = await fetchPlaylistTracks(musicKit, playlistId);
        const tracks = appleMusicTracks.map((track, index) => Track.fromAppleMusic(track, index + 1));
        liveAppleMusicTracksByPlaylistId.set(playlistId, tracks);

        return tracks;
    }

    function getStoredAppleMusicTracks(playlistId) {
        return storedAppleMusicTracksByPlaylistId.get(playlistId) ?? null;
    }

    function getStoredYoutubeMusicTracks(playlistId) {
        return storedYoutubeMusicTracksByPlaylistId.get(playlistId) ?? null;
    }

    async function storeAppleMusicTracks(playlistId) {
        const playlist = getPlaylist(playlistId);
        const appleMusicTracks = await getLiveAppleMusicTracks(playlistId);
        const trackDataToStore = appleMusicTracks.map(track => track.toPlainObject());

        await updateTracklistDataInFirestore(playlist.name, {
            'apple-music-tracks': trackDataToStore
        });

        storedAppleMusicTracksByPlaylistId.set(playlistId, appleMusicTracks);
        playlist.isTransferred = true;
    }

    async function loadStoredTracklist(playlist) {
        const tracklistData = await retrieveTracklistDataFromFirestore(playlist.name);
        const appleMusicTracks = createStoredAppleMusicTracks(tracklistData);
        const youtubeMusicTracks = createStoredYoutubeMusicTracks(tracklistData);

        storedAppleMusicTracksByPlaylistId.set(playlist.id, appleMusicTracks);
        storedYoutubeMusicTracksByPlaylistId.set(playlist.id, youtubeMusicTracks);
        playlist.isTransferred = Array.isArray(appleMusicTracks);
    }

    function createStoredAppleMusicTracks(tracklistData) {
        if (!tracklistData || tracklistData['apple-music-tracks'] === undefined) {
            return null;
        }

        if (!Array.isArray(tracklistData['apple-music-tracks'])) {
            throw new TypeError(`The Firestore tracklist has an 'apple-music-tracks' field which is not an array.`);
        }

        return tracklistData['apple-music-tracks'].map((track, index) => {
            return Track.fromStoredAppleMusic(track, index + 1);
        });
    }

    function createStoredYoutubeMusicTracks(tracklistData) {
        if (!tracklistData || tracklistData['tracks'] === undefined) {
            return null;
        }

        if (!Array.isArray(tracklistData.tracks)) {
            throw new TypeError(`The Firestore tracklist has a 'tracks' field which is not an array.`);
        }

        return tracklistData.tracks.map((track, index) => {
            return Track.fromStoredYoutubeMusic(track, index + 1);
        });
    }

    return {
        initialize,
        getPlaylists,
        getPlaylist,
        getPlaylistTransferCounts,
        getLiveAppleMusicTracks,
        getStoredAppleMusicTracks,
        getStoredYoutubeMusicTracks,
        storeAppleMusicTracks
    };
}
