import { retrieveTracklistDataFromFirestoreByTitle } from './firebase-api.js';
import { Track } from './track.js';

const youtubeTracklistCache = new Map();

async function getTracklistDataByPlaylistName(playlistName) {
    let tracklistData;
    if (youtubeTracklistCache.has(playlistName)) {
        tracklistData = youtubeTracklistCache.get(playlistName);
    } else {
        tracklistData = await retrieveTracklistDataFromFirestoreByTitle(playlistName);
        youtubeTracklistCache.set(playlistName, tracklistData);
    }

    return tracklistData;
}

export async function getYoutubeTracklistByApplePlaylistName(playlistName) {
    const tracklistData = await getTracklistDataByPlaylistName(playlistName);

    if (!tracklistData) {
        return null;
    }

    if (!Array.isArray(tracklistData.tracks)) {
        throw new TypeError('The matching Firebase tracklist does not include a tracks array.');
    }

    return tracklistData.tracks.map((track, index) => Track.fromStoredYoutubeMusic(track, index + 1));
}

export async function isTransferred(playlistName) {
    const tracklistData = await getTracklistDataByPlaylistName(playlistName);
    return Array.isArray(tracklistData?.['apple-music-tracks']);
}

export function storeAppleMusicTracks(playlistName, appleMusicTracks) {
    const cachedTracklistData = youtubeTracklistCache.get(playlistName);
    if (!cachedTracklistData) {
        return;
    }

    youtubeTracklistCache.set(playlistName, {
        ...cachedTracklistData,
        'apple-music-tracks': appleMusicTracks
    });
}
