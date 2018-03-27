# spotify-modify

A simple interface to fetch track history and create Spotify playlists, using Tyk virtual endpoints and the Spotify Web API.
- Tyk virtual endpoint to accept playlist requests and handle multiple API calls to Spotify
- node.js and mustache.js to render Tyk JavaScript files to enable includes, override Tyk methods for unit testing
- proxyquire to intercept http calls and mock API responses for testing via Mocha

### Tyk
Tyk virtual endpoints let you add custom JavaScript logic to their existing API gateway implementation, allowing the gateway to make decisions about http requests / responses before passing on, enabling retries, or pulling together multiple different APIs.

The main issue is that the endpoint JavaScript executed in the Tyk JavaScript engine - making unit testing difficult. And since it's not a true node.js-based implementation, there's no mechanism for including other source code files. So the full implementation of a virtual endpoint must live in one JS file, meaning any common code across multiple endpoints would have to be duplicated.

### Templates
Since Tyk doesn't allow us to include other JS files, we have to do it ourselves - as pre-processing before the files are loaded onto the Tyk node (docker container, in this case). I use the Mustache.js templating engine and the concept of partials - which allows you to "import" another mustache template - to accomplish this.

constants.partial.mustache -> template code to be included in the main virtual endpoint:
```js
// constants.partial.mustache
var defaultHistoryLength = 25;
var defaultPlaylistName = "RecentlyPlayedList_";
var playlistDescription = "Created from recently played songs via spotify-modify";
```

Main endpoint file, with the mustache syntax to include two common files (**{{<basename}}**, keyed by the basename of the file):
```js
// recently-played-list.mustache

{{>constants}}
{{>requests}}

function createRecentlyPlayedList(request, session, config) {
	log("POST /recentlyplayedlist: invoking CreateRecentlyPlayedList");
```

The render script goes through each of the common files to be included and loads each into a JSON object, with the key as the basename of the file ("constants", "requests") and the value as the full String text read from the file. Then, a call to Mustache.render() replaces each instance of the {{>basename}} tags with the file text, and saves the final outputted JavaScript file into the build directory.
See [spotify-modify/mustache-build-includes.js](https://github.com/aawkall/spotify-modify/blob/master/mustache-build-includes.js)

Only these built files are included in the Docker build - effectively letting us keep files separate and reuse code in the repo, but still keep the single-file format needed for Tyk when running.

### Testing
While the virtual endpoint files are node.js-based, they run in the Tyk engine - meaning we don't have access to Tyk native methods when running unit tests. Using the templating method above, I can define the Tyk libraries locally, redirecting them to modules that we do have access to when running via node.js and Mocha:
```js
function log(message) {
	console.log("      " + message);
}
function TykBatchRequest(requestObject) {
	var batchRequest = JSON.parse(requestObject).requests[0];

	// Make synchronous http call and return response
	var response = request(batchRequest.method, batchRequest.relative_url, {
		headers: batchRequest.headers,
		body: batchRequest.body
	});
	return JSON.stringify([{"code": response.statusCode, "body": response.body.toString("utf8")}]);
}

{{>recently-played-list}}

module.exports.createRecentlyPlayedList = createRecentlyPlayedList;
```
This lets us take the built Tyk endpoint JS from above and put the redefined modules around it; sending Tyk's log to console.log, and Tyk's batch request library to requests via sync-requests. Additionally I can add the module.exports line, so that my createRecentlyPlayedList method is avaiable to be required by my tests.

For unit testing, I additionally use proxyquire to intercept calls to sync-requests and mock the http responses based on the API requested and payload sent. In future functional or E2E tests, I could omit the proxyquire intercept and let sync-requests make http calls as Tyk would.
See [test/recently-played-list.js](https://github.com/aawkall/spotify-modify/blob/master/test/recently-played-list.js)


### Dependencies
spotify-modify depends on a number of open source projects:
- [Tyk.io](https://tyk.io/) - API gateway via JavaScript virtual API endpoints
- [node.js](https://nodejs.org/) - JS to render mustache templates for includes and unit testing
- [mustache.js](https://github.com/janl/mustache.js/) - templating library to enable includes and override Tyk endpoint JS methods
- [Docker](https://www.docker.com) - running the Tyk Gateway version via the base Docker image, tykio/tyk-gateway
- [Mocha](https://mochajs.org/) and [Chai](http://www.chaijs.com/) - JavaScript unit testing and assertion library for testing Tyk virtual endpoints
- [sync-request](https://www.npmjs.com/package/sync-request) - synchronous http library for node.js to simulate Tyk's synchronous virtual endpoint flow
- [proxyquire](https://github.com/thlorenz/proxyquire) - JS library to intercept "require" calls to mock http calls in endpoint unit testing
- [nyc](https://github.com/istanbuljs/nyc) - Istanbul command line interface for JS code coverage
- [JSHint](http://jshint.com/) - JS linter

spotify-modify uses the Spotify Web API to access user history, track information, and create playlists:
[Spotify Web API](https://developer.spotify.com/web-api/)

#### Installation
If you want to install spotify-modify and try it out yourself, first install both [Docker](https://store.docker.com/search?offering=community&type=edition) and [node.js](https://nodejs.org/en/download/).
Download the latest source, install the dependencies, and build the project:
```sh
$ cd spotify-modify
$ npm install
$ npm run build
```
Build the docker image for the project, naming the image spotify-modify-tyk. tykio/tyk-gateway will download as a dependent image.
```
$ docker build . -t spotify-modify-tyk
```
Bring up the tyk and redis containers (redis image will download):
```
docker-compose -f spotify-modify.yml up -d
```
#### How to Use
The spotify-modify docker container will be listening on http://localhost:8199. At this time, only the /recentlyplayedlist API is available. Using a tool like Postman or curl, send a request to the URL:
```
POST http://localhost:8199/recentlyplayedlist
```
with the payload in the format of
```json
{
    "history_length": "50",
    "playlist_name": "Songs from Last Night's Party",
    "access_token": "BQfTAzaMWqCUkUSW4L3fJyd5cJvRn5Re1SCLkIy"
}
```
| Plugin | README |
| ------ | ------ |
| history_length | Length of playlist that will be created, 1 or greater and no greater than 50. Defaults to 25  |
| playlist_name | Name of playlist to be created. Defaults to "RecentlyPlayedList_$history_length" |
| access_token | Access token received from the Spotify API after authenticating with a valid user. Must have **user-read-recently-played** and **playlist-modify-private** scopes. See [Spotify Authorization Guide](https://beta.developer.spotify.com/documentation/general/guides/authorization-guide/) |
Note - history_length and playlist_name are optional and have defaults, but access_token is required or spotify-modify will not be authorized to create playlists against a user account (and won't be pointing to any user account either).
Spotify-modify also assumes that the Tyk endpoint is running in a secure backend with the access token generated separately and passed in; there is no preprocessing on the playlist name provided, or generation of the authentication token itself via username/password

### Todos
 - Add additional endpoints:
 -- Add artist's top tracks
 -- Add tracks pulled from an artists past setlists via Setlist.fm
 -- Add tracks for a set of artists, gathered from the user's playlists, followed playlists, and recently played tracks
 - Add simple front end that can authenticate and generate the access token
 - Add E2E tests that extend the current unit tests and test against the live Spotify API on new commits

### License
MIT

