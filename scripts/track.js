import { formatDuration } from './utils.js';

export class Track {
    constructor(metadata, source) {
        const { title, artist, album, durationInMillis, readableDuration } = Track.normalizeMetadata(metadata, source);

        this.title = title;
        this.artist = artist;
        this.album = album;
        this.durationInMillis = durationInMillis;
        this.readableDuration = readableDuration;
        this.source = source;
    }

    static normalizeMetadata(metadata, source) {
        if (source === 'apple-music') {
            const durationInMillis = metadata?.attributes?.durationInMillis;

            return {
                title: metadata?.attributes?.name,
                artist: metadata?.attributes?.artistName,
                album: metadata?.attributes?.albumName,
                durationInMillis,
                readableDuration: formatDuration(durationInMillis)
            };
        }

        if (source === 'youtube-music') {
            const readableDuration = metadata?.duration;

            return {
                title: metadata?.title,
                artist: metadata?.artist,
                album: metadata?.album,
                durationInMillis: Track.parseDurationToMillis(readableDuration),
                readableDuration
            };
        }

        throw new Error(`Unsupported track source: ${source}`);
    }

    static fromAppleMusic(metadata) {
        return new Track(metadata, 'apple-music');
    }

    static fromStoredYoutubeMusic(metadata) {
        return new Track(metadata, 'youtube-music');
    }

    static parseDurationToMillis(value) {
        if (typeof value !== 'string') {
            return undefined;
        }

        const parts = value.split(':').map(part => Number.parseInt(part, 10));
        if (parts.length < 2 || parts.length > 3 || parts.some(part => Number.isNaN(part))) {
            return undefined;
        }

        return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
    }
}
