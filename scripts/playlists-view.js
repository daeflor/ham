export function createPlaylistsView(elements) {
    const {
        playlistListEl,
        playlistCountEl
    } = elements;

    function setSelectedPlaylist(playlistId) {
        const buttons = playlistListEl.querySelectorAll('button[data-playlist-id]');
        for (const button of buttons) {
            const isSelected = button.getAttribute('data-playlist-id') === playlistId;
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

            const transferredBadge = document.createElement('span');
            transferredBadge.className = 'playlistTransferredBadge';
            transferredBadge.textContent = 'Transferred';
            transferredBadge.hidden = true;

            button.append(title, transferredBadge);
            button.addEventListener('click', () => {
                setSelectedPlaylist(playlistId);
                onSelect(playlist);
            });
            li.append(button);
            playlistListEl.append(li);
        }
    }

    function setPlaylistTransferred(playlistId, isTransferred) {
        const button = playlistListEl.querySelector(`button[data-playlist-id="${CSS.escape(playlistId)}"]`);
        const badge = button?.querySelector('.playlistTransferredBadge');
        if (badge) {
            badge.hidden = !isTransferred;
        }
    }

    function setPlaylistCount({ transferredCount, totalCount }) {
        playlistCountEl.textContent = `${transferredCount} of ${totalCount} playlists transferred`;
    }

    return {
        renderPlaylists,
        setPlaylistCount,
        setPlaylistTransferred
    };
}
