// recently-played-list unit tests
const expect = require("chai").expect;
const proxyquire = require("proxyquire");

const testConstants = require("./utils/test-constants.js");
const testUtils = require("./utils/test-utils.js");

// Test constants
const config = testConstants.unitTest.config;
const session = testConstants.unitTest.session;
const spotifyUrl = config.config_data.spotifyBaseApi;

describe('recently-played-list', function() {

	describe('createRecentlyPlayedList() -- failure cases', function() {

		it('should return status code 400 when access_token is not provided or empty', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				// No request mocks
				"sync-request": {}
			});

			// Create playlist with missing access_token; verify response code = 400
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(undefined, undefined, undefined), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(400);
			expect(recentlyPlayedListResponse.Body).to.contain("access_token for the current user is required");

			// Create playlist with empty access_token; verify response code is also 400
			recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(undefined, undefined, ""), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(400);
			expect(recentlyPlayedListResponse.Body).to.contain("access_token for the current user is required");
		});

		it('should return status code 400 when history_length is not between 1 and 40 inclusive', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				// No request mocks
				"sync-request": {}
			});

			// Create playlist with invalid history_length; verify response code = 400
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(100, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(400);
			expect(recentlyPlayedListResponse.Body).to.contain("history_length must be between 1 and 50 inclusive");
		});

		it('should return status code 401 when Spotify indicates the access token is invalid', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning 401 Unauthorized when getting userID
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 401, "body": "Invalid access token" };
					}
				}
			});

			// Create playlist with "unauthorized" token; verify response code = 401
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(401);
		});

		it('should return status code 500 on unexpected error from GET /me', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning an unexpected error when getting userID - 403 Forbidden
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 403, "body": "403 Forbidden" };
					}
				}
			});

			// Create playlist with http mocks; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
			expect(recentlyPlayedListResponse.Body).to.contain("GET via Spotify /me failed");
		});

		it('should return status code 500 on unexpected error from GET /me/player/recently-played', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning successful response when getting userID - 200 OK
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 200, "body": JSON.stringify({ "id": "testUserId" }) };
					}
					// Mock Spotify returning an unexpected error when getting recently played songs - 403 Forbidden
					if (method === "GET" && url.startsWith(spotifyUrl + "/me/player/recently-played?limit=")) {
						return { "statusCode": 403, "body": "403 Forbidden" };
					}
				}
			});

			// Create playlist with http mocks; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
			expect(recentlyPlayedListResponse.Body).to.contain("GET via Spotify /me/player/recently-played failed");
		});

		it('should return status code 500 if list returned from GET /me/player/recently-played is empty', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning successful response when getting userID - 200 OK
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 200, "body": JSON.stringify({ "id": "testUserId" }) };
					}
					// Mock Spotify returning an empty list when getting recently played songs - 403 Forbidden
					if (method === "GET" && url.startsWith(spotifyUrl + "/me/player/recently-played?limit=")) {
						return { "statusCode": 200, "body": JSON.stringify({ "items": [] }) };
					}
				}
			});

			// Create playlist with http mocks; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
			expect(recentlyPlayedListResponse.Body).to.contain("length of returned list did not match requested length");
		});

		it('should return status code 500 if list.length returned from GET /me/player/recently-played does not match history-length', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning successful response when getting userID - 200 OK
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 200, "body": JSON.stringify({ "id": "testUserId" }) };
					}
					// Mock Spotify returning a list with length = 2 when getting recently played songs - 403 Forbidden
					if (method === "GET" && url.startsWith(spotifyUrl + "/me/player/recently-played?limit=")) {
						return { "statusCode": 200, "body": JSON.stringify({ "items": [{"name": "item1"}, {"name": "item2"}] }) };
					}
				}
			});

			// Create playlist with http mocks; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
			expect(recentlyPlayedListResponse.Body).to.contain("length of returned list did not match requested length");
		});

		it('should return status code 500 on unexpected error from POST /users/{userId}/playlists', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning successful response when getting userID - 200 OK
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 200, "body": JSON.stringify({ "id": "testUserId" }) };
					}
					// Mock Spotify returning a successful response with list when getting recently played songs - 200 OK
					if (method === "GET" && url.startsWith(spotifyUrl + "/me/player/recently-played?limit=")) {
						// Build list of tracks with URIs
						var trackList = [];
						for (let i = 0; i < 10; i++) {
							trackList[i] = { "track": { "uri": "uri" + i }};
						}
						return { "statusCode": 200, "body": JSON.stringify({ "items": trackList }) };
					}
					// Mock Spotify returning an unexpected error when creating a playlist - 403 Forbidden
					if (method === "POST" && url === spotifyUrl + "/users/testUserId/playlists") {
						return { "statusCode": 403, "body": "403 Forbidden" };
					}
				}
			});

			// Create playlist with http mocks; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
			expect(recentlyPlayedListResponse.Body).to.contain("POST via Spotify /users/{userId}/playlists failed");
		});

		it('should return status code 500 on unexpected error from POST /users/{userId}/playlists/{playlistId}/tracks', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning successful response when getting userID - 200 OK
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 200, "body": JSON.stringify({ "id": "testUserId" }) };
					}
					// Mock Spotify returning a successful response with list when getting recently played songs - 200 OK
					if (method === "GET" && url.startsWith(spotifyUrl + "/me/player/recently-played?limit=")) {
						// Build list of tracks with URIs
						var trackList = [];
						for (let i = 0; i < 10; i++) {
							trackList[i] = { "track": { "uri": "uri" + i }};
						}
						return { "statusCode": 200, "body": JSON.stringify({ "items": trackList }) };
					}
					// Mock Spotify returning a successful response when creating the playlist - 201 created
					if (method === "POST" && url === spotifyUrl + "/users/testUserId/playlists") {
						return { "statusCode": 201, "body": JSON.stringify(
							{ "id": "testPlaylistId", "external_urls": { "spotify": "externalPlaylistUrl" }}) };
					}
					// Mock Spotify returning an unexpected error when adding songs to the playlist - 403 Forbidden
					if (method === "POST" && url === spotifyUrl + "/users/testUserId/playlists/testPlaylistId/tracks") {
						return { "statusCode": 403, "body": "403 Forbidden" };
					}
				}
			});

			// Create playlist with http mocks; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
			expect(recentlyPlayedListResponse.Body).to.contain("POST via Spotify /users/{userId}/playlists/{playlistId}/tracks failed");
		});
	});

	describe('createRecentlyPlayedList() -- success cases', function() {

		it('should return status code 201 and the playlist URL when playlist is successfully created', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning successful response when getting userID - 200 OK
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 200, "body": JSON.stringify({ "id": "testUserId" }) };
					}
					// Mock Spotify returning a successful response with list when getting recently played songs - 200 OK
					if (method === "GET" && url.startsWith(spotifyUrl + "/me/player/recently-played?limit=")) {
						// Build list of tracks with URIs
						var trackList = [];
						for (let i = 0; i < 10; i++) {
							trackList[i] = { "track": { "uri": "uri" + i }};
						}
						return { "statusCode": 200, "body": JSON.stringify({ "items": trackList }) };
					}
					// Mock Spotify returning a successful response when creating the playlist - 201 created
					if (method === "POST" && url === spotifyUrl + "/users/testUserId/playlists") {
						return { "statusCode": 201, "body": JSON.stringify(
							{ "id": "testPlaylistId", "external_urls": { "spotify": "externalPlaylistUrl" }}) };
					}
					// Mock Spotify returning a successful response when adding songs to the playlist - 201 created
					if (method === "POST" && url === spotifyUrl + "/users/testUserId/playlists/testPlaylistId/tracks") {
						return { "statusCode": 201, "body": "" };
					}
				}
			});

			// Create playlist with http mocks; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(201);
			expect(recentlyPlayedListResponse.Body).to.contain("playlist_url");
		});

		it('should return status code 201 and the playlist URL when playlist is created with all defaults', function() {

			// Import recently-played-list.js via proxyquire, to enable request overrides
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					// Mock Spotify returning successful response when getting userID - 200 OK
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 200, "body": JSON.stringify({ "id": "testUserId" }) };
					}
					// Mock Spotify returning a successful response with list when getting recently played songs - 200 OK
					if (method === "GET" && url.startsWith(spotifyUrl + "/me/player/recently-played?limit=")) {
						// Build list of tracks with URIs - 25 since we are using the default settings
						var trackList = [];
						for (let i = 0; i < 25; i++) {
							trackList[i] = { "track": { "uri": "uri" + i }};
						}
						return { "statusCode": 200, "body": JSON.stringify({ "items": trackList }) };
					}
					// Mock Spotify returning a successful response when creating the playlist - 201 created
					if (method === "POST" && url === spotifyUrl + "/users/testUserId/playlists") {
						return { "statusCode": 201, "body": JSON.stringify(
							{ "id": "testPlaylistId", "external_urls": { "spotify": "externalPlaylistUrl" }}) };
					}
					// Mock Spotify returning a successful response when adding songs to the playlist - 201 created
					if (method === "POST" && url === spotifyUrl + "/users/testUserId/playlists/testPlaylistId/tracks") {
						return { "statusCode": 201, "body": "" };
					}
				}
			});

			// Create playlist, only passing in the access token; verify response code = 500
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(undefined, undefined, "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(201);
			expect(recentlyPlayedListResponse.Body).to.contain("playlist_url");
		});
	});
});