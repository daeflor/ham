import {
    retrieveTracklistDataFromFirestore,
    updateTracklistDataInFirestore
} from './firebase-api.js';
import { fetchLibraryPlaylists, fetchPlaylistTracks } from './musickit-api.js';
import { Track } from './track.js';

export function createLibrary(musicKit) {
    const playlistsById = new Map();
    const liveAppleMusicTracksByPlaylistId = new Map();
    const storedAppleMusicTracksByPlaylistId = new Map();
    const storedYoutubeMusicTracksByPlaylistId = new Map();
    const firestoreTracklistDataByPlaylistName = new Map();

    async function initialize() {
        const appleMusicPlaylists = await fetchLibraryPlaylists(musicKit);
        for (const appleMusicPlaylist of appleMusicPlaylists) {
            const playlistId = appleMusicPlaylist?.id;
            if (!playlistId) {
                continue;
            }

            playlistsById.set(playlistId, {
                id: playlistId,
                name: appleMusicPlaylist?.attributes?.name ?? 'Untitled playlist',
                isTransferred: false
            });
        }
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

    async function preloadTransferStatuses() {
        await Promise.all(getPlaylists().map(playlist => refreshTransferStatus(playlist.id)));
        return getPlaylists();
    }

    async function refreshTransferStatus(playlistId) {
        const playlist = getPlaylist(playlistId);
        const tracklistData = await getFirestoreTracklistData(playlist.name);
        playlist.isTransferred = Array.isArray(tracklistData?.['apple-music-tracks']);

        return playlist.isTransferred;
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

    async function getStoredAppleMusicTracks(playlistId) {
        if (storedAppleMusicTracksByPlaylistId.has(playlistId)) {
            return storedAppleMusicTracksByPlaylistId.get(playlistId);
        }

        const playlist = getPlaylist(playlistId);
        const tracklistData = await getFirestoreTracklistData(playlist.name);
        if (!tracklistData || tracklistData['apple-music-tracks'] === undefined) {
            storedAppleMusicTracksByPlaylistId.set(playlistId, null);
            return null;
        }

        if (!Array.isArray(tracklistData['apple-music-tracks'])) {
            throw new TypeError('The matching Firebase tracklist does not include an Apple Music tracks array.');
        }

        const tracks = tracklistData['apple-music-tracks'].map((track, index) => {
            return Track.fromStoredAppleMusic(track, index + 1);
        });
        storedAppleMusicTracksByPlaylistId.set(playlistId, tracks);

        return tracks;
    }

    async function getStoredYoutubeMusicTracks(playlistId) {
        if (storedYoutubeMusicTracksByPlaylistId.has(playlistId)) {
            return storedYoutubeMusicTracksByPlaylistId.get(playlistId);
        }

        const playlist = getPlaylist(playlistId);
        const tracklistData = await getFirestoreTracklistData(playlist.name);
        if (!tracklistData || tracklistData['tracks'] === undefined) {
            storedYoutubeMusicTracksByPlaylistId.set(playlistId, null);
            return null;
        }

        if (!Array.isArray(tracklistData.tracks)) {
            throw new TypeError('The matching Firebase tracklist does not include a tracks array.');
        }

        const tracks = tracklistData.tracks.map((track, index) => {
            return Track.fromStoredYoutubeMusic(track, index + 1);
        });
        storedYoutubeMusicTracksByPlaylistId.set(playlistId, tracks);

        return tracks;
    }

    async function saveAppleMusicTransfer(playlistId) {
        const playlist = getPlaylist(playlistId);
        const appleMusicTracks = await getLiveAppleMusicTracks(playlistId);
        const storedTrackData = appleMusicTracks.map(track => track.toPlainObject());

        await updateTracklistDataInFirestore(playlist.name, {
            'apple-music-tracks': storedTrackData
        });

        updateCachedAppleMusicTracks(playlist.name, storedTrackData);
        storedAppleMusicTracksByPlaylistId.set(playlistId, appleMusicTracks);
        playlist.isTransferred = true;
    }

    async function getFirestoreTracklistData(playlistName) {
        if (!firestoreTracklistDataByPlaylistName.has(playlistName)) {
            const tracklistData = await retrieveTracklistDataFromFirestore(playlistName);
            firestoreTracklistDataByPlaylistName.set(playlistName, tracklistData);
        }

        return firestoreTracklistDataByPlaylistName.get(playlistName);
    }

    function updateCachedAppleMusicTracks(playlistName, appleMusicTracks) {
        const cachedTracklistData = firestoreTracklistDataByPlaylistName.get(playlistName);
        if (!cachedTracklistData) {
            return;
        }

        firestoreTracklistDataByPlaylistName.set(playlistName, {
            ...cachedTracklistData,
            'apple-music-tracks': appleMusicTracks
        });
    }

    return {
        initialize,
        getPlaylists,
        getPlaylist,
        preloadTransferStatuses,
        refreshTransferStatus,
        getLiveAppleMusicTracks,
        getStoredAppleMusicTracks,
        getStoredYoutubeMusicTracks,
        saveAppleMusicTransfer
    };
}
