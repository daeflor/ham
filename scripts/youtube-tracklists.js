import { getTracklistData } from './tracklist-documents.js';
import { Track } from './track.js';

export async function getYoutubePlaylistTracks(playlistName) {
    const tracklistData = await getTracklistData(playlistName);

    if (!tracklistData) {
        return null;
    }

    if (!Array.isArray(tracklistData.tracks)) {
        throw new TypeError('The matching Firebase tracklist does not include a tracks array.');
    }

    return tracklistData.tracks.map((track, index) => Track.fromStoredYoutubeMusic(track, index + 1));
}
