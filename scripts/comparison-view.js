import { copyTextToClipboard, formatComparisonExport, formatTrackMetadataRow } from './clipboard-export.js';

export function createComparisonView(elements) {
    const {
        comparisonViewEl,
        ignoreCapitalizationCheckboxEl,
        ignoreAlbumMatchingCheckboxEl,
        ignoreParentheticalsCheckboxEl,
        ignoreSpecialCharactersCheckboxEl,
        copyComparisonButtonEl,
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
    let collapsedTrackKeys = new Set();

    function clearComparison() {
        removedTracks = [];
        addedTracks = [];
        collapsedTrackKeys = new Set();
        showStatus('');
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
        showStatus('Loading Apple Music and YouTube Music tracklists...');
    }

    function showError(message) {
        clearComparison();
        comparisonViewEl.hidden = false;
        showStatus(message);
    }

    function renderComparison({ removedTracks: removed, addedTracks: added, matchedTrackCount = 0 }) {
        removedTracks = removed || [];
        addedTracks = added || [];
        collapsedTrackKeys = new Set();
        comparisonViewEl.hidden = false;
        showStatus(`${matchedTrackCount} matched, ${removedTracks.length} removed, ${addedTracks.length} added.`);

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

    function setMetadataText(element, value) {
        const text = value ?? '-';
        element.textContent = text;
        element.title = text;
    }

    function createTrackRow(track, { canCopy }) {
        const trackKey = getTrackKey(track);
        const rowEl = comparisonTrackTemplateEl.content.firstElementChild.cloneNode(true);
        const indexEl = rowEl.querySelector('[data-track-field="playlistIndex"]');
        const titleEl = rowEl.querySelector('[data-track-field="title"]');
        const artistEl = rowEl.querySelector('[data-track-field="artist"]');
        const albumEl = rowEl.querySelector('[data-track-field="album"]');
        const durationEl = rowEl.querySelector('[data-track-field="duration"]');
        const actionsEl = document.createElement('div');
        actionsEl.className = 'comparisonTrackActions';

        indexEl.textContent = `#${track.playlistIndex}`;
        setMetadataText(titleEl, track.title);
        setMetadataText(artistEl, track.artist);
        setMetadataText(albumEl, track.album);
        setMetadataText(durationEl, track.readableDuration);

        actionsEl.append(createTrackScrollToTopButton(rowEl));

        if (canCopy) {
            rowEl.classList.add('hasCopyButton');
            actionsEl.append(createTrackCopyButton(track));
        }

        rowEl.append(actionsEl);

        function toggleCollapsedState() {
            const isCollapsed = collapsedTrackKeys.has(trackKey);
            if (isCollapsed) {
                collapsedTrackKeys.delete(trackKey);
            } else {
                collapsedTrackKeys.add(trackKey);
            }

            const nextIsCollapsed = !isCollapsed;
            rowEl.classList.toggle('collapsed', nextIsCollapsed);
        }

        rowEl.addEventListener('click', () => {
            toggleCollapsedState();
        });

        return rowEl;
    }

    function createTrackScrollToTopButton(rowEl) {
        const buttonEl = document.createElement('button');
        buttonEl.className = 'comparisonTrackScrollButton';
        buttonEl.type = 'button';
        buttonEl.title = 'Scroll track to top';
        buttonEl.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M11 6.83 6.41 11.41 5 10l7-7 7 7-1.41 1.41L13 6.83V21h-2z" />
            </svg>
        `;

        buttonEl.addEventListener('click', (event) => {
            event.stopPropagation();
            scrollTrackRowToTop(rowEl);
        });

        return buttonEl;
    }

    function createTrackCopyButton(track) {
        const buttonEl = document.createElement('button');
        buttonEl.className = 'comparisonTrackCopyButton';
        buttonEl.type = 'button';
        buttonEl.title = 'Copy track metadata';
        buttonEl.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 3h6V5H9zm-4 9h1V8a2 2 0 0 1 2-2h7V5H5zm3-7v11h10V8z" />
            </svg>
        `;

        buttonEl.addEventListener('click', (event) => {
            event.stopPropagation();
            void copyTrackToClipboard(track);
        });

        return buttonEl;
    }

    function scrollTrackRowToTop(rowEl) {
        const listEl = rowEl.parentElement;

        if (!listEl) {
            return;
        }

        const listRect = listEl.getBoundingClientRect();
        const rowRect = rowEl.getBoundingClientRect();
        const top = clampScrollTop(listEl, listEl.scrollTop + rowRect.top - listRect.top);

        listEl.scrollTo({ top, behavior: 'smooth' });
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

    function getComparisonOptions() {
        return {
            ignoreCapitalization: ignoreCapitalizationCheckboxEl.checked,
            ignoreAlbumMatching: ignoreAlbumMatchingCheckboxEl.checked,
            ignoreParentheticals: ignoreParentheticalsCheckboxEl.checked,
            ignoreSpecialCharacters: ignoreSpecialCharactersCheckboxEl.checked
        };
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

    function onComparisonOptionsChanged(handler) {
        const optionEls = [
            ignoreCapitalizationCheckboxEl,
            ignoreAlbumMatchingCheckboxEl,
            ignoreParentheticalsCheckboxEl,
            ignoreSpecialCharactersCheckboxEl
        ];

        for (const optionEl of optionEls) {
            optionEl.addEventListener('change', () => {
                handler();
            });
        }
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
        getComparisonOptions,
        onComparisonOptionsChanged
    };
}
