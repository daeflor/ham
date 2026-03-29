
function waitForDomReady() {
    if (document.readyState === 'loading') {
        return new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    return Promise.resolve();
}

function waitForMusicKitLoaded() {
    if (typeof MusicKit !== 'undefined' && MusicKit.getInstance) {
        return Promise.resolve();
    }
    return new Promise((resolve) => document.addEventListener('musickitloaded', resolve, { once: true }));
}

export async function waitForAppReady() {
    await Promise.all([waitForDomReady(), waitForMusicKitLoaded()]);
}

export function formatDuration(durationInMillis) {
    if (!Number.isFinite(durationInMillis) || durationInMillis <= 0) {
        return '—';
    }

    const totalSeconds = Math.floor(durationInMillis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
