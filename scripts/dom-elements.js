export function getAppElements() {
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
        selectionTitleEl: document.getElementById('selectionTitle'),
        showAppleTracksButtonEl: document.getElementById('showAppleTracksButton'),
        showYoutubeTracksButtonEl: document.getElementById('showYoutubeTracksButton'),
        showComparisonButtonEl: document.getElementById('showComparisonButton'),
        tracksViewEl: document.getElementById('tracksView'),
        trackSummaryEl: document.getElementById('trackSummary'),
        copyTracksButtonEl: document.getElementById('copyTracksButton'),
        copyFeedbackEl: document.getElementById('copyFeedback'),
        tracksTableEl: document.getElementById('tracksTable'),
        tracksBodyEl: document.getElementById('tracksBody'),
        paginationEl: document.getElementById('pagination'),
        prevPageBtn: document.getElementById('prevPage'),
        nextPageBtn: document.getElementById('nextPage'),
        pageInfoEl: document.getElementById('pageInfo'),
        comparisonViewEl: document.getElementById('comparisonView'),
        comparisonSummaryEl: document.getElementById('comparisonSummary'),
        copyComparisonButtonEl: document.getElementById('copyComparisonButton'),
        saveComparisonButtonEl: document.getElementById('saveComparisonButton'),
        markTransferredButtonEl: document.getElementById('markTransferredButton'),
        comparisonTransferredBadgeEl: document.getElementById('comparisonTransferredBadge'),
        comparisonStatusEl: document.getElementById('comparisonStatus'),
        removedComparisonCountEl: document.getElementById('removedComparisonCount'),
        removedComparisonListEl: document.getElementById('removedComparisonList'),
        addedComparisonCountEl: document.getElementById('addedComparisonCount'),
        addedComparisonListEl: document.getElementById('addedComparisonList'),
        comparisonTrackTemplateEl: document.getElementById('comparisonTrackTemplate')
    };

    if (Object.values(elements).some(el => !el)) {
        console.error('Missing required DOM elements; check index.html');
        throw new Error('Missing required DOM elements');
    }

    return elements;
}
