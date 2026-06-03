const DEFAULT_DURATION_TOLERANCE_MS = 3000;

export function compareTracklists(youtubeTracks, appleTracks, options = {}) {
    const durationToleranceMs = options.durationToleranceMs ?? DEFAULT_DURATION_TOLERANCE_MS;
    const matchCapitalization = options.matchCapitalization ?? true;
    const matchAlbums = options.matchAlbums ?? true;
    const ignoreTitleParentheticals = options.ignoreTitleParentheticals ?? false;
    const availableAppleMatches = [...appleTracks];
    const matchedTracks = [];
    const removedTracks = [];

    for (const youtubeTrack of youtubeTracks) {
        const appleMatchIndex = availableAppleMatches.findIndex(appleTrack => {
            return tracksMatch(youtubeTrack, appleTrack, {
                durationToleranceMs,
                matchCapitalization,
                matchAlbums,
                ignoreTitleParentheticals
            });
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
    const durationToleranceMs = options.durationToleranceMs ?? DEFAULT_DURATION_TOLERANCE_MS;
    const matchCapitalization = options.matchCapitalization ?? true;
    const matchAlbums = options.matchAlbums ?? true;
    const ignoreTitleParentheticals = options.ignoreTitleParentheticals ?? false;

    return titlesMatch(firstTrack, secondTrack, { matchCapitalization, ignoreTitleParentheticals })
        && artistsMatch(firstTrack, secondTrack, matchCapitalization)
        && albumsMatch(firstTrack, secondTrack, { matchCapitalization, matchAlbums })
        && durationsMatch(firstTrack, secondTrack, durationToleranceMs);
}

function titlesMatch(firstTrack, secondTrack, { matchCapitalization, ignoreTitleParentheticals }) {
    return textFieldsMatch(
        firstTrack?.title,
        secondTrack?.title,
        matchCapitalization,
        ignoreTitleParentheticals ? removeParentheticalText : undefined
    );
}

function artistsMatch(firstTrack, secondTrack, matchCapitalization) {
    return textFieldsMatch(firstTrack?.artist, secondTrack?.artist, matchCapitalization);
}

function albumsMatch(firstTrack, secondTrack, { matchCapitalization, matchAlbums }) {
    if (!matchAlbums) {
        return true;
    }

    return textFieldsMatch(firstTrack?.album, secondTrack?.album, matchCapitalization);
}

function textFieldsMatch(firstValue, secondValue, matchCapitalization, normalizeText) {
    if (normalizeText && typeof firstValue === 'string' && typeof secondValue === 'string') {
        return textFieldsMatch(normalizeText(firstValue), normalizeText(secondValue), matchCapitalization);
    }

    if (firstValue === secondValue) {
        return true;
    }

    if (matchCapitalization || typeof firstValue !== 'string' || typeof secondValue !== 'string') {
        return false;
    }

    return firstValue.toLocaleLowerCase() === secondValue.toLocaleLowerCase();
}

function removeParentheticalText(value) {
    return value.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

function durationsMatch(firstTrack, secondTrack, durationToleranceMs) {
    const firstDuration = firstTrack?.durationInMillis;
    const secondDuration = secondTrack?.durationInMillis;

    if (!Number.isFinite(firstDuration) || !Number.isFinite(secondDuration)) {
        return false;
    }

    return Math.abs(firstDuration - secondDuration) <= durationToleranceMs;
}
