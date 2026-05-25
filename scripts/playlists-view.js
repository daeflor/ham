export function createPlaylistsView(elements) {
    const {
        playlistListEl,
        playlistCountEl
    } = elements;

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

    return {
        renderPlaylists,
        setPlaylistCount,
        setSelectedPlaylistButton
    };
}
