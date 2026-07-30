export function createShellView(elements) {
    const {
        appShellEl,
        landingShellEl,
        landingActionsEl,
        connectButtonEl,
        landingStatusEl,
        layoutEl,
        firebaseSessionEl,
        firebaseUserEl,
        firebaseSignOutButtonEl,
        togglePlaylistsButtonEl,
        playlistPanelEl,
        statusEl
    } = elements;
    let arePlaylistsCollapsed = false;

    function onConnect(handler) {
        connectButtonEl.addEventListener('click', handler);
    }

    function setLandingLoadingState(isLoading) {
        landingActionsEl.hidden = isLoading;
    }

    function setLandingStatus(message) {
        landingStatusEl.textContent = message;
    }

    function hideLandingShell() {
        landingShellEl.hidden = true;
    }

    function showAppShell() {
        appShellEl.hidden = false;
        appShellEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function setStatus(message) {
        const text = (message ?? '').trim();
        statusEl.hidden = text.length === 0;
        statusEl.textContent = text;
    }

    function togglePlaylistsCollapsed() {
        arePlaylistsCollapsed = !arePlaylistsCollapsed;
        layoutEl.classList.toggle('playlistsCollapsed', arePlaylistsCollapsed);
        const label = arePlaylistsCollapsed ? 'Expand playlists' : 'Collapse playlists';
        togglePlaylistsButtonEl.title = label;
    }

    function onFirebaseSignOut(handler) {
        firebaseSignOutButtonEl.addEventListener('click', handler);
    }

    function renderFirebaseSignedIn(username) {
        firebaseUserEl.textContent = username;
        firebaseSessionEl.hidden = false;
    }

    function bindLayoutEvents() {
        togglePlaylistsButtonEl.addEventListener('click', () => {
            togglePlaylistsCollapsed();
        });
    }

    bindLayoutEvents();

    return {
        setStatus,
        setLandingStatus,
        setLandingLoadingState,
        showAppShell,
        hideLandingShell,
        onConnect,
        onFirebaseSignOut,
        renderFirebaseSignedIn
    };
}
