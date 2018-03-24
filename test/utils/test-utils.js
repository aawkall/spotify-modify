// test-utils.js
function buildRequest(historyLength, playlistName, accessToken) {

	// Omit fields from json if undefined, otherwise add, if even ""
	var jsonBody = {};
	if (historyLength !== undefined) {
		jsonBody.history_length = historyLength;
	}
	if (playlistName !== undefined) {
		jsonBody.playlist_name = playlistName;
	}
	if (accessToken !== undefined) {
		jsonBody.access_token = accessToken;
	}

	var request = {
		"Body": JSON.stringify(jsonBody)
	};
	// TODO: make this use bunyan
	console.log("      Building request body: " + request.Body);
	return request;
}

module.exports.buildRequest = buildRequest;