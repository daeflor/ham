import { retrieveTracklistDataFromFirestoreByTitle } from './firebase.js';
import { Track } from './track.js';

const youtubeTracklistCache = new Map();

export function clearYoutubeTracklistCache() {
    youtubeTracklistCache.clear();
}

export async function getYoutubeTracklistByApplePlaylistName(playlistName) {
    let tracklistData;
    if (youtubeTracklistCache.has(playlistName)) {
        tracklistData = youtubeTracklistCache.get(playlistName);
    } else {
        tracklistData = await retrieveTracklistDataFromFirestoreByTitle(playlistName);
        youtubeTracklistCache.set(playlistName, tracklistData);
    }

    if (!tracklistData) {
        return null;
    }

    if (!Array.isArray(tracklistData.tracks)) {
        throw new TypeError('The matching Firebase tracklist does not include a tracks array.');
    }

    return {
        title: tracklistData.title ?? playlistName,
        type: tracklistData.type,
        tracks: tracklistData.tracks.map(track => Track.fromStoredYoutubeMusic(track))
    };
}
