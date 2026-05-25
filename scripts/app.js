import { createAppController } from './app-controller.js';
import { createShellView } from './shell-view.js';
import { waitForAppReady } from './utils.js';
import { createWorkspaceView } from './workspace-view.js';

await waitForAppReady();

const elements = {
    appShellEl: document.getElementById('appShell'),
    landingShellEl: document.getElementById('landingShell'),
    landingActionsEl: document.getElementById('landingActions'),
    connectButtonEl: document.getElementById('connectButton'),
    landingStatusEl: document.getElementById('landingStatus'),
    firebaseButtonEl: document.getElementById('firebaseButton'),
    firebaseSessionEl: document.getElementById('firebaseSession'),
    firebaseUserEl: document.getElementById('firebaseUser'),
    firebaseSignOutButtonEl: document.getElementById('firebaseSignOutButton'),
    statusEl: document.getElementById('status'),
    playlistListEl: document.getElementById('playlistList'),
    playlistCountEl: document.getElementById('playlistCount'),
    detailPanelEl: document.getElementById('detailPanel'),
    selectionCardEl: document.getElementById('selectionCard'),
    selectionTitleEl: document.getElementById('selectionTitle'),
    selectionDescriptionEl: document.getElementById('selectionDescription'),
    playlistActionsEl: document.getElementById('playlistActions'),
    showAppleTracksButtonEl: document.getElementById('showAppleTracksButton'),
    showYoutubeTracksButtonEl: document.getElementById('showYoutubeTracksButton'),
    showComparisonButtonEl: document.getElementById('showComparisonButton'),
    viewIntroEl: document.getElementById('viewIntro'),
    tracksViewEl: document.getElementById('tracksView'),
    trackSummaryEl: document.getElementById('trackSummary'),
    copyTracksButtonEl: document.getElementById('copyTracksButton'),
    copyFeedbackEl: document.getElementById('copyFeedback'),
    tracksEmptyEl: document.getElementById('tracksEmpty'),
    tracksTableEl: document.getElementById('tracksTable'),
    tracksBodyEl: document.getElementById('tracksBody'),
    paginationEl: document.getElementById('pagination'),
    prevPageBtn: document.getElementById('prevPage'),
    nextPageBtn: document.getElementById('nextPage'),
    pageInfoEl: document.getElementById('pageInfo')
};

if (Object.values(elements).some(el => !el)) {
    console.error('Missing required DOM elements; check index.html');
    throw new Error('Missing required DOM elements');
}

const shellView = createShellView(elements);
const workspaceView = createWorkspaceView(elements);
const appController = createAppController({ shellView, workspaceView });

appController.start();
