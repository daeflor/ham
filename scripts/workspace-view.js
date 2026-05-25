import { createPlaylistsView } from './playlists-view.js';
import { createSelectedPlaylistView } from './selected-playlist-view.js';

export function createWorkspaceView(elements) {
    const playlistsView = createPlaylistsView(elements);
    const selectedPlaylistView = createSelectedPlaylistView(elements);

    return {
        ...playlistsView,
        ...selectedPlaylistView
    };
}
