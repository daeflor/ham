import { getTracklistDocumentByPlaylistName } from './tracklist-documents.js';
import { Track } from './track.js';

// TODO can omit "byPlaylistName" from this function name because it's implied. The playlist name is the only way to identify a tracklist document in Firestore
// Can rename to getYoutubePlaylistTracks to match the one for Apple Music
export async function getYoutubeTracksByPlaylistName(playlistName) {
    const tracklistData = await getTracklistDocumentByPlaylistName(playlistName);

    if (!tracklistData) {
        return null;
    }

    if (!Array.isArray(tracklistData.tracks)) {
        throw new TypeError('The matching Firebase tracklist does not include a tracks array.');
    }

    return tracklistData.tracks.map((track, index) => Track.fromStoredYoutubeMusic(track, index + 1));
}
