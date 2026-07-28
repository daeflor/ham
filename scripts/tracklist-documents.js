import {
    retrieveTracklistDataFromFirestore,
    updateTracklistDataInFirestore
} from './firebase-api.js';

const tracklistDataCache = new Map();

export async function getTracklistData(playlistName) {
    let tracklistData;
    if (tracklistDataCache.has(playlistName)) {
        tracklistData = tracklistDataCache.get(playlistName);
    } else {
        tracklistData = await retrieveTracklistDataFromFirestore(playlistName);
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

// TODO could rename this to cacheAppleMusicTracks
// But could also consider not doing this at all, since right now the Firestore Apple tracks array is only queried on initialization, at which point:
// - If the Apple tracks array is already present in Firestore, then it will get cached as part of the getTracklistData() call
// - If the Apple tracks array is not present in Firestore, then it will not be in the cache. But adding it to the cache later here (via updateCachedAppleMusicTracks), serves no actual purpose at this time.
// But in the future, we we support comparing live Apple Music playlist to stored Apple Music playlist, then we'll want this cache, so better leave it as-is for now.
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
