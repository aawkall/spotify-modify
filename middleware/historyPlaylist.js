// historyPlaylist.js

function createHistoryPlaylist(request, session, config) {
    log("POST /historyplaylist: invoking CreateHistoryPlaylist");

    var responseObject = {
        Body: "Sample response back from createHistoryPlaylist",
        Headers: {
            "Header1": "value1",
            "Header2": "value2"
        },
        Code: 200
    };

    log("POST /historyplaylist: CreateHistoryPlaylist finished, sending response");
    return TykJsResponse(responseObject, session.meta_data);
}
