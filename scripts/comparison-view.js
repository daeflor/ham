export function createComparisonView(elements) {
    const {
        comparisonViewEl,
        comparisonSummaryEl,
        copyComparisonButtonEl,
        saveComparisonButtonEl,
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
    // const rowScrollThreshold = 60;
    // const rowScrollCooldownMs = 240;

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

    function showLoading() {
        clearComparison();
        comparisonViewEl.hidden = false;
        comparisonSummaryEl.textContent = 'Loading Apple Music and YouTube Music tracklists...';
    }

    function showError(message) {
        clearComparison();
        comparisonViewEl.hidden = false;
        comparisonSummaryEl.textContent = message;
    }

    function renderComparison({ removedTracks: removed, addedTracks: added }) {
        removedTracks = removed || [];
        addedTracks = added || [];
        checkedTrackIds = new Set();
        comparisonViewEl.hidden = false;
        comparisonStatusEl.textContent = '';
        comparisonSummaryEl.textContent = `${removedTracks.length} removed, ${addedTracks.length} added.`;

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

    // function setupRowSnapScrolling(listEl) {
    //     let wheelDelta = 0;
    //     let lastScrollAt = 0;

    //     listEl.addEventListener('wheel', (event) => {
    //         const rows = Array.from(listEl.querySelectorAll('.comparisonTrack'));

    //         if (rows.length === 0) {
    //             return;
    //         }

    //         event.preventDefault();
    //         wheelDelta += event.deltaY;

    //         const now = performance.now();
    //         if (Math.abs(wheelDelta) < rowScrollThreshold || now - lastScrollAt < rowScrollCooldownMs) {
    //             return;
    //         }

    //         scrollColumnByRow(listEl, rows, Math.sign(wheelDelta));
    //         wheelDelta = 0;
    //         lastScrollAt = now;
    //     }, { passive: false });
    // }

    // function scrollColumnByRow(listEl, rows, direction) {
    //     const targetRow = getTargetRowForScroll(listEl, rows, direction);

    //     if (!targetRow) {
    //         return;
    //     }

    //     const listRect = listEl.getBoundingClientRect();
    //     const rowRect = targetRow.getBoundingClientRect();
    //     const top = listEl.scrollTop + rowRect.top - listRect.top;

    //     listEl.scrollTo({ top, behavior: 'smooth' });
    // }

    // function getTargetRowForScroll(listEl, rows, direction) {
    //     const listTop = listEl.getBoundingClientRect().top;
    //     const firstVisibleIndex = rows.findIndex((row) => row.getBoundingClientRect().bottom > listTop + 1);

    //     if (firstVisibleIndex === -1) {
    //         return rows.at(-1);
    //     }

    //     const firstVisibleTop = rows[firstVisibleIndex].getBoundingClientRect().top - listTop;

    //     if (direction > 0 && Math.abs(firstVisibleTop) <= 1) {
    //         return rows[Math.min(firstVisibleIndex + 1, rows.length - 1)];
    //     }

    //     if (direction < 0 && firstVisibleTop < -1) {
    //         return rows[firstVisibleIndex];
    //     }

    //     return rows[Math.max(firstVisibleIndex - 1, 0)];
    // }

    // setupRowSnapScrolling(removedComparisonListEl);
    // setupRowSnapScrolling(addedComparisonListEl);

    copyComparisonButtonEl.addEventListener('click', () => {
        void copyComparisonToClipboard();
    });

    return {
        clearComparison,
        hideComparison,
        showLoading,
        showError,
        renderComparison,
        showStatus,
        onSaveCurrentVersion
    };
}
