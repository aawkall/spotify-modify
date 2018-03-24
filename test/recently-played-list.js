// recently-played-list unit tests
const expect = require("chai").expect;
const proxyquire = require("proxyquire");

// const recentlyPlayedList = require("../build/test/middleware/recently-played-list.js");
const testConstants = require("./utils/test-constants.js");

describe('recently-played-list', function() {
	describe('createRecentlyPlayedList()', function() {

		it('should return 400 Bad Request if access_token is not provided', function() {
			var request = {
				"Body": JSON.stringify({
					"history_length": 10,
					"playlist_name": "TestPlaylist"
				})
			};
			var session = { "meta_data": "" };
			var config = {
				"config_data": {
					"spotifyBaseApi": testConstants.unitTest.spotifyBaseApi
				}
			};

			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": {
					// No request mocks
				}
			});

			// Create playlist with missing access_token; verify response code = 400
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(request, session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(400);
		});

		it('should return 401 Unauthorized when Spotify indicates the access token is invalid', function() {
			var request = {
				"Body": JSON.stringify({
					"history_length": 10,
					"playlist_name": "TestPlaylist",
					"access_token": "accesstoken"
				})
			};
			var session = { "meta_data": "" };
			var config = {
				"config_data": {
					"spotifyBaseApi": testConstants.unitTest.spotifyBaseApi
				}
			};

			// Mock Spotify returning a 401 Unauthorized
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					if (method === "GET" && url === testConstants.unitTest.spotifyBaseApi + "/me") {
						return { "statusCode": 401, "body": "Invalid access token" };
					}
				}
			});

			// Create playlist, expecting 401 back from Spotify
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(request, session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(401);
		});

		it('should return 500 Internal Server Error on unexpected error on GET /me', function() {
			var request = {
				"Body": JSON.stringify({
					"history_length": 10,
					"playlist_name": "TestPlaylist",
					"access_token": "accesstoken"
				})
			};
			var session = { "meta_data": "" };
			var config = {
				"config_data": {
					"spotifyBaseApi": testConstants.unitTest.spotifyBaseApi
				}
			};

			// Mock Spotify returning a 401 Unauthorized
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					if (method === "GET" && url === testConstants.unitTest.spotifyBaseApi + "/me") {
						return { "statusCode": 403, "body": "Forbidden" };
					}
				}
			});

			// Create playlist, expecting 401 back from Spotify
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(request, session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
		});
	});
});