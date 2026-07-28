import { fetchLibraryPlaylists, fetchPlaylistTracks } from './musickit-api.js';
import { Track } from './track.js';

const playlistTracksCache = new Map();

export function getApplePlaylistName(playlist) {
    return playlist?.attributes?.name ?? 'Untitled playlist';
}

export async function getAppleLibraryPlaylists(music) {
    return fetchLibraryPlaylists(music);
}

export async function getApplePlaylistTracks(music, playlistId) {
    if (!playlistTracksCache.has(playlistId)) {
        const appleMusicTracks = await fetchPlaylistTracks(music, playlistId);
        playlistTracksCache.set(
            playlistId,
            appleMusicTracks.map((track, index) => Track.fromAppleMusic(track, index + 1))
        );
    }

    return playlistTracksCache.get(playlistId);
}
