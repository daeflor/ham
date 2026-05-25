export function createWorkspaceView(elements) {
    const {
        statusEl,
        playlistListEl,
        playlistCountEl,
        detailPanelEl,
        selectionCardEl,
        selectionTitleEl,
        playlistActionsEl,
        showAppleTracksButtonEl,
        showYoutubeTracksButtonEl,
        showComparisonButtonEl,
        viewIntroEl,
        tracksViewEl,
        trackSummaryEl,
        copyTracksButtonEl,
        copyFeedbackEl,
        tracksEmptyEl,
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
    let currentPlaylistTitle = 'Apple Music tracks';

    const actionButtons = {
        'apple-tracks': showAppleTracksButtonEl,
        'youtube-tracks': showYoutubeTracksButtonEl,
        comparison: showComparisonButtonEl
    };

    function setStatus(message) {
        const text = (message ?? '').trim();
        statusEl.hidden = text.length === 0;
        statusEl.textContent = text;
    }

    function clearTracks() {
        allTracks = [];
        currentPage = 0;
        currentPlaylistTitle = 'Apple Music tracks';
        tracksBodyEl.replaceChildren();
        tracksTableEl.hidden = true;
        tracksEmptyEl.hidden = false;
        paginationEl.hidden = true;
        copyTracksButtonEl.disabled = true;
        copyFeedbackEl.textContent = '';
        trackSummaryEl.textContent = 'Track data will appear here.';
    }

    function setSelectedAction(actionKey) {
        for (const [key, button] of Object.entries(actionButtons)) {
            button.classList.toggle('selected', key === actionKey);
        }
    }

    function showViewIntro(message) {
        clearTracks();
        const text = (message ?? '').trim();
        viewIntroEl.hidden = text.length === 0;
        viewIntroEl.textContent = text;
        tracksViewEl.hidden = true;
    }

    function showTracksLoading(playlistName, options = {}) {
        clearTracks();
        const sourceName = options.sourceName ?? 'Apple Music';
        currentPlaylistTitle = playlistName;
        setSelectedAction(options.actionKey ?? 'apple-tracks');
        viewIntroEl.hidden = true;
        tracksViewEl.hidden = false;
        trackSummaryEl.textContent = 'Loading track list…';
        tracksEmptyEl.textContent = `Loading ${sourceName} tracks for ${playlistName}…`;
    }

    function showTracksError(message) {
        viewIntroEl.hidden = true;
        tracksViewEl.hidden = false;
        tracksTableEl.hidden = true;
        tracksEmptyEl.hidden = false;
        tracksEmptyEl.textContent = message;
        paginationEl.hidden = true;
        copyTracksButtonEl.disabled = true;
        copyFeedbackEl.textContent = '';
        trackSummaryEl.textContent = 'Unable to load track data.';
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

    function renderTracks(tracks, options = {}) {
        allTracks = tracks || [];
        currentPage = 0;
        currentPlaylistTitle = options.playlistName ?? currentPlaylistTitle;
        setSelectedAction(options.actionKey ?? 'apple-tracks');
        viewIntroEl.hidden = true;
        tracksViewEl.hidden = false;
        copyFeedbackEl.textContent = '';

        if (allTracks.length === 0) {
            tracksTableEl.hidden = true;
            tracksEmptyEl.hidden = false;
            tracksEmptyEl.textContent = options.emptyMessage ?? 'No tracks found in this playlist.';
            paginationEl.hidden = true;
            copyTracksButtonEl.disabled = true;
            trackSummaryEl.textContent = '0 tracks loaded.';
            return;
        }

        tracksEmptyEl.hidden = true;
        tracksTableEl.hidden = false;
        paginationEl.hidden = allTracks.length <= TRACKS_PER_PAGE;
        copyTracksButtonEl.disabled = false;
        trackSummaryEl.textContent = `${allTracks.length} tracks loaded. Showing 50 at a time.`;

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

    function setSelectedPlaylistButton(selectedPlaylistId) {
        const buttons = playlistListEl.querySelectorAll('button[data-playlist-id]');
        for (const button of buttons) {
            const isSelected = button.getAttribute('data-playlist-id') === selectedPlaylistId;
            button.classList.toggle('selected', isSelected);
        }
    }

    function renderPlaylists(playlists, onSelect) {
        playlistListEl.replaceChildren();

        if (!playlists || playlists.length === 0) {
            const item = document.createElement('li');
            item.textContent = 'No playlists found.';
            playlistListEl.append(item);
            return;
        }

        for (const playlist of playlists) {
            const attributes = playlist?.attributes ?? {};
            const name = attributes.name ?? '(Untitled playlist)';
            const playlistId = playlist?.id;
            if (!playlistId) {
                continue;
            }

            const li = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'playlistButton';
            button.setAttribute('data-playlist-id', playlistId);

            const title = document.createElement('span');
            title.className = 'playlistButtonTitle';
            title.textContent = name;

            button.append(title);
            button.addEventListener('click', () => onSelect(playlist));
            li.append(button);
            playlistListEl.append(li);
        }
    }

    function setPlaylistCount(count) {
        if (count === 1) {
            playlistCountEl.textContent = '1 playlist loaded';
            return;
        }

        playlistCountEl.textContent = `${count} playlists loaded`;
    }

    function showSelectedPlaylist({ name }) {
        detailPanelEl.hidden = false;
        selectionCardEl.hidden = false;
        selectionTitleEl.textContent = name;
    }

    function setIntegrationState({ isFirebaseSignedIn }) {
        showYoutubeTracksButtonEl.disabled = !isFirebaseSignedIn;
        showComparisonButtonEl.disabled = !isFirebaseSignedIn;
    }

    function showPlaylistActions({ isFirebaseSignedIn }) {
        playlistActionsEl.hidden = false;
        setIntegrationState({ isFirebaseSignedIn });
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

        const exportText = [`${currentPlaylistTitle}`, '', ...lines].join('\n');

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

    copyTracksButtonEl.addEventListener('click', () => {
        void copyTracksToClipboard();
    });

    return {
        setStatus,
        clearTracks,
        showViewIntro,
        showTracksLoading,
        showTracksError,
        renderTracks,
        renderPlaylists,
        setPlaylistCount,
        showSelectedPlaylist,
        setIntegrationState,
        showPlaylistActions,
        clearSelectedAction,
        setSelectedPlaylistButton,
        onAppleTracksRequested,
        onYoutubeTracksRequested
    };
}
