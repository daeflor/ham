import assert from 'node:assert/strict';
import test from 'node:test';
import { compareTracklists, tracksMatch } from '../scripts/tracklist-comparison.js';

const track = {
    title: 'What have you done now',
    artist: 'Artist',
    album: 'Album',
    durationInMillis: 180000,
    playlistIndex: 1
};

test('question marks remain significant by default and when explicitly disabled', () => {
    const withQuestionMark = { ...track, title: `${track.title}?` };

    assert.equal(tracksMatch(track, withQuestionMark), false);
    assert.equal(tracksMatch(track, withQuestionMark, { ignoreQuestionMarks: false }), false);
    assert.equal(tracksMatch(track, track), true);
});

for (const field of ['title', 'artist', 'album']) {
    test(`ignoring question marks applies to ${field} in either track`, () => {
        const withQuestionMarks = { ...track, [field]: `?${track[field]}??` };
        const options = { ignoreQuestionMarks: true };

        assert.equal(tracksMatch(track, withQuestionMarks, options), true);
        assert.equal(tracksMatch(withQuestionMarks, track, options), true);
        assert.equal(tracksMatch(track, withQuestionMarks, { ignoreQuestionMarks: false }), false);
    });
}

test('question marks are removed from within text without ignoring other differences', () => {
    const options = { ignoreQuestionMarks: true };

    assert.equal(tracksMatch(track, { ...track, title: 'What? have you? done now?' }, options), true);
    for (const title of [`${track.title}!`, `${track.title}.`, `${track.title} `, 'What have you done']) {
        assert.equal(tracksMatch(track, { ...track, title }, options), false);
    }
    assert.equal(tracksMatch(track, { ...track, artist: null }, options), false);
});

test('question mark filtering composes with existing text filters', () => {
    const variant = {
        ...track,
        title: 'WHAT HAVE YOU DONE NOW? (Live)',
        artist: '\u00c1rtist',
        album: 'Different album'
    };
    const options = {
        ignoreCapitalization: true,
        ignoreParentheticals: true,
        ignoreSpecialCharacters: true,
        ignoreAlbumMatching: true
    };

    assert.equal(tracksMatch(track, variant, options), false);
    assert.equal(tracksMatch(track, variant, { ...options, ignoreQuestionMarks: true }), true);
});

test('question mark filtering preserves the duration tolerance', () => {
    const options = { ignoreQuestionMarks: true };
    const variant = { ...track, title: `${track.title}?`, durationInMillis: 186000 };

    assert.equal(tracksMatch(track, variant, options), true);
    assert.equal(tracksMatch(track, { ...variant, durationInMillis: 186001 }, options), false);
});

test('toggling the filter updates comparison results without mutating track metadata', () => {
    const youtubeTracks = [Object.freeze({ ...track })];
    const appleTracks = [Object.freeze({ ...track, title: `${track.title}?` })];

    for (const ignoreQuestionMarks of [false, true, false]) {
        const result = compareTracklists(youtubeTracks, appleTracks, { ignoreQuestionMarks });

        assert.deepEqual(result, ignoreQuestionMarks ? {
            matchedTracks: [{
                youtubeTrack: youtubeTracks[0],
                appleTrack: appleTracks[0],
                youtubePlaylistIndex: 1,
                applePlaylistIndex: 1
            }],
            removedTracks: [],
            addedTracks: []
        } : {
            matchedTracks: [],
            removedTracks: youtubeTracks,
            addedTracks: appleTracks
        });
    }
});

test('S.O.S matches SOS only when period filtering is enabled', () => {
    const first = { ...track, title: 'S.O.S' };
    const second = { ...track, title: 'SOS' };

    assert.equal(tracksMatch(first, second), false);
    assert.equal(tracksMatch(first, second, { ignorePeriods: false }), false);
    assert.equal(tracksMatch(first, second, { ignorePeriods: true }), true);
});

for (const field of ['title', 'artist', 'album']) {
    test(`ignoring periods applies to ${field} in either track`, () => {
        const withPeriods = { ...track, [field]: `.${track[field]}..` };
        const options = { ignorePeriods: true };

        assert.equal(tracksMatch(track, withPeriods, options), true);
        assert.equal(tracksMatch(withPeriods, track, options), true);
        assert.equal(tracksMatch(track, withPeriods, { ignorePeriods: false }), false);
    });
}

test('period filtering does not ignore other punctuation or metadata differences', () => {
    const first = { ...track, title: 'SOS' };
    const options = { ignorePeriods: true };

    for (const title of ['SOS?', 'SOS!', 'S O S', 'sos', 'SO']) {
        assert.equal(tracksMatch(first, { ...first, title }, options), false);
    }
    assert.equal(tracksMatch(first, { ...first, artist: null }, options), false);
    assert.equal(tracksMatch(first, { ...first, durationInMillis: 186000 }, options), true);
    assert.equal(tracksMatch(first, { ...first, durationInMillis: 186001 }, options), false);
});

test('period filtering composes with existing filters and remains independent of question marks', () => {
    const first = { ...track, title: 'SOS' };
    const second = {
        ...track,
        title: 's.o.s? (Live)',
        artist: '\u00c1rtist',
        album: 'Different album'
    };
    const options = {
        ignoreCapitalization: true,
        ignoreParentheticals: true,
        ignoreSpecialCharacters: true,
        ignoreAlbumMatching: true
    };

    assert.equal(tracksMatch(first, second, { ...options, ignorePeriods: true }), false);
    assert.equal(tracksMatch(first, second, { ...options, ignoreQuestionMarks: true }), false);
    assert.equal(tracksMatch(first, second, {
        ...options,
        ignorePeriods: true,
        ignoreQuestionMarks: true
    }), true);
});

test('toggling period filtering updates comparison results without changing the source title', () => {
    const youtubeTracks = [Object.freeze({ ...track, title: 'S.O.S' })];
    const appleTracks = [Object.freeze({ ...track, title: 'SOS' })];

    for (const ignorePeriods of [false, true, false]) {
        const result = compareTracklists(youtubeTracks, appleTracks, { ignorePeriods });

        assert.equal(result.matchedTracks.length, ignorePeriods ? 1 : 0);
        assert.deepEqual(result.removedTracks, ignorePeriods ? [] : youtubeTracks);
        assert.deepEqual(result.addedTracks, ignorePeriods ? [] : appleTracks);
        assert.equal(youtubeTracks[0].title, 'S.O.S');
    }
});
