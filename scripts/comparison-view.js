export function createComparisonView(elements) {
    const {
        comparisonViewEl,
        comparisonSummaryEl,
        ignoreCapitalizationCheckboxEl,
        copyComparisonButtonEl,
        saveComparisonButtonEl,
        comparisonStatusEl,
        removedComparisonCountEl,
        removedComparisonListEl,
        addedComparisonCountEl,
        addedComparisonListEl,
        comparisonTrackTemplateEl
    } = elements;

    const scrollButtons = {
        removed: {
            up: comparisonViewEl.querySelector('[data-comparison-scroll="removed"][data-scroll-direction="-1"]'),
            down: comparisonViewEl.querySelector('[data-comparison-scroll="removed"][data-scroll-direction="1"]')
        },
        added: {
            up: comparisonViewEl.querySelector('[data-comparison-scroll="added"][data-scroll-direction="-1"]'),
            down: comparisonViewEl.querySelector('[data-comparison-scroll="added"][data-scroll-direction="1"]')
        }
    };
    let removedTracks = [];
    let addedTracks = [];
    let checkedTrackIds = new Set();
    let sharedWheelScrollTimeoutId = null;

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
        resetComparisonScroll();
        updateScrollButtonStates();
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
        resetComparisonScroll();
        updateScrollButtonStates();
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

    function shouldIgnoreCapitalization() {
        return ignoreCapitalizationCheckboxEl.checked;
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

    function onIgnoreCapitalizationChanged(handler) {
        ignoreCapitalizationCheckboxEl.addEventListener('change', () => {
            handler(shouldIgnoreCapitalization());
        });
    }

    function resetComparisonScroll() {
        removedComparisonListEl.scrollTop = 0;
        addedComparisonListEl.scrollTop = 0;
    }

    function setupSharedWheelScrolling() {
        setupSharedWheelScroll(removedComparisonListEl, addedComparisonListEl);
        setupSharedWheelScroll(addedComparisonListEl, removedComparisonListEl);
    }

    function setupSharedWheelScroll(sourceListEl, targetListEl) {
        sourceListEl.addEventListener('wheel', (event) => {
            const deltaY = normalizeWheelDelta(event);

            if (deltaY === 0 || !canAnyListScroll(deltaY)) {
                return;
            }

            event.preventDefault();
            startSharedWheelScroll();
            sourceListEl.scrollTop += deltaY;
            targetListEl.scrollTop += deltaY;
            updateScrollButtonStates();
        }, { passive: false });
    }

    function startSharedWheelScroll() {
        removedComparisonListEl.classList.add('isSharedScrolling');
        addedComparisonListEl.classList.add('isSharedScrolling');

        window.clearTimeout(sharedWheelScrollTimeoutId);
        sharedWheelScrollTimeoutId = window.setTimeout(() => {
            removedComparisonListEl.classList.remove('isSharedScrolling');
            addedComparisonListEl.classList.remove('isSharedScrolling');
            sharedWheelScrollTimeoutId = null;
            updateScrollButtonStates();
        }, 140);
    }

    function normalizeWheelDelta(event) {
        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            return event.deltaY * 16;
        }

        if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            return event.deltaY * removedComparisonListEl.clientHeight;
        }

        return event.deltaY;
    }

    function canAnyListScroll(deltaY) {
        return [removedComparisonListEl, addedComparisonListEl].some((listEl) => canListScroll(listEl, deltaY));
    }

    function canListScroll(listEl, deltaY) {
        if (deltaY > 0) {
            return listEl.scrollTop < getMaxScrollTop(listEl);
        }

        if (deltaY < 0) {
            return listEl.scrollTop > 0;
        }

        return false;
    }

    function getMaxScrollTop(listEl) {
        return Math.max(0, listEl.scrollHeight - listEl.clientHeight);
    }

    function setupColumnScrollButtons() {
        setupColumnScrollButton(scrollButtons.removed.up, removedComparisonListEl, -1);
        setupColumnScrollButton(scrollButtons.removed.down, removedComparisonListEl, 1);
        setupColumnScrollButton(scrollButtons.added.up, addedComparisonListEl, -1);
        setupColumnScrollButton(scrollButtons.added.down, addedComparisonListEl, 1);

        removedComparisonListEl.addEventListener('scroll', updateScrollButtonStates);
        addedComparisonListEl.addEventListener('scroll', updateScrollButtonStates);
    }

    function setupColumnScrollButton(buttonEl, listEl, direction) {
        buttonEl.addEventListener('click', () => {
            scrollColumnByRow(listEl, direction);
        });
    }

    function scrollColumnByRow(listEl, direction) {
        const rows = Array.from(listEl.querySelectorAll('.comparisonTrack'));
        const targetRow = getTargetRowForScroll(listEl, rows, direction);

        if (!targetRow) {
            return;
        }

        const listRect = listEl.getBoundingClientRect();
        const rowRect = targetRow.getBoundingClientRect();
        const top = listEl.scrollTop + rowRect.top - listRect.top;

        listEl.scrollTo({ top, behavior: 'smooth' });
    }

    function getTargetRowForScroll(listEl, rows, direction) {
        const listTop = listEl.getBoundingClientRect().top;
        const firstVisibleIndex = rows.findIndex((row) => row.getBoundingClientRect().bottom > listTop + 1);

        if (firstVisibleIndex === -1) {
            return rows.at(-1);
        }

        const firstVisibleTop = rows[firstVisibleIndex].getBoundingClientRect().top - listTop;

        if (direction > 0 && Math.abs(firstVisibleTop) <= 1) {
            return rows[Math.min(firstVisibleIndex + 1, rows.length - 1)];
        }

        if (direction < 0 && firstVisibleTop < -1) {
            return rows[firstVisibleIndex];
        }

        return rows[Math.max(firstVisibleIndex - 1, 0)];
    }

    function updateScrollButtonStates() {
        updateColumnScrollButtonStates(removedComparisonListEl, scrollButtons.removed);
        updateColumnScrollButtonStates(addedComparisonListEl, scrollButtons.added);
    }

    function updateColumnScrollButtonStates(listEl, buttons) {
        const hasRows = listEl.querySelector('.comparisonTrack') !== null;
        buttons.up.disabled = !hasRows || listEl.scrollTop <= 0;
        buttons.down.disabled = !hasRows || listEl.scrollTop >= getMaxScrollTop(listEl) - 1;
    }

    setupSharedWheelScrolling();
    setupColumnScrollButtons();
    updateScrollButtonStates();

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
        shouldIgnoreCapitalization,
        onIgnoreCapitalizationChanged,
        onSaveCurrentVersion
    };
}
