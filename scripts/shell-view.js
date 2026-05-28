export function createShellView(elements) {
    const {
        appShellEl,
        landingShellEl,
        landingActionsEl,
        connectButtonEl,
        landingStatusEl,
        firebaseButtonEl,
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

    function onFirebaseSignIn(handler) {
        firebaseButtonEl.addEventListener('click', handler);
    }

    function onFirebaseSignOut(handler) {
        firebaseSignOutButtonEl.addEventListener('click', handler);
    }

    function renderFirebaseAuthenticating() {
        firebaseButtonEl.textContent = 'Signing into Google Firebase…';
        firebaseButtonEl.disabled = true;
    }

    function renderFirebaseSignedIn(username) {
        firebaseButtonEl.hidden = true;

        firebaseUserEl.textContent = username;
        firebaseSessionEl.hidden = false;
    }

    function renderFirebaseSignedOut() {
        firebaseSessionEl.hidden = true;

        firebaseButtonEl.textContent = 'Sign into Google Firebase';
        firebaseButtonEl.disabled = false;
        firebaseButtonEl.hidden = false;
    }

    return {
        setStatus,
        setLandingStatus,
        setLandingLoadingState,
        showAppShell,
        hideLandingShell,
        onConnect,
        onFirebaseSignIn,
        onFirebaseSignOut,
        renderFirebaseAuthenticating,
        renderFirebaseSignedIn,
        renderFirebaseSignedOut
    };
}
