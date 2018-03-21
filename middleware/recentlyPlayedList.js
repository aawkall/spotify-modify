// recentlyPlayedList.js

function createRecentlyPlayedList(request, session, config) {
	log("POST /recentlyplayedlist: invoking CreateRecentlyPlayedList");
	var spotifyBaseApi = config.config_data.spotifyBaseApi;

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

	// TODO: Verify valid historyLength, set default if not in the json
	// TODO: Verify valid playlistName, set default if not in the json
	// TODO: Verify accessToken is given, fail if not

	log("CreateRecentlyPlayedList: Length: " + historyLength + ", Playlist Name: " + playlistName);

	// Get Spotify User ID
	var getUserIdResponse = singleBatchRequest("GET", "", accessToken,
		spotifyBaseApi + "/me");
	if (getUserIdResponse.code !== 200) {
		log ("GET via Spotify /me failed:\n" + getUserIdResponse.body);
		return response(getUserIdResponse.body, {}, getUserIdResponse.code, session);
	}

	// Get list of recently played songs, with given history_length
	var getRecentlyPlayedResponse = singleBatchRequest("GET", "", accessToken,
		spotifyBaseApi + "/me/player/recently-played?limit=" + historyLength);
	if (getRecentlyPlayedResponse.code !== 200) {
		log ("GET via Spotify /me/player/recently-played failed:\n" + getRecentlyPlayedResponse.body);
		return response(getRecentlyPlayedResponse.body, {}, getRecentlyPlayedResponse.code, session);
	}

	// Build list of track URIs to add
	var userId = JSON.parse(getUserIdResponse.body)["id"];
	var recentlyPlayed = JSON.parse(getRecentlyPlayedResponse.body).items;
	var uriList = [];
	for (var i = 0; i < recentlyPlayed.length; i++) {
		uriList.push(recentlyPlayed[i]["track"]["uri"]);
	}
	var trackUris = { "uris": uriList };

	// Create playlist with given name
	// TODO: Store messages in a constants file
	var createPlaylistBody = {
		"name": playlistName,
		"public": false,
		"collaborative": false,
		"description": "Created from recently played songs via spotify-modify"
	};
	var createPlaylistResponse = singleBatchRequest("POST", JSON.stringify(createPlaylistBody), accessToken,
		spotifyBaseApi + "/users/" + userId + "/playlists");
	if (createPlaylistResponse.code !== 201) {
		log ("POST via Spotify /users/{userId}/playlists failed:\n" + createPlaylistResponse.body);
		return response(createPlaylistResponse.body, {}, createPlaylistResponse.code, session);
	}

	// Get playlist link to return and id for adding songs
	var playlistJSON = JSON.parse(createPlaylistResponse.body);
	var playlistId = playlistJSON["id"];
	var playlistUrl = playlistJSON["external_urls"]["spotify"];

	// Add list of recently played songs to the new playlist
	var addTracksResponse = singleBatchRequest("POST", JSON.stringify(trackUris), accessToken,
		spotifyBaseApi + "/users/" + userId + "/playlists/" + playlistId + "/tracks");
	if (addTracksResponse.code !== 201) {
		log ("POST via Spotify /users/{userId}/playlists/{playlistId}/tracks failed:\n" + addTracksResponse.body);
		return response(addTracksResponse.body, {}, addTracksResponse.code, session);
	}

	// Return back JSON body with url to new playlist
	var responseBody = {
		"playlist_url": playlistUrl
	};
	log("POST /recentlyplayedlist: CreateRecentlyPlayedList finished, sending response");
	return response(JSON.stringify(responseBody), {}, 200, session);
}

function response(body, headers, code, session) {
	var responseObject = {
		Body: body,
		Headers: headers,
		Code: code
	};
	return TykJsResponse(responseObject, session.meta_data);
}

function singleBatchRequest(method, body, accessToken, url) {
	var requestObject = {
		"requests": [
			{
				"method": method,
				"body": body,
				"headers": { "Authorization": "Bearer " + accessToken },
				"relative_url": url
			}
		],
		"suppress_parallel_execution": true
	};
	return JSON.parse(TykBatchRequest(JSON.stringify(requestObject)))[0];
}
