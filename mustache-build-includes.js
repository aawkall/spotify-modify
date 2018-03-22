// mustache-build-includes.js
// Render includes in middleware/*.mustache files with common partials

const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const mustache = require("mustache");

// Create build/middleware directory
mkdirp.sync("build/middleware");

// Get list of partial files in middleware/common
var commonPartials = {};
var commonFiles = fs.readdirSync("middleware/common");
for (var i = 0; i < commonFiles.length; i++) {
	var commonFile = commonFiles[i];
	if (commonFile.match(".partial.mustache")) {

		// Add the contents of each file to the partials JSON object
		var basename = path.basename(commonFile, ".partial.mustache");
		commonPartials[basename] = fs.readFileSync("middleware/common/" + commonFile, { encoding: 'utf8' });
	}
}

// Get list of files in middleware directory with .mustache
var middlewareFiles = fs.readdirSync("middleware");
for (var i = 0; i < middlewareFiles.length; i++) {
	var middlewareFile = middlewareFiles[i];
	if (middlewareFile.match(".mustache")) {

		// Render each file and output to build/middleware
		var builtMiddleware = mustache.render(
			fs.readFileSync("middleware/" + middlewareFile, { encoding: 'utf8' }), {}, commonPartials);
		var jsFile = "build/middleware/" + path.basename(middlewareFile, ".mustache") + ".js";
		fs.writeFileSync(jsFile, builtMiddleware, { encoding: 'utf8' });
		console.log("Rendered " + middlewareFile + " -> " + jsFile);
	}
}