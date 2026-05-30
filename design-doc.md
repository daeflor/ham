Landing page:
    - Simple landing page 
    - Includes a simple title and description/subtitle
    - Includes a button to show all Apple Music playlists

Main page:
    - Includes a button in the top right for user to sign into Google Firebase; if user is already signed in, should indicate which user
    - Shows a list of all Apple Music playlists; each item in the list can be selected
        - Could be a column on a left-side pane
        - Each playlist includes its name
        - If a playlist has been marked as "transferred", then include a green checkmark badge to the right of the playlist name (right-aligned)
    - Selecting a playlist will reveal additional options (can use icons and hover text instead of long text buttons)
        - To the right of the playlist name (right-aligned), a "transfer" button
            - When the button is selected and/or the playlist is marked as "transferred", the button is hidden and a green "transferred" badge appears instead. This also applies the green checkmark in the playlists list.
        - Show list of tracks in Apple Music playlist
        - Show equivalent tracklist from YouTube Music
            - Disabled unless user has signed into Google Firebase
        - Show comparison between YouTube Music and Apple Music version of playlists 
            - Disabled unless user has signed into Google Firebase
            - Selecting this button should fetch both the Apple Music and YouTube Music tracklists if they have not been previously cached (i.e. the user should not have to select the other action buttons before this one)
    
Tracklist view:
    - Probably not a separate page
    - Include track title, artist, album, length
    - Show 50 tracks at a time; include "next"/"previous" buttons to show more
    - Include a copy to clipboard button, which will copy the full tracklist (not just 50 tracks)

Comparison view: 
    - Probably not a separate page
    - An "ignore capitalization" checkbox
    - "Removed" tracks on the left; "Added" tracks on the right
    - "Removed" and "Added" tracks are determined based on a metadata comparison check. 
        - A track in the YouTube Music playlist which doesn't have a match in Apple Music will be in the "Removed" section
        - A track in the Apple Music playlist which doesn't have a match in YouTube Music will be in the "Added" section
    - Each track includes title, artist, album, length, and index (its position in its playlist, starting with 1)
    - Each track includes a checkbox which will give it a green background color. (Clicking anywhere on the track element will toggle the checkbox and "select" or "unselect" it this way).
    - List the total number of "Removed" and "Added" tracks
    - Include a copy to clipboard button, which will copy the full "Removed" and "Added" lists side-by-side
    - Scroll behavior: trackpad scrolling affects both Added & Removed columns together. But each column has up and down arrow buttons to scroll that column individually by one track element/row.

Comparison logic notes:
    - By defualt, in order to consider two tracks as matching, their titles, artists, and albums must match exactly. The duration can vary by up to 3 seconds and still be considered a match.
    - If "ignore capitalization" is enabled, then capitalization is ignored for matching

General app usage & architecture notes:
    - This app is only going to be used by me / the developer. It doesn't need overly defensive checks for edge cases that are purely hypothetical or exploitable. The UI can be minimal and functional, and doesn't need to be flashy or overly attention-grabbing. 
    - The app isn't intended or planned to be used on mobile / small screens.