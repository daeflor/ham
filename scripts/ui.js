import { formatDuration } from './utils.js';

export function createUIController(elements) {
    const { statusEl, playlistListEl, playlistTitleEl, tracksEmptyEl, tracksTableEl, tracksBodyEl, paginationEl, prevPageBtn, nextPageBtn, pageInfoEl } = elements;

    const TRACKS_PER_PAGE = 50;
    let allTracks = [];
    let currentPage = 0;

    function setStatus(message) {
        const text = (message ?? '').trim();
        statusEl.hidden = text.length === 0;
        statusEl.textContent = text;
    }

    function clearTracks() {
        allTracks = [];
        currentPage = 0;
        tracksBodyEl.replaceChildren();
        tracksTableEl.hidden = true;
        tracksEmptyEl.hidden = false;
        paginationEl.hidden = true;
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

    function renderTracks(tracks) {
        allTracks = tracks || [];
        currentPage = 0;

        if (allTracks.length === 0) {
            tracksTableEl.hidden = true;
            tracksEmptyEl.hidden = false;
            tracksEmptyEl.textContent = 'No tracks found in this playlist.';
            paginationEl.hidden = true;
            return;
        }

        tracksEmptyEl.hidden = true;
        tracksTableEl.hidden = false;
        paginationEl.hidden = allTracks.length <= TRACKS_PER_PAGE;

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
            button.textContent = name;
            button.setAttribute('data-playlist-id', playlistId);
            button.addEventListener('click', () => onSelect(playlist));
            li.append(button);
            playlistListEl.append(li);
        }
    }

    return {
        setStatus,
        clearTracks,
        renderTracks,
        renderPlaylists,
        setSelectedPlaylistButton,
        setPlaylistTitle: (title) => { playlistTitleEl.textContent = title; },
        setTracksEmptyText: (text) => { tracksEmptyEl.textContent = text; }
    };
}
