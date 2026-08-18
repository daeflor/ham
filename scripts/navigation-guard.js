const GUARD_STATE_KEY = '__musicKitAppNavigationGuard';

export function initializeNavigationGuard({ shouldBlockNavigation, getMessage, onNavigationBlocked }) {
    let isHistoryGuardInstalled = false;
    let isSkippingNextPopState = false;

    function getStateWithGuard() {
        const currentState = history.state && typeof history.state === 'object' ? history.state : {};
        return {
            ...currentState,
            [GUARD_STATE_KEY]: true
        };
    }

    function installHistoryGuard() {
        if (isHistoryGuardInstalled || !shouldBlockNavigation()) {
            return;
        }

        history.replaceState(history.state ?? {}, '', location.href);
        history.pushState(getStateWithGuard(), '', location.href);
        isHistoryGuardInstalled = true;
    }

    function uninstallHistoryGuard() {
        if (!isHistoryGuardInstalled) {
            return;
        }

        isHistoryGuardInstalled = false;

        if (history.state?.[GUARD_STATE_KEY]) {
            isSkippingNextPopState = true;
            history.back();
        }
    }

    function handleBeforeUnload(event) {
        if (!shouldBlockNavigation()) {
            return;
        }

        event.preventDefault();
        event.returnValue = '';
    }

    function handlePopState() {
        if (isSkippingNextPopState) {
            isSkippingNextPopState = false;
            return;
        }

        if (!isHistoryGuardInstalled) {
            return;
        }

        if (!shouldBlockNavigation()) {
            uninstallHistoryGuard();
            return;
        }

        if (window.confirm(getMessage())) {
            destroy();
            history.back();
            return;
        }

        history.pushState(getStateWithGuard(), '', location.href);
        onNavigationBlocked?.();
    }

    function update() {
        if (shouldBlockNavigation()) {
            installHistoryGuard();
        } else {
            uninstallHistoryGuard();
        }
    }

    function destroy() {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
        isHistoryGuardInstalled = false;
        isSkippingNextPopState = false;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    update();

    return {
        update,
        destroy
    };
}