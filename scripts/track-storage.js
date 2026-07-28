export function toStoredAppleMusicTracks(tracks) {
    return tracks.map(track => ({
        title: track.title ?? null,
        artist: track.artist ?? null,
        album: track.album ?? null,
        durationInMillis: track.durationInMillis ?? null,
        readableDuration: track.readableDuration ?? null,
        playlistIndex: track.playlistIndex ?? null
    }));
}
