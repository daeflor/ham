import { formatDuration } from './utils.js';

export function createUIController(elements) {
    const {
        statusEl,
        playlistListEl,
        playlistCountEl,
        detailPanelEl,
        selectionCardEl,
        selectionTitleEl,
        selectionDescriptionEl,
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

    function showTracksLoading(playlistName) {
        clearTracks();
        currentPlaylistTitle = playlistName;
        setSelectedAction('apple-tracks');
        viewIntroEl.hidden = true;
        tracksViewEl.hidden = false;
        trackSummaryEl.textContent = 'Loading track list…';
        tracksEmptyEl.textContent = `Loading Apple Music tracks for ${playlistName}…`;
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

        for (const track of pageTracksToShow) {
            const attributes = track?.attributes ?? {};
            const rowEl = document.createElement('tr');

            const nameEl = document.createElement('td');
            nameEl.textContent = attributes.name ?? '—';

            const artistEl = document.createElement('td');
            artistEl.textContent = attributes.artistName ?? '—';

            const albumEl = document.createElement('td');
            albumEl.textContent = attributes.albumName ?? '—';

            const lenEl = document.createElement('td');
            lenEl.className = 'len';
            lenEl.textContent = formatDuration(attributes.durationInMillis);

            rowEl.append(nameEl, artistEl, albumEl, lenEl);
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
        setSelectedAction('apple-tracks');
        viewIntroEl.hidden = true;
        tracksViewEl.hidden = false;
        copyFeedbackEl.textContent = '';

        if (allTracks.length === 0) {
            tracksTableEl.hidden = true;
            tracksEmptyEl.hidden = false;
            tracksEmptyEl.textContent = 'No tracks found in this playlist.';
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

    function showSelectedPlaylist({ name, description }) {
        detailPanelEl.hidden = false;
        selectionCardEl.hidden = false;
        selectionTitleEl.textContent = name;
        selectionDescriptionEl.textContent = description;
        selectionDescriptionEl.hidden = !description;
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
            const attributes = track?.attributes ?? {};
            return [
                `${index + 1}. ${attributes.name ?? '—'}`,
                attributes.artistName ?? '—',
                attributes.albumName ?? '—',
                formatDuration(attributes.durationInMillis)
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
        setSelectedPlaylistButton
    };
}
