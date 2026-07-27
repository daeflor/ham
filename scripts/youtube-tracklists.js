import { retrieveTracklistDataFromFirestoreByTitle } from './firebase-api.js';
import { Track } from './track.js';

const youtubeTracklistCache = new Map();

async function getStoredTracklistByApplePlaylistName(playlistName) {
    let tracklistData;
    if (youtubeTracklistCache.has(playlistName)) {
        tracklistData = youtubeTracklistCache.get(playlistName);
    } else {
        tracklistData = await retrieveTracklistDataFromFirestoreByTitle(playlistName);
        youtubeTracklistCache.set(playlistName, tracklistData);
    }

    return tracklistData;
}

export function setStoredTracklistTransferred(playlistName, appleMusicTracks) {
    const cachedTracklistData = youtubeTracklistCache.get(playlistName);
    if (!cachedTracklistData) {
        return;
    }

    youtubeTracklistCache.set(playlistName, {
        ...cachedTracklistData,
        'apple-music-tracks': appleMusicTracks
    });
}

export async function isApplePlaylistTransferred(playlistName) {
    const tracklistData = await getStoredTracklistByApplePlaylistName(playlistName);
    return Array.isArray(tracklistData?.['apple-music-tracks']);
}

export async function getYoutubeTracklistByApplePlaylistName(playlistName) {
    const tracklistData = await getStoredTracklistByApplePlaylistName(playlistName);

    if (!tracklistData) {
        return null;
    }

    if (!Array.isArray(tracklistData.tracks)) {
        throw new TypeError('The matching Firebase tracklist does not include a tracks array.');
    }

    return tracklistData.tracks.map((track, index) => Track.fromStoredYoutubeMusic(track, index + 1));
}
