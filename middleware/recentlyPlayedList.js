// recentlyPlayedList.js

function createRecentlyPlayedList(request, session, config) {
    log("POST /recentlyplayedlist: invoking CreateRecentlyPlayedList");

    // Get playlist settings from request body
    /*
        {
            "history_length": 50,
            "playlist_name": "PlaylistName",
            "access_token": "sampletoken"
        }
    */
    var requestBody = JSON.parse(request.Body);
    var historyLength = requestBody["history_length"];
    var playlistName = requestBody["playlist_name"];
    var accessToken = requestBody["access_token"];

    // TODO: Verify valid historyLength
    // TODO: Verify valid playlistName

    log("CreateRecentlyPlayedList: Length: " + historyLength + ", Playlist Name: " + playlistName);

    // Get list of recently played songs, with given history_length
    var getRecentlyPlayedSongs = {
        "requests": [
            {
                "method": "GET",
                "body": "",
                "headers": {"Authorization": "Bearer " + accessToken},
                "relative_url": "https://api.spotify.com/v1/me/player/recently-played?limit=" + historyLength
            }
        ],
        "suppress_parallel_execution": true
    };
    var getResponse = JSON.parse(TykBatchRequest(JSON.stringify(getRecentlyPlayedSongs)));

    log("Body: " + getResponse[0].body);
    log("Code: " + getResponse[0].code);

    var responseObject = {
        Body: "Sample response",
        Headers: {},
        Code: 200
    };

    log("POST /recentlyplayedlist: CreateRecentlyPlayedList finished, sending response");
    return TykJsResponse(responseObject, session.meta_data);
}