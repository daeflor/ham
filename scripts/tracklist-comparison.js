const DEFAULT_DURATION_TOLERANCE_MS = 3000;

export function compareTracklists(youtubeTracks, appleTracks, options = {}) {
    const durationToleranceMs = options.durationToleranceMs ?? DEFAULT_DURATION_TOLERANCE_MS;
    const availableAppleMatches = appleTracks.map((track, index) => ({ track, index }));
    const matchedTracks = [];
    const removedTracks = [];

    for (const youtubeTrack of youtubeTracks) {
        const appleMatchIndex = availableAppleMatches.findIndex(({ track }) => {
            return tracksMatch(youtubeTrack, track, { durationToleranceMs });
        });

        if (appleMatchIndex === -1) {
            removedTracks.push(youtubeTrack);
            continue;
        }

        const [appleMatch] = availableAppleMatches.splice(appleMatchIndex, 1);
        matchedTracks.push({
            youtubeTrack,
            appleTrack: appleMatch.track
        });
    }

    return {
        matchedTracks,
        removedTracks,
        addedTracks: availableAppleMatches
            .sort((a, b) => a.index - b.index)
            .map(({ track }) => track)
    };
}

export function tracksMatch(firstTrack, secondTrack, options = {}) {
    const durationToleranceMs = options.durationToleranceMs ?? DEFAULT_DURATION_TOLERANCE_MS;

    return titlesMatch(firstTrack, secondTrack)
        && artistsMatch(firstTrack, secondTrack)
        && albumsMatch(firstTrack, secondTrack)
        && durationsMatch(firstTrack, secondTrack, durationToleranceMs);
}

function titlesMatch(firstTrack, secondTrack) {
    return firstTrack?.title === secondTrack?.title;
}

function artistsMatch(firstTrack, secondTrack) {
    return firstTrack?.artist === secondTrack?.artist;
}

function albumsMatch(firstTrack, secondTrack) {
    return firstTrack?.album === secondTrack?.album;
}

function durationsMatch(firstTrack, secondTrack, durationToleranceMs) {
    const firstDuration = firstTrack?.durationInMillis;
    const secondDuration = secondTrack?.durationInMillis;

    if (!Number.isFinite(firstDuration) || !Number.isFinite(secondDuration)) {
        return false;
    }

    return Math.abs(firstDuration - secondDuration) <= durationToleranceMs;
}
