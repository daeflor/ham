export function formatTrackMetadataRow(track) {
    return getTrackMetadataCells(track).join('\t');
}

export function formatTracklistExport(tracks) {
    return tracks.map(formatTrackMetadataRow).join('\n');
}

export function formatComparisonExport({ removedTracks, addedTracks }) {
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
            ...getTrackMetadataCells(removedTracks[index]),
            ...getTrackMetadataCells(addedTracks[index])
        ].join('\t'));
    }

    return lines.join('\n');
}

export function copyTextToClipboard(text) {
    return navigator.clipboard.writeText(text);
}

function getTrackMetadataCells(track) {
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