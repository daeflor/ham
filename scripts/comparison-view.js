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
    const comparisonScrollSpacerEl = document.createElement('div');
    comparisonScrollSpacerEl.className = 'comparisonScrollSpacer';
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
    const columnScrollOffsets = new Map();

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
        updateComparisonScrollSpacer();
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
        updateComparisonScrollSpacer();
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
            listEl.append(createTrackRow(track));
        }
    }

    function createTrackRow(track) {
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
        const lines = [[
            'Removed title',
            'Removed artist',
            'Removed album',
            'Removed duration',
            'Added title',
            'Added artist',
            'Added album',
            'Added duration'
        ].join('\t')];

        for (let index = 0; index < rowCount; index++) {
            lines.push([
                ...formatTrackForExport(removedTracks[index]),
                ...formatTrackForExport(addedTracks[index])
            ].join('\t'));
        }

        return lines.join('\n');
    }

    function formatTrackForExport(track) {
        if (!track) {
            return ['', '', '', ''];
        }

        return [
            track.title,
            track.artist,
            track.album,
            track.readableDuration
        ].map(formatExportCell);
    }

    function formatExportCell(value) {
        return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
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
        comparisonColumnsEl.scrollTop = 0;

        for (const listEl of comparisonListEls) {
            columnScrollOffsets.set(listEl, 0);
            listEl.scrollTop = 0;
        }
    }

    function setupSharedComparisonScrolling() {
        comparisonColumnsEl.append(comparisonScrollSpacerEl);
        comparisonColumnsEl.addEventListener('scroll', () => {
            for (const listEl of comparisonListEls) {
                syncColumnScroll(listEl);
            }

            updateScrollButtonStates();
        });
    }

    function updateComparisonScrollSpacer() {
        const maxColumnScrollTop = Math.max(...comparisonListEls.map(getMaxScrollTop));

        comparisonScrollSpacerEl.style.height = `${maxColumnScrollTop}px`;
    }

    function syncColumnScroll(listEl) {
        listEl.scrollTop = clampScrollTop(
            listEl,
            comparisonColumnsEl.scrollTop + (columnScrollOffsets.get(listEl) ?? 0)
        );
    }

    function getMaxScrollTop(listEl) {
        return Math.max(0, listEl.scrollHeight - listEl.clientHeight);
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

        columnScrollOffsets.set(listEl, top - comparisonColumnsEl.scrollTop);
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
