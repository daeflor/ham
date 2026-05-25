import { fetchLibraryPlaylists, fetchPlaylistTracks } from './musickit-api.js';
import { Track } from './track.js';

let libraryPlaylistsCache;
const playlistTracksCache = new Map();

export function clearApplePlaylistCache() {
    libraryPlaylistsCache = undefined;
    playlistTracksCache.clear();
}

export function getApplePlaylistName(playlist) {
    return playlist?.attributes?.name ?? 'Untitled playlist';
}

export async function getAppleLibraryPlaylists(music) {
    if (!libraryPlaylistsCache) {
        libraryPlaylistsCache = await fetchLibraryPlaylists(music);
    }

    return libraryPlaylistsCache;
}

export async function getApplePlaylistTracks(music, playlistId) {
    if (!playlistTracksCache.has(playlistId)) {
        const appleMusicTracks = await fetchPlaylistTracks(music, playlistId);
        playlistTracksCache.set(
            playlistId,
            appleMusicTracks.map(track => Track.fromAppleMusic(track))
        );
    }

    return playlistTracksCache.get(playlistId);
}
