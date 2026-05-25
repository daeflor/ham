import { createAppController } from './app-controller.js';
import { getAppElements } from './dom-elements.js';
import { createPlaylistsView } from './playlists-view.js';
import { createSelectedPlaylistView } from './selected-playlist-view.js';
import { createShellView } from './shell-view.js';
import { waitForAppReady } from './utils.js';

await waitForAppReady();

const elements = getAppElements();
const shellView = createShellView(elements);
const playlistsView = createPlaylistsView(elements);
const selectedPlaylistView = createSelectedPlaylistView(elements);
const appController = createAppController({ shellView, playlistsView, selectedPlaylistView });

appController.start();
