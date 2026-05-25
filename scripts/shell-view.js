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

    function setConnectButtonLoading() {
        connectButtonEl.disabled = true;
        connectButtonEl.textContent = 'Connecting…';
    }

    function getFirebaseButtonText({ isCheckingAuth, isSigningIn }) {
        if (isCheckingAuth) {
            return 'Checking Google Firebase sign-in…';
        }

        if (isSigningIn) {
            return 'Signing into Google Firebase…';
        }

        return 'Sign into Google Firebase';
    }

    function renderFirebaseSession({ isCheckingAuth, isSigningIn, session }) {
        const isSignedIn = session.isSignedIn;

        firebaseButtonEl.hidden = isSignedIn;
        firebaseSessionEl.hidden = !isSignedIn;
        firebaseButtonEl.disabled = isCheckingAuth || isSigningIn || isSignedIn;
        firebaseButtonEl.textContent = getFirebaseButtonText({ isCheckingAuth, isSigningIn });
        firebaseUserEl.textContent = session.userName;
        firebaseSignOutButtonEl.disabled = isCheckingAuth || isSigningIn;
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
        setConnectButtonLoading,
        renderFirebaseSession,
        showAppShell,
        hideLandingShell,
        onConnect,
        onFirebaseSignIn,
        onFirebaseSignOut
    };
}
