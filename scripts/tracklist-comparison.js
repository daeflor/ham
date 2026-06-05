const DEFAULT_DURATION_TOLERANCE_MS = 3000;

export function compareTracklists(youtubeTracks, appleTracks, options) {
    const availableAppleMatches = [...appleTracks];
    const matchedTracks = [];
    const removedTracks = [];

    for (const youtubeTrack of youtubeTracks) {
        const appleMatchIndex = availableAppleMatches.findIndex(appleTrack => {
            return tracksMatch(youtubeTrack, appleTrack, options);
        });

        if (appleMatchIndex === -1) {
            removedTracks.push(youtubeTrack);
            continue;
        }

        const [appleTrack] = availableAppleMatches.splice(appleMatchIndex, 1);
        matchedTracks.push({
            youtubeTrack,
            appleTrack,
            youtubePlaylistIndex: youtubeTrack.playlistIndex,
            applePlaylistIndex: appleTrack.playlistIndex
        });
    }

    return {
        matchedTracks,
        removedTracks,
        addedTracks: availableAppleMatches
    };
}

export function tracksMatch(firstTrack, secondTrack, options = {}) {
    const { ignoreAlbumMatching, ...textOptions } = options;

    return titlesMatch(firstTrack, secondTrack, textOptions)
        && artistsMatch(firstTrack, secondTrack, textOptions)
        && (ignoreAlbumMatching || albumsMatch(firstTrack, secondTrack, textOptions))
        && durationsMatch(firstTrack, secondTrack);
}

function titlesMatch(firstTrack, secondTrack, options) {
    return textFieldsMatch(firstTrack?.title, secondTrack?.title, options);
}

function artistsMatch(firstTrack, secondTrack, options) {
    return textFieldsMatch(firstTrack?.artist, secondTrack?.artist, options);
}

function albumsMatch(firstTrack, secondTrack, options) {
    return textFieldsMatch(firstTrack?.album, secondTrack?.album, options);
}

function textFieldsMatch(firstValue, secondValue, options) {
    const normalizedFirstValue = normalizeTextForComparison(firstValue, options);
    const normalizedSecondValue = normalizeTextForComparison(secondValue, options);

    return normalizedFirstValue === normalizedSecondValue;
}

function normalizeTextForComparison(value, { ignoreCapitalization, ignoreParentheticals }) {
    if (typeof value !== 'string') {
        return value;
    }

    const normalizedValue = ignoreParentheticals ? removeParentheticalText(value) : value;

    return ignoreCapitalization ? normalizedValue.toLocaleLowerCase() : normalizedValue;
}

function removeParentheticalText(value) {
    return value.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

function durationsMatch(firstTrack, secondTrack) {
    const firstDuration = firstTrack?.durationInMillis;
    const secondDuration = secondTrack?.durationInMillis;

    if (!Number.isFinite(firstDuration) || !Number.isFinite(secondDuration)) {
        return false;
    }

    return Math.abs(firstDuration - secondDuration) <= DEFAULT_DURATION_TOLERANCE_MS;
}
