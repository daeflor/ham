import { copyTextToClipboard, formatTracklistExport } from './clipboard-export.js';

export function createSelectedPlaylistView(elements) {
    const {
        detailPanelEl,
        selectionTitleEl,
        selectedTransferButtonEl,
        selectedTransferredBadgeEl,
        showAppleTracksButtonEl,
        showYoutubeTracksButtonEl,
        showYoutubeComparisonButtonEl,
        showAppleTrackComparisonButtonEl,
        tracksViewEl,
        trackSummaryEl,
        copyTracksButtonEl,
        copyFeedbackEl,
        tracksTableEl,
        tracksBodyEl
    } = elements;

    let allTracks = [];

    const actionButtons = {
        'apple-tracks': showAppleTracksButtonEl,
        'youtube-tracks': showYoutubeTracksButtonEl,
        'youtube-comparison': showYoutubeComparisonButtonEl,
        'apple-track-comparison': showAppleTrackComparisonButtonEl
    };

    function clearTracks() {
        allTracks = [];
        tracksBodyEl.replaceChildren();
        tracksTableEl.hidden = true;
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

    function showYoutubeComparisonSelected() {
        hideTracks();
        setSelectedAction('youtube-comparison');
    }

    function setSelectedAction(actionKey) {
        for (const [key, button] of Object.entries(actionButtons)) {
            const isSelected = key === actionKey;
            button.classList.toggle('selected', isSelected);
        }
    }

    function showTracksError(message) {
        tracksViewEl.hidden = false;
        tracksTableEl.hidden = true;
        copyTracksButtonEl.disabled = true;
        copyFeedbackEl.textContent = '';
        trackSummaryEl.textContent = message;
    }

    function setMetadataCellText(cellEl, value) {
        const text = value ?? '—';
        cellEl.textContent = text;
        cellEl.title = text;
    }

    function renderTrackRows() {
        tracksBodyEl.replaceChildren();

        for (const track of allTracks) {
            const rowEl = document.createElement('tr');

            const indexEl = document.createElement('td');
            indexEl.className = 'trackIndex';
            indexEl.textContent = track.playlistIndex;

            const nameEl = document.createElement('td');
            setMetadataCellText(nameEl, track.title);

            const artistEl = document.createElement('td');
            setMetadataCellText(artistEl, track.artist);

            const albumEl = document.createElement('td');
            setMetadataCellText(albumEl, track.album);

            const lenEl = document.createElement('td');
            lenEl.className = 'len';
            lenEl.textContent = track.readableDuration ?? '—';

            rowEl.append(indexEl, nameEl, artistEl, albumEl, lenEl);
            tracksBodyEl.append(rowEl);
        }
    }

    function renderTracks(tracks) {
        allTracks = tracks || [];
        tracksViewEl.hidden = false;
        copyFeedbackEl.textContent = '';

        if (allTracks.length === 0) {
            tracksTableEl.hidden = true;
            copyTracksButtonEl.disabled = true;
            trackSummaryEl.textContent = 'No tracks found in this playlist.';
            return;
        }

        tracksTableEl.hidden = false;
        copyTracksButtonEl.disabled = false;
        trackSummaryEl.textContent = `${allTracks.length} tracks loaded.`;

        renderTrackRows();
    }

    function showSelectedPlaylist({ name, isTransferred }) {
        detailPanelEl.hidden = false;
        selectionTitleEl.textContent = name;
        setTransferredState(isTransferred);
    }

    function setTransferredState(isTransferred) {
        selectedTransferButtonEl.hidden = isTransferred;
        selectedTransferredBadgeEl.hidden = !isTransferred;
    }

    function setTransferInProgress(isTransferring) {
        selectedTransferButtonEl.disabled = isTransferring;
        selectedTransferButtonEl.textContent = isTransferring ? 'Transferring...' : 'Transfer';
    }

    function clearSelectedAction() {
        setSelectedAction();
    }

    async function copyTracksToClipboard() {
        if (allTracks.length === 0) {
            return;
        }

        const exportText = formatTracklistExport(allTracks);

        try {
            await copyTextToClipboard(exportText);
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

    function onYoutubeComparisonRequested(handler) {
        showYoutubeComparisonButtonEl.addEventListener('click', handler);
    }

    function onTransferRequested(handler) {
        selectedTransferButtonEl.addEventListener('click', handler);
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
        setTransferredState,
        setTransferInProgress,
        showYoutubeComparisonSelected,
        clearSelectedAction,
        onAppleTracksRequested,
        onYoutubeTracksRequested,
        onYoutubeComparisonRequested,
        onTransferRequested
    };
}
