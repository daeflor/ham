import { retrieveTracklistDataFromFirestoreByTitle } from './firebase-api.js';

const tracklistDocumentCache = new Map();

// TODO The function is called getTracklistDocumentByPlaylistName() but it actually returns the tracklist data, not the actual document reference, right?
export async function getTracklistDocumentByPlaylistName(playlistName) {
    let tracklistData;
    if (tracklistDocumentCache.has(playlistName)) {
        tracklistData = tracklistDocumentCache.get(playlistName);
    } else {
        tracklistData = await retrieveTracklistDataFromFirestoreByTitle(playlistName);
        tracklistDocumentCache.set(playlistName, tracklistData);
    }

    return tracklistData;
}

export async function isTransferred(playlistName) {
    const tracklistData = await getTracklistDocumentByPlaylistName(playlistName);
    return Array.isArray(tracklistData?.['apple-music-tracks']);
}

export function updateCachedAppleMusicTracks(playlistName, appleMusicTracks) {
    const cachedTracklistData = tracklistDocumentCache.get(playlistName);
    if (!cachedTracklistData) {
        return;
    }

    tracklistDocumentCache.set(playlistName, {
        ...cachedTracklistData,
        'apple-music-tracks': appleMusicTracks
    });
}
