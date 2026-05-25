import { createAppController } from './app-controller.js';
import { getAppElements } from './dom-elements.js';
import { createShellView } from './shell-view.js';
import { waitForAppReady } from './utils.js';
import { createWorkspaceView } from './workspace-view.js';

await waitForAppReady();

const elements = getAppElements();
const shellView = createShellView(elements);
const workspaceView = createWorkspaceView(elements);
const appController = createAppController({ shellView, workspaceView });

appController.start();
