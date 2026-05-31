import { copyTextToClipboard, formatComparisonExport, formatTrackMetadataRow } from './clipboard-export.js';

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

    const comparisonColumnsEl = comparisonViewEl.querySelector('.comparisonColumns');
    const comparisonListEls = [removedComparisonListEl, addedComparisonListEl];

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
    let checkedTrackKeys = new Set();

    function clearComparison() {
        removedTracks = [];
        addedTracks = [];
        checkedTrackKeys = new Set();
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
        checkedTrackKeys = new Set();
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

        for (const track of tracks) {
            listEl.append(createTrackRow(track, { canCopy: tone === 'removed' }));
        }
    }

    function createTrackRow(track, { canCopy }) {
        const trackKey = getTrackKey(track);
        const rowEl = comparisonTrackTemplateEl.content.firstElementChild.cloneNode(true);
        const checkboxEl = rowEl.querySelector('.comparisonTrackCheck');
        const indexEl = rowEl.querySelector('[data-track-field="playlistIndex"]');
        const titleEl = rowEl.querySelector('[data-track-field="title"]');
        const artistEl = rowEl.querySelector('[data-track-field="artist"]');
        const albumEl = rowEl.querySelector('[data-track-field="album"]');
        const durationEl = rowEl.querySelector('[data-track-field="duration"]');

        checkboxEl.setAttribute('aria-label', `Mark ${track.title ?? 'track'} as reviewed`);
        checkboxEl.setAttribute('aria-pressed', 'false');
        indexEl.textContent = `#${track.playlistIndex}`;
        titleEl.textContent = track.title ?? '-';
        artistEl.textContent = track.artist ?? '-';
        albumEl.textContent = track.album ?? '-';
        durationEl.textContent = track.readableDuration ?? '-';

        if (canCopy) {
            rowEl.classList.add('hasCopyButton');
            rowEl.append(createTrackCopyButton(track));
        }

        function toggleCheckedState() {
            const isChecked = checkedTrackKeys.has(trackKey);
            if (isChecked) {
                checkedTrackKeys.delete(trackKey);
            } else {
                checkedTrackKeys.add(trackKey);
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

    function createTrackCopyButton(track) {
        const buttonEl = document.createElement('button');
        buttonEl.className = 'comparisonTrackCopyButton';
        buttonEl.type = 'button';
        buttonEl.setAttribute('aria-label', `Copy metadata for ${track.title ?? 'removed track'}`);
        buttonEl.title = 'Copy track metadata';
        buttonEl.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 3h6V5H9zm-4 9h1V8a2 2 0 0 1 2-2h7V5H5zm3-7v11h10V8z" />
            </svg>
        `;

        buttonEl.addEventListener('click', (event) => {
            event.stopPropagation();
            void copyTrackToClipboard(track);
        });

        return buttonEl;
    }

    async function copyTrackToClipboard(track) {
        const exportText = formatTrackMetadataRow(track);

        try {
            await copyTextToClipboard(exportText);
            showStatus('Copied removed track.');
        } catch (error) {
            console.error('Unable to copy removed track', error);
            showStatus('Clipboard copy failed.');
        }
    }

    function getTrackKey(track) {
        return `${track.source}-${track.playlistIndex}`;
    }

    function showStatus(message) {
        comparisonStatusEl.textContent = message;
    }

    function shouldIgnoreCapitalization() {
        return ignoreCapitalizationCheckboxEl.checked;
    }

    async function copyComparisonToClipboard() {
        const exportText = formatComparisonExport({ removedTracks, addedTracks });

        try {
            await copyTextToClipboard(exportText);
            showStatus('Copied comparison.');
        } catch (error) {
            console.error('Unable to copy comparison', error);
            showStatus('Clipboard copy failed.');
        }
    }

    function onSaveCurrentVersion(handler) {
        saveComparisonButtonEl.addEventListener('click', handler);
    }

    function onIgnoreCapitalizationChanged(handler) {
        ignoreCapitalizationCheckboxEl.addEventListener('change', () => {
            // TODO does this need to be passed as a param; doesn't the checked state of the checkbox get passed in the event?
            handler(shouldIgnoreCapitalization());
        });
    }

    function resetComparisonScroll() {
        for (const listEl of comparisonListEls) {
            listEl.scrollTop = 0;
        }
    }

    function setupSharedComparisonScrolling() {
        comparisonColumnsEl.addEventListener('wheel', (event) => {
            if (event.deltaY === 0 || !canAnyListScroll(event.deltaY)) {
                return;
            }

            event.preventDefault();

            for (const listEl of comparisonListEls) {
                listEl.scrollTop = clampScrollTop(listEl, listEl.scrollTop + event.deltaY);
            }

            updateScrollButtonStates();
        }, { passive: false });
    }

    function getMaxScrollTop(listEl) {
        return Math.max(0, listEl.scrollHeight - listEl.clientHeight);
    }

    function canAnyListScroll(deltaY) {
        return comparisonListEls.some((listEl) => {
            if (deltaY > 0) {
                return listEl.scrollTop < getMaxScrollTop(listEl);
            }

            return listEl.scrollTop > 0;
        });
    }

    function setupColumnScrollButtons() {
        setupColumnScrollButton(scrollButtons.removed.up, removedComparisonListEl, -1);
        setupColumnScrollButton(scrollButtons.removed.down, removedComparisonListEl, 1);
        setupColumnScrollButton(scrollButtons.added.up, addedComparisonListEl, -1);
        setupColumnScrollButton(scrollButtons.added.down, addedComparisonListEl, 1);

        for (const listEl of comparisonListEls) {
            listEl.addEventListener('scroll', updateScrollButtonStates);
        }
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
        const top = clampScrollTop(listEl, listEl.scrollTop + rowRect.top - listRect.top);

        listEl.scrollTo({ top, behavior: 'smooth' });
    }

    function getTargetRowForScroll(listEl, rows, direction) {
        const listTop = listEl.getBoundingClientRect().top;

        if (direction > 0) {
            return rows.find((row) => row.getBoundingClientRect().top > listTop + 1) ?? rows.at(-1);
        }

        return rows.findLast((row) => row.getBoundingClientRect().top < listTop - 1) ?? rows[0];
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

    function clampScrollTop(listEl, top) {
        return Math.min(Math.max(0, top), getMaxScrollTop(listEl));
    }

    setupSharedComparisonScrolling();
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
