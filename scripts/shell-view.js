export function createShellView(elements) {
    const {
        appShellEl,
        landingShellEl,
        landingActionsEl,
        connectButtonEl,
        landingStatusEl,
        firebaseSessionEl,
        firebaseUserEl,
        firebaseSignOutButtonEl,
        statusEl
    } = elements;

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

    function onFirebaseSignOut(handler) {
        firebaseSignOutButtonEl.addEventListener('click', handler);
    }

    function renderFirebaseSignedIn(username) {
        firebaseUserEl.textContent = username;
        firebaseSessionEl.hidden = false;
    }

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
