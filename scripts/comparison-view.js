export function createComparisonView(elements) {
    const { comparisonViewEl } = elements;

    let currentPlaylistId = '';
    let removedTracks = [];
    let addedTracks = [];
    let checkedTrackIds = new Set();

    const headerEl = document.createElement('div');
    headerEl.className = 'comparisonHeader';

    const summaryEl = document.createElement('p');
    summaryEl.className = 'comparisonSummary';

    const actionsEl = document.createElement('div');
    actionsEl.className = 'comparisonActions';

    const copyButtonEl = document.createElement('button');
    copyButtonEl.type = 'button';
    copyButtonEl.className = 'secondaryButton';
    copyButtonEl.textContent = 'Copy comparison';

    const saveButtonEl = document.createElement('button');
    saveButtonEl.type = 'button';
    saveButtonEl.className = 'secondaryButton';
    saveButtonEl.textContent = 'Save latest Apple Music version';

    const markTransferredButtonEl = document.createElement('button');
    markTransferredButtonEl.type = 'button';
    markTransferredButtonEl.className = 'secondaryButton comparisonTransferredButton';
    markTransferredButtonEl.textContent = 'Mark as transferred';

    const transferredBadgeEl = document.createElement('span');
    transferredBadgeEl.className = 'comparisonTransferredBadge';
    transferredBadgeEl.textContent = 'Transferred';
    transferredBadgeEl.hidden = true;

    const statusEl = document.createElement('div');
    statusEl.className = 'copyFeedback';
    statusEl.setAttribute('aria-live', 'polite');

    const columnsEl = document.createElement('div');
    columnsEl.className = 'comparisonColumns';

    actionsEl.append(copyButtonEl, saveButtonEl, markTransferredButtonEl, transferredBadgeEl, statusEl);
    headerEl.append(actionsEl, summaryEl);
    comparisonViewEl.append(headerEl, columnsEl);

    function clearComparison() {
        currentPlaylistId = '';
        removedTracks = [];
        addedTracks = [];
        checkedTrackIds = new Set();
        comparisonViewEl.hidden = true;
        statusEl.textContent = '';
        columnsEl.replaceChildren();
    }

    function renderComparison({ playlistId, isTransferred, removedTracks: removed, addedTracks: added }) {
        currentPlaylistId = playlistId;
        removedTracks = removed || [];
        addedTracks = added || [];
        checkedTrackIds = new Set();
        comparisonViewEl.hidden = false;
        statusEl.textContent = '';
        summaryEl.textContent = `${removedTracks.length} removed, ${addedTracks.length} added.`;
        setTransferredState(isTransferred);

        columnsEl.replaceChildren(
            createTrackColumn({ title: 'Removed', tone: 'removed', tracks: removedTracks }),
            createTrackColumn({ title: 'Added', tone: 'added', tracks: addedTracks })
        );
    }

    function createTrackColumn({ title, tone, tracks }) {
        const columnEl = document.createElement('section');
        columnEl.className = `comparisonColumn ${tone}`;

        const headingEl = document.createElement('div');
        headingEl.className = 'comparisonColumnHeading';

        const iconEl = document.createElement('span');
        iconEl.className = 'comparisonColumnIcon';
        iconEl.textContent = tone === 'removed' ? '-' : '+';
        iconEl.setAttribute('aria-hidden', 'true');

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;

        const countEl = document.createElement('span');
        countEl.className = 'comparisonCount';
        countEl.textContent = `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`;

        const listEl = document.createElement('div');
        listEl.className = 'comparisonTrackList';

        if (tracks.length === 0) {
            const emptyEl = document.createElement('p');
            emptyEl.className = 'comparisonEmpty';
            emptyEl.textContent = `No ${title.toLowerCase()} tracks.`;
            listEl.append(emptyEl);
        } else {
            for (const [index, track] of tracks.entries()) {
                listEl.append(createTrackRow(track, `${tone}-${index}`));
            }
        }

        headingEl.append(iconEl, titleEl, countEl);
        columnEl.append(headingEl, listEl);
        return columnEl;
    }

    function createTrackRow(track, fallbackId) {
        const trackId = track.id ?? fallbackId;
        const rowEl = document.createElement('article');
        rowEl.className = 'comparisonTrack';

        const checkboxEl = document.createElement('button');
        checkboxEl.type = 'button';
        checkboxEl.className = 'comparisonTrackCheck';
        checkboxEl.setAttribute('aria-label', `Mark ${track.title ?? 'track'} as reviewed`);
        checkboxEl.setAttribute('aria-pressed', 'false');
        checkboxEl.textContent = '✓';

        const bodyEl = document.createElement('div');
        bodyEl.className = 'comparisonTrackBody';

        const titleEl = document.createElement('div');
        titleEl.className = 'comparisonTrackTitle';
        titleEl.textContent = track.title ?? '-';

        const artistEl = document.createElement('div');
        artistEl.className = 'comparisonTrackMeta';
        artistEl.textContent = track.artist ?? '-';

        const albumEl = document.createElement('div');
        albumEl.className = 'comparisonTrackMeta';
        albumEl.textContent = track.album ?? '-';

        const durationEl = document.createElement('div');
        durationEl.className = 'comparisonTrackMeta';
        durationEl.textContent = track.readableDuration ?? '-';

        checkboxEl.addEventListener('click', () => {
            const isChecked = checkedTrackIds.has(trackId);
            if (isChecked) {
                checkedTrackIds.delete(trackId);
            } else {
                checkedTrackIds.add(trackId);
            }

            rowEl.classList.toggle('checked', !isChecked);
            checkboxEl.setAttribute('aria-pressed', String(!isChecked));
        });

        bodyEl.append(titleEl, artistEl, albumEl, durationEl);
        rowEl.append(checkboxEl, bodyEl);
        return rowEl;
    }

    function setTransferredState(isTransferred) {
        markTransferredButtonEl.hidden = isTransferred;
        transferredBadgeEl.hidden = !isTransferred;
    }

    function showStatus(message) {
        statusEl.textContent = message;
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
        saveButtonEl.addEventListener('click', handler);
    }

    function onMarkTransferred(handler) {
        markTransferredButtonEl.addEventListener('click', () => handler(currentPlaylistId));
    }

    copyButtonEl.addEventListener('click', () => {
        void copyComparisonToClipboard();
    });

    return {
        clearComparison,
        renderComparison,
        setTransferredState,
        showStatus,
        onSaveCurrentVersion,
        onMarkTransferred
    };
}