export function getAppElements() {
    const elements = {
        appShellEl: document.getElementById('appShell'),
        landingShellEl: document.getElementById('landingShell'),
        landingActionsEl: document.getElementById('landingActions'),
        connectButtonEl: document.getElementById('connectButton'),
        landingStatusEl: document.getElementById('landingStatus'),
        layoutEl: document.getElementById('layout'),
        firebaseSessionEl: document.getElementById('firebaseSession'),
        firebaseUserEl: document.getElementById('firebaseUser'),
        firebaseSignOutButtonEl: document.getElementById('firebaseSignOutButton'),
        togglePlaylistsButtonEl: document.getElementById('togglePlaylistsButton'),
        statusEl: document.getElementById('status'),
        playlistPanelEl: document.getElementById('playlistPanel'),
        playlistListEl: document.getElementById('playlistList'),
        playlistCountEl: document.getElementById('playlistCount'),
        detailPanelEl: document.getElementById('detailPanel'),
        selectionTitleEl: document.getElementById('selectionTitle'),
        selectedTransferButtonEl: document.getElementById('selectedTransferButton'),
        selectedTransferredBadgeEl: document.getElementById('selectedTransferredBadge'),
        showAppleTracksButtonEl: document.getElementById('showAppleTracksButton'),
        showYoutubeTracksButtonEl: document.getElementById('showYoutubeTracksButton'),
        showYoutubeComparisonButtonEl: document.getElementById('showYoutubeComparisonButton'),
        showAppleTrackComparisonButtonEl: document.getElementById('showAppleTrackComparisonButton'),
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
        ignoreCapitalizationCheckboxEl: document.getElementById('ignoreCapitalizationCheckbox'),
        ignoreAlbumMatchingCheckboxEl: document.getElementById('ignoreAlbumMatchingCheckbox'),
        ignoreParentheticalsCheckboxEl: document.getElementById('ignoreParentheticalsCheckbox'),
        ignoreSpecialCharactersCheckboxEl: document.getElementById('ignoreSpecialCharactersCheckbox'),
        copyComparisonButtonEl: document.getElementById('copyComparisonButton'),
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
