// mustache-build-includes.js
// Render includes in middleware/*.mustache files with common partials

const commander = require("commander");
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const mustache = require("mustache");

// If --test-compile (-t) flag is given, additionally apply the template to enable mocha unit testing
commander.option('-t, --test-compile', 'Test compile').parse(process.argv);

// Create output directories
mkdirp.sync("build/middleware");
if (commander.testCompile) {
	mkdirp.sync("build/test/middleware");
}

// Get list of partial files in middleware/common
var commonPartials = {};
var commonFiles = fs.readdirSync("middleware/common");
for (let i = 0; i < commonFiles.length; i++) {
	var commonFile = commonFiles[i];
	if (commonFile.match(".partial.mustache")) {

		// Add the contents of each file to the partials JSON object
		var basename = path.basename(commonFile, ".partial.mustache");
		commonPartials[basename] = fs.readFileSync("middleware/common/" + commonFile, { encoding: 'utf8' }) + "\n";
	}
}

// Get list of files in middleware directory with .mustache
var middlewareFiles = fs.readdirSync("middleware");
for (let i = 0; i < middlewareFiles.length; i++) {
	var middlewareFile = middlewareFiles[i];
	if (middlewareFile.match(".mustache")) {

		// Render each file and output to build/middleware
		var builtMiddleware = mustache.render(
			fs.readFileSync("middleware/" + middlewareFile, { encoding: 'utf8' }), {}, commonPartials);
		var middlewareBasename = path.basename(middlewareFile, ".mustache");
		var jsFile = "build/middleware/" + middlewareBasename + ".js";
		fs.writeFileSync(jsFile, builtMiddleware, { encoding: 'utf8' });
		console.log("Rendered " + middlewareFile + " -> " + jsFile);

		// Render test files (adding module.exports to expose methods for testing)
		if (commander.testCompile) {
			var testPartials = {};
			testPartials[middlewareBasename] = builtMiddleware;
			var builtTestMiddleware = mustache.render(
				fs.readFileSync("test/templates/" + middlewareBasename + "-mocha.mustache", { encoding: 'utf8' }), {}, testPartials);
			var testJsFile = "build/test/middleware/" + middlewareBasename + ".js";
			fs.writeFileSync(testJsFile, builtTestMiddleware, { encoding: 'utf8' });
			console.log("Additionally rendered " + jsFile + " -> test-ready version " + testJsFile);
		}
	}
}