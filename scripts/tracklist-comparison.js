const DEFAULT_DURATION_TOLERANCE_MS = 4000;

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

    return textFieldsMatch(firstTrack?.title, secondTrack?.title, textOptions)
        && textFieldsMatch(firstTrack?.artist, secondTrack?.artist, textOptions)
        && (ignoreAlbumMatching || textFieldsMatch(firstTrack?.album, secondTrack?.album, textOptions))
        && durationsMatch(firstTrack, secondTrack);
}

function textFieldsMatch(firstValue, secondValue, textOptions) {
    if (typeof firstValue !== 'string' || typeof secondValue !== 'string') {
        return false;
    }

    firstValue = normalizeTextForComparison(firstValue, textOptions);
    secondValue = normalizeTextForComparison(secondValue, textOptions);

    return firstValue === secondValue;
}

function normalizeTextForComparison(value, { ignoreCapitalization, ignoreParentheticals, ignoreSpecialCharacters }) {
    value = ignoreParentheticals ? removeParentheticalText(value) : value;
    value = ignoreSpecialCharacters ? normalizeSpecialCharacters(value) : value;
    value = ignoreCapitalization ? value.toLocaleLowerCase() : value;

    return value;
}

// Removes accents and consolidates apostrophe-like characters to a straight apostrophe for accent-insensitive and apostrophe-insensitive matching.
function normalizeSpecialCharacters(value) {
    return value
        .replace(/[\u0060\u00b4\u02bc\u2018\u2019\u201a\u201b\u2032\uff07]/g, "'") // Consolidate apostrophe-like characters to a straight apostrophe.
        .normalize('NFD') // Split accented letters into base letters plus combining marks.
        .replace(/[\u0300-\u036f]/g, ''); // Remove combining marks for accent-insensitive matching.
}

function removeParentheticalText(value) {
    // Remove text in parentheses or brackets, and trim whitespace. For example, "Song Title (feat. Artist) [Remix]" becomes "Song Title".
    return value.replace(/\s*(?:\([^)]*\)|\[[^\]]*\])/g, '').replace(/\s+/g, ' ').trim();
}

function durationsMatch(firstTrack, secondTrack) {
    const firstDuration = firstTrack?.durationInMillis;
    const secondDuration = secondTrack?.durationInMillis;

    if (!Number.isFinite(firstDuration) || !Number.isFinite(secondDuration)) {
        return false;
    }

    return Math.abs(firstDuration - secondDuration) <= DEFAULT_DURATION_TOLERANCE_MS;
}
