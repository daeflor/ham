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

    function setStatus(message) {
        const text = (message ?? '').trim();
        statusEl.hidden = text.length === 0;
        statusEl.textContent = text;
    }

    function setLandingStatus(message) {
        landingStatusEl.textContent = message;
    }

    function setLandingLoadingState(isLoading) {
        landingActionsEl.hidden = isLoading;
        landingShellEl.classList.toggle('heroLoading', isLoading);
    }

    function getFirebaseButtonText({ isAuthPending }) {
        if (isAuthPending) {
            return 'Signing into Google Firebase…';
        }

        return 'Sign into Google Firebase';
    }

    function renderFirebaseSession({ isAuthPending, session }) {
        const isSignedIn = session.isSignedIn;

        firebaseButtonEl.disabled = isAuthPending || isSignedIn;
        firebaseButtonEl.hidden = isSignedIn;
        firebaseButtonEl.textContent = getFirebaseButtonText({ isAuthPending });

        firebaseSessionEl.hidden = !isSignedIn;
        firebaseUserEl.textContent = session.userName;
    }

    function showAppShell() {
        appShellEl.hidden = false;
        appShellEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function hideLandingShell() {
        landingShellEl.hidden = true;
    }

    function onConnect(handler) {
        connectButtonEl.addEventListener('click', handler);
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
