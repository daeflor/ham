const DEFAULT_DURATION_TOLERANCE_MS = 3000;

export function compareTracklists(youtubeTracks, appleTracks, options = {}) {
    const durationToleranceMs = options.durationToleranceMs ?? DEFAULT_DURATION_TOLERANCE_MS;
    const matchCapitalization = options.matchCapitalization ?? true;
    const availableAppleMatches = [...appleTracks];
    const matchedTracks = [];
    const removedTracks = [];

    for (const youtubeTrack of youtubeTracks) {
        const appleMatchIndex = availableAppleMatches.findIndex(appleTrack => {
            return tracksMatch(youtubeTrack, appleTrack, { durationToleranceMs, matchCapitalization });
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

    return titlesMatch(firstTrack, secondTrack, matchCapitalization)
        && artistsMatch(firstTrack, secondTrack, matchCapitalization)
        && albumsMatch(firstTrack, secondTrack, matchCapitalization)
        && durationsMatch(firstTrack, secondTrack, durationToleranceMs);
}

function titlesMatch(firstTrack, secondTrack, matchCapitalization) {
    return textFieldsMatch(firstTrack?.title, secondTrack?.title, matchCapitalization);
}

function artistsMatch(firstTrack, secondTrack, matchCapitalization) {
    return textFieldsMatch(firstTrack?.artist, secondTrack?.artist, matchCapitalization);
}

function albumsMatch(firstTrack, secondTrack, matchCapitalization) {
    return textFieldsMatch(firstTrack?.album, secondTrack?.album, matchCapitalization);
}

function textFieldsMatch(firstValue, secondValue, matchCapitalization) {
    if (firstValue === secondValue) {
        return true;
    }

    if (matchCapitalization || typeof firstValue !== 'string' || typeof secondValue !== 'string') {
        return false;
    }

    return firstValue.toLocaleLowerCase() === secondValue.toLocaleLowerCase();
}

function durationsMatch(firstTrack, secondTrack, durationToleranceMs) {
    const firstDuration = firstTrack?.durationInMillis;
    const secondDuration = secondTrack?.durationInMillis;

    if (!Number.isFinite(firstDuration) || !Number.isFinite(secondDuration)) {
        return false;
    }

    return Math.abs(firstDuration - secondDuration) <= durationToleranceMs;
}
