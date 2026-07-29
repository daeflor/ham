import { formatDuration } from './utils.js';

export class Track {
    constructor(metadata, source, playlistIndex) {
        const { title, artist, album, durationInMillis, readableDuration } = Track.normalizeMetadata(metadata, source);

        this.title = title;
        this.artist = artist;
        this.album = album;
        this.durationInMillis = durationInMillis;
        this.readableDuration = readableDuration;
        this.source = source;
        this.playlistIndex = playlistIndex;
    }

    static normalizeMetadata(metadata, source) {
        if (source === 'apple-music') {
            return {
                title: metadata?.attributes?.name,
                artist: metadata?.attributes?.artistName,
                album: metadata?.attributes?.albumName,
                durationInMillis: metadata?.attributes?.durationInMillis,
                readableDuration: formatDuration(metadata?.attributes?.durationInMillis)
            };
        }

        if (source === 'apple-music-firestore') {
            return metadata;
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

    toPlainObject() {
        return {
            title: this.title ?? null,
            artist: this.artist ?? null,
            album: this.album ?? null,
            durationInMillis: this.durationInMillis ?? null,
            readableDuration: this.readableDuration ?? null,
            playlistIndex: this.playlistIndex ?? null
        };
    }

    static fromAppleMusic(metadata, playlistIndex) {
        return new Track(metadata, 'apple-music', playlistIndex);
    }

    static fromStoredAppleMusic(metadata, playlistIndex) {
        return new Track(metadata, 'apple-music-firestore', metadata?.playlistIndex ?? playlistIndex);
    }

    static fromStoredYoutubeMusic(metadata, playlistIndex) {
        return new Track(metadata, 'youtube-music', playlistIndex);
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
