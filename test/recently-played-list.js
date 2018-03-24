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
	describe('createRecentlyPlayedList()', function() {

		it('should return 400 Bad Request if access_token is not provided or empty', function() {

			// No request mocks
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": {}
			});

			// Create playlist with missing access_token; verify response code = 400
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(undefined, undefined, undefined), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(400);

			// Create playlist with empty access_token; verify response code is also 400
			recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(undefined, undefined, ""), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(400);
		});

		it('should return 400 Bad Request if history_length is not between 1 and 40 inclusive', function() {

			// No request mocks
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": {}
			});

			// Create playlist with invalid history_length; verify response code = 400
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(100, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(400);
		});

		it('should return 401 Unauthorized when Spotify indicates the access token is invalid', function() {

			// Mock Spotify returning a 401 Unauthorized
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 401, "body": "Invalid access token" };
					}
				}
			});

			// Create playlist with "unauthorized" token, expecting 401 back from Spotify
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(401);
		});

		it('should return 500 Internal Server Error on unexpected error on GET /me', function() {

			// Mock Spotify returning an unexpected error - 403 Forbidden
			var recentlyPlayedList = proxyquire("../build/test/middleware/recently-played-list.js", {
				"sync-request": function(method, url, json) {
					if (method === "GET" && url === spotifyUrl + "/me") {
						return { "statusCode": 403, "body": "Forbidden" };
					}
				}
			});

			// Create playlist, expecting 500 back from Spotify
			var recentlyPlayedListResponse = recentlyPlayedList.createRecentlyPlayedList(
				testUtils.buildRequest(10, "TestPlaylist", "accesstoken"), session, config);
			expect(recentlyPlayedListResponse.Code).to.equal(500);
		});
	});
});