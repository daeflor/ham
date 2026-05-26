export function createSelectedPlaylistView(elements) {
    const {
        detailPanelEl,
        selectionTitleEl,
        showAppleTracksButtonEl,
        showYoutubeTracksButtonEl,
        showComparisonButtonEl,
        tracksViewEl,
        trackSummaryEl,
        copyTracksButtonEl,
        copyFeedbackEl,
        tracksTableEl,
        tracksBodyEl,
        paginationEl,
        prevPageBtn,
        nextPageBtn,
        pageInfoEl
    } = elements;

    const TRACKS_PER_PAGE = 50;
    let allTracks = [];
    let currentPage = 0;

    const actionButtons = {
        'apple-tracks': showAppleTracksButtonEl,
        'youtube-tracks': showYoutubeTracksButtonEl,
        comparison: showComparisonButtonEl
    };

    function clearTracks() {
        allTracks = [];
        currentPage = 0;
        tracksBodyEl.replaceChildren();
        tracksTableEl.hidden = true;
        paginationEl.hidden = true;
        copyTracksButtonEl.disabled = true;
        copyFeedbackEl.textContent = '';
        trackSummaryEl.textContent = 'Track data will appear here.';
    }

    function hideTracks() {
        tracksViewEl.hidden = true;
    }

    function showTracksLoading(actionKey) {
        clearTracks();
        setSelectedAction(actionKey);
        tracksViewEl.hidden = false;
        trackSummaryEl.textContent = `Loading tracks...`;
    }

    function showComparisonSelected() {
        hideTracks();
        setSelectedAction('comparison');
    }

    function setSelectedAction(actionKey) {
        for (const [key, button] of Object.entries(actionButtons)) {
            button.classList.toggle('selected', key === actionKey);
        }
    }

    function showTracksError(message) {
        tracksViewEl.hidden = false;
        tracksTableEl.hidden = true;
        paginationEl.hidden = true;
        copyTracksButtonEl.disabled = true;
        copyFeedbackEl.textContent = '';
        trackSummaryEl.textContent = message;
    }

    function renderCurrentPage() {
        tracksBodyEl.replaceChildren();

        const startIdx = currentPage * TRACKS_PER_PAGE;
        const endIdx = Math.min(startIdx + TRACKS_PER_PAGE, allTracks.length);
        const pageTracksToShow = allTracks.slice(startIdx, endIdx);

        for (const [pageIndex, track] of pageTracksToShow.entries()) {
            const rowEl = document.createElement('tr');

            const indexEl = document.createElement('td');
            indexEl.className = 'trackIndex';
            indexEl.textContent = startIdx + pageIndex + 1;

            const nameEl = document.createElement('td');
            nameEl.textContent = track.title ?? '—';

            const artistEl = document.createElement('td');
            artistEl.textContent = track.artist ?? '—';

            const albumEl = document.createElement('td');
            albumEl.textContent = track.album ?? '—';

            const lenEl = document.createElement('td');
            lenEl.className = 'len';
            lenEl.textContent = track.readableDuration ?? '—';

            rowEl.append(indexEl, nameEl, artistEl, albumEl, lenEl);
            tracksBodyEl.append(rowEl);
        }

        updatePaginationControls();
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(allTracks.length / TRACKS_PER_PAGE);
        const startIdx = currentPage * TRACKS_PER_PAGE + 1;
        const endIdx = Math.min((currentPage + 1) * TRACKS_PER_PAGE, allTracks.length);

        prevPageBtn.disabled = currentPage === 0;
        nextPageBtn.disabled = currentPage >= totalPages - 1;
        pageInfoEl.textContent = `${startIdx}-${endIdx} of ${allTracks.length}`;
    }

    function renderTracks(tracks) {
        allTracks = tracks || [];
        currentPage = 0;
        tracksViewEl.hidden = false;
        copyFeedbackEl.textContent = '';

        if (allTracks.length === 0) {
            tracksTableEl.hidden = true;
            paginationEl.hidden = true;
            copyTracksButtonEl.disabled = true;
            trackSummaryEl.textContent = 'No tracks found in this playlist.';
            return;
        }

        tracksTableEl.hidden = false;
        paginationEl.hidden = allTracks.length <= TRACKS_PER_PAGE;
        copyTracksButtonEl.disabled = false;
        trackSummaryEl.textContent = `${allTracks.length} tracks loaded. Showing ${TRACKS_PER_PAGE} at a time.`;

        renderCurrentPage();
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderCurrentPage();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allTracks.length / TRACKS_PER_PAGE);
        if (currentPage < totalPages - 1) {
            currentPage++;
            renderCurrentPage();
        }
    });

    function showSelectedPlaylist({ name }) {
        detailPanelEl.hidden = false;
        selectionTitleEl.textContent = name;
    }

    function setFirebaseConnectionState({ isFirebaseSignedIn }) {
        showYoutubeTracksButtonEl.disabled = !isFirebaseSignedIn;
        showComparisonButtonEl.disabled = !isFirebaseSignedIn;
    }

    function clearSelectedAction() {
        setSelectedAction();
    }

    async function copyTracksToClipboard() {
        if (allTracks.length === 0) {
            return;
        }

        const lines = allTracks.map((track, index) => {
            return [
                `${index + 1}. ${track.title ?? '—'}`,
                track.artist ?? '—',
                track.album ?? '—',
                track.readableDuration ?? '—'
            ].join(' | ');
        });

        const exportText = lines.join('\n');

        try {
            await navigator.clipboard.writeText(exportText);
            copyFeedbackEl.textContent = `Copied ${allTracks.length} tracks.`;
        } catch (error) {
            console.error('Unable to copy track list', error);
            copyFeedbackEl.textContent = 'Clipboard copy failed.';
        }
    }

    function onAppleTracksRequested(handler) {
        showAppleTracksButtonEl.addEventListener('click', handler);
    }

    function onYoutubeTracksRequested(handler) {
        showYoutubeTracksButtonEl.addEventListener('click', handler);
    }

    function onComparisonRequested(handler) {
        showComparisonButtonEl.addEventListener('click', handler);
    }

    copyTracksButtonEl.addEventListener('click', () => {
        void copyTracksToClipboard();
    });

    return {
        clearTracks,
        hideTracks,
        showTracksLoading,
        showTracksError,
        renderTracks,
        showSelectedPlaylist,
        setFirebaseConnectionState,
        showComparisonSelected,
        clearSelectedAction,
        onAppleTracksRequested,
        onYoutubeTracksRequested,
        onComparisonRequested
    };
}
