export function createComparisonView(elements) {
    const {
        comparisonViewEl,
        comparisonSummaryEl,
        copyComparisonButtonEl,
        saveComparisonButtonEl,
        markTransferredButtonEl,
        comparisonTransferredBadgeEl,
        comparisonStatusEl,
        removedComparisonCountEl,
        removedComparisonListEl,
        addedComparisonCountEl,
        addedComparisonListEl,
        comparisonTrackTemplateEl
    } = elements;

    let removedTracks = [];
    let addedTracks = [];
    let checkedTrackIds = new Set();

    function clearComparison() {
        removedTracks = [];
        addedTracks = [];
        checkedTrackIds = new Set();
        comparisonStatusEl.textContent = '';
        comparisonSummaryEl.textContent = '';
        removedComparisonCountEl.textContent = '';
        addedComparisonCountEl.textContent = '';
        removedComparisonListEl.replaceChildren();
        addedComparisonListEl.replaceChildren();
    }

    function hideComparison() {
        comparisonViewEl.hidden = true;
    }

    function showLoading({ isTransferred } = {}) {
        clearComparison();
        comparisonViewEl.hidden = false;
        setTransferredState(Boolean(isTransferred));
        comparisonSummaryEl.textContent = 'Loading Apple Music and YouTube Music tracklists...';
    }

    function showError(message, { isTransferred } = {}) {
        clearComparison();
        comparisonViewEl.hidden = false;
        setTransferredState(Boolean(isTransferred));
        comparisonSummaryEl.textContent = message;
    }

    function renderComparison({ isTransferred, removedTracks: removed, addedTracks: added }) {
        removedTracks = removed || [];
        addedTracks = added || [];
        checkedTrackIds = new Set();
        comparisonViewEl.hidden = false;
        comparisonStatusEl.textContent = '';
        comparisonSummaryEl.textContent = `${removedTracks.length} removed, ${addedTracks.length} added.`;
        setTransferredState(isTransferred);

        renderTrackColumn({
            title: 'Removed',
            tone: 'removed',
            tracks: removedTracks,
            countEl: removedComparisonCountEl,
            listEl: removedComparisonListEl
        });
        renderTrackColumn({
            title: 'Added',
            tone: 'added',
            tracks: addedTracks,
            countEl: addedComparisonCountEl,
            listEl: addedComparisonListEl
        });
    }

    function renderTrackColumn({ title, tone, tracks, countEl, listEl }) {
        listEl.replaceChildren();
        countEl.textContent = `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`;

        if (tracks.length === 0) {
            const emptyEl = document.createElement('p');
            emptyEl.className = 'comparisonEmpty';
            emptyEl.textContent = `No ${title.toLowerCase()} tracks.`;
            listEl.append(emptyEl);
            return;
        }

        for (const [index, track] of tracks.entries()) {
            listEl.append(createTrackRow(track, `${tone}-${index}`));
        }
    }

    function createTrackRow(track, fallbackId) {
        const trackId = track.id ?? fallbackId;
        const rowEl = comparisonTrackTemplateEl.content.firstElementChild.cloneNode(true);
        const checkboxEl = rowEl.querySelector('.comparisonTrackCheck');
        const titleEl = rowEl.querySelector('[data-track-field="title"]');
        const artistEl = rowEl.querySelector('[data-track-field="artist"]');
        const albumEl = rowEl.querySelector('[data-track-field="album"]');
        const durationEl = rowEl.querySelector('[data-track-field="duration"]');

        checkboxEl.setAttribute('aria-label', `Mark ${track.title ?? 'track'} as reviewed`);
        checkboxEl.setAttribute('aria-pressed', 'false');
        titleEl.textContent = track.title ?? '-';
        artistEl.textContent = track.artist ?? '-';
        albumEl.textContent = track.album ?? '-';
        durationEl.textContent = track.readableDuration ?? '-';

        function toggleCheckedState() {
            const isChecked = checkedTrackIds.has(trackId);
            if (isChecked) {
                checkedTrackIds.delete(trackId);
            } else {
                checkedTrackIds.add(trackId);
            }

            rowEl.classList.toggle('checked', !isChecked);
            checkboxEl.setAttribute('aria-pressed', String(!isChecked));
        }

        rowEl.addEventListener('click', (event) => {
            if (event.target === checkboxEl) {
                return;
            }

            toggleCheckedState();
        });

        checkboxEl.addEventListener('click', () => {
            toggleCheckedState();
        });

        return rowEl;
    }

    function setTransferredState(isTransferred) {
        markTransferredButtonEl.hidden = isTransferred;
        comparisonTransferredBadgeEl.hidden = !isTransferred;
    }

    function showStatus(message) {
        comparisonStatusEl.textContent = message;
    }

    async function copyComparisonToClipboard() {
        const exportText = formatSideBySideComparison();

        try {
            await navigator.clipboard.writeText(exportText);
            showStatus('Copied comparison.');
        } catch (error) {
            console.error('Unable to copy comparison', error);
            showStatus('Clipboard copy failed.');
        }
    }

    function formatSideBySideComparison() {
        const rowCount = Math.max(removedTracks.length, addedTracks.length);
        const lines = ['Removed\tAdded'];

        for (let index = 0; index < rowCount; index++) {
            lines.push([
                formatTrackForExport(removedTracks[index], index),
                formatTrackForExport(addedTracks[index], index)
            ].join('\t'));
        }

        return lines.join('\n');
    }

    function formatTrackForExport(track, index) {
        if (!track) {
            return '';
        }

        return [
            `${index + 1}. ${track.title ?? '-'}`,
            track.artist ?? '-',
            track.album ?? '-',
            track.readableDuration ?? '-'
        ].join(' | ');
    }

    function onSaveCurrentVersion(handler) {
        saveComparisonButtonEl.addEventListener('click', handler);
    }

    function onMarkTransferred(handler) {
        markTransferredButtonEl.addEventListener('click', handler);
    }

    copyComparisonButtonEl.addEventListener('click', () => {
        void copyComparisonToClipboard();
    });

    return {
        clearComparison,
        hideComparison,
        showLoading,
        showError,
        renderComparison,
        setTransferredState,
        showStatus,
        onSaveCurrentVersion,
        onMarkTransferred
    };
}
