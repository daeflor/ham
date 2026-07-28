import {
    retrieveTracklistDataFromFirestoreByTitle,
    updateTracklistDataInFirestore
} from './firebase-api.js';

const tracklistDataCache = new Map();

export async function getTracklistData(playlistName) {
    let tracklistData;
    if (tracklistDataCache.has(playlistName)) {
        tracklistData = tracklistDataCache.get(playlistName);
    } else {
        tracklistData = await retrieveTracklistDataFromFirestoreByTitle(playlistName);
        tracklistDataCache.set(playlistName, tracklistData);
    }

    return tracklistData;
}

export async function isTransferred(playlistName) {
    const tracklistData = await getTracklistData(playlistName);
    return Array.isArray(tracklistData?.['apple-music-tracks']);
}

export async function saveAppleMusicTracks(playlistName, appleMusicTracks) {
    if (!Array.isArray(appleMusicTracks)) {
        throw new TypeError('Tried to save Apple Music tracks, but a tracks array was not provided.');
    }

    await updateTracklistDataInFirestore(playlistName, {
        'apple-music-tracks': appleMusicTracks
    });

    updateCachedAppleMusicTracks(playlistName, appleMusicTracks);
}

function updateCachedAppleMusicTracks(playlistName, appleMusicTracks) {
    const cachedTracklistData = tracklistDataCache.get(playlistName);
    if (!cachedTracklistData) {
        return;
    }

    tracklistDataCache.set(playlistName, {
        ...cachedTracklistData,
        'apple-music-tracks': appleMusicTracks
    });
}
