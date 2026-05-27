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

    function renderFirebaseSession({ isAuthPending, session }) {
        const isSignedIn = session.isSignedIn;

        firebaseButtonEl.disabled = isAuthPending || isSignedIn;
        firebaseButtonEl.hidden = isSignedIn;
        firebaseButtonEl.textContent = getFirebaseButtonText({ isAuthPending });

        firebaseSessionEl.hidden = !isSignedIn;
        firebaseUserEl.textContent = session.userName;
    }

    function getFirebaseButtonText({ isAuthPending }) {
        if (isAuthPending) {
            return 'Signing into Google Firebase…';
        }

        return 'Sign into Google Firebase';
    }

    function onFirebaseSignIn(handler) {
        firebaseButtonEl.addEventListener('click', handler);
    }

    function onFirebaseSignOut(handler) {
        firebaseSignOutButtonEl.addEventListener('click', handler);
    }

    return {
        setStatus,
        setLandingStatus,
        setLandingLoadingState,
        renderFirebaseSession,
        showAppShell,
        hideLandingShell,
        onConnect,
        onFirebaseSignIn,
        onFirebaseSignOut
    };
}
