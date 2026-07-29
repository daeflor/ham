
function getDataArray(apiResponse) {
    return apiResponse?.data?.data ?? [];
}

function getNextUrl(apiResponse) {
    return apiResponse?.data?.next ?? null;
}

export async function fetchLibraryPlaylists(musicKit) {
    const response = await musicKit.api.music('v1/me/library/playlists?limit=100');
    return getDataArray(response);
}

export async function fetchPlaylistTracks(musicKit, playlistId) {
    const safePlaylistId = encodeURIComponent(playlistId);
    let allTracks = [];
    let nextUrl = `v1/me/library/playlists/${safePlaylistId}/tracks?limit=100`;

    while (nextUrl) {
        const response = await musicKit.api.music(nextUrl);
        const tracks = getDataArray(response);
        allTracks = allTracks.concat(tracks);

        nextUrl = getNextUrl(response);
    }

    return allTracks;
}
