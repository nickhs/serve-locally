/*!
 * serve-locally
 * Take a request and looks to see if it can find a local
 * JSON resource to return as a response.
 *
 * Useful for mocking out backend services for frontend UI
 * development.
 *
 * Takes a url and performs the following lookups:
 *
 *  * Takes the url path, replacing / with _, for example:
 *
 *      /foo/bar/resource
 *
 *    Would be searched for in:
 *
 *      /foo_bar_resource.json
 *
 *  * Takes the url path and searches directories for resource. For example:
 *
 *      /foo/bar/resource
 *
 *    Would be searched for in:
 *
 *      /foo/bar/resource.json
 *
 * How are URL query parameters handled?
 * If a URL query parameter is included, all matches as defined in the section
 * above are taken. From there the filename is split on ? and the query params are
 * turned into a dictionary. At that point the filename with the most matches is selected.
 * If there are an equal number of matches the behaviour is undefined. For example:
 *
 * A request is received like:
 *
 *  /foo/bar/resource?a=1&b=2&clientId=a1b2c34d
 *
 * and we find the following two files:
 *
 *  /foo_bar_resource.json
 *  /foo_bar_resource?a=1.json
 *  /foo_bar_resource?a=1&b=not2.json
 *  /foo_bar_resource?a=1&b=2.json
 *
 *  Then the "most" matching response is selected:
 *
 *  /foo_bar_resource?a=1&b=2.json
 *
 *  Despite the resource not matching the query params exactly.
 *
 *  An incorrect query paramater (e.g. b=not2) will never be matched, unless
 *  no other resources exist for that path.
 */

'use strict';

const pathLib = require('path');
const querystring = require('querystring');
const fs = require('fs');

module.exports = serveLocally;
module.exports.locateFilePath = locateFilePath;

let logger = () => {};

function serveLocally(opts) {
    if (!opts) opts = {};

    if (typeof opts.logger == 'function') {
        logger = opts.logger;
    } else if (opts.logger == true) {
        logger = console.log
    }

    let root = '.';

    if (opts.root) {
        root = opts.root;
    }

    return function serveLocally(req, res, next) {
        let filePath;
        try {
            filePath = locateFilePath(req.path, req.query, root);
        } catch(err) {}

        if (!filePath) {
            logger("Could not find match for",
                   pathLib.resolve(pathLib.join(root, req.path)));
            return next();
        }

        // if we got a file path back load that sucker up
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return next();
            }

            try {
                data = JSON.parse(data);
            } catch (err) {
                logger("Could not parse json from", filePath, err);
                return next();
            }

            logger("Responding with data from", filePath);
            res.json(data);
        });
    }
};

function locateFilePath(path, queryParams, root) {
    // strip the first /
    if (path[0] == '/') {
        path = path.substring(1, path.length);
    }

    // turn the path into an array of folders
    path = path.split('/');

    // find the folder where the resources are in
    let position = root;
    while (path.length > 1) {
        let directory = match(path.shift(), position);
        position = pathLib.join(position, directory);

        // check if it's actually a directory
        let stats = fs.statSync(position);
        if (!stats.isDirectory()) {
            throw new Error(`match ${position} is not a directory`);
        }
    }

    // cool position is the containing folder
    // get all the files and find the best match
    let files = fs.readdirSync(position).map((f) => {
        return pathLib.join(position, f);
    });

    // get only files
    files = files.filter((f) => {
        let stats = fs.statSync(f);
        return stats.isFile();
    });

    // convert them into objects
    files = files.map(parseFilename).filter((x) => x);

    // determine the best match
    let potentialMatches = files.filter((f) => {
        return f.nameStripped == path[path.length - 1];
    });

    // these all match on names - if we have a query param
    // we need to try and fuzzy match on that.
    potentialMatches = potentialMatches.map((m) => {
        return {
            'item': m,
            'count': fuzzyEqual(queryParams, m.query)
        };
    })
    .filter((m) => m.count != -1)
    .sort((a, b) => a.count < b.count);

    if (potentialMatches.length > 0) {
        return pathLib.format(potentialMatches[0].item);
    }
}

function match(pathFragment, currentDirectory) {
    let files = fs.readdirSync(currentDirectory);
    let pathMatch = files.find((file) => {
        return file == pathFragment;
    });

    if (!pathMatch) {
        throw new Error(`Could not find match for ${pathFragment} in ${currentDirectory}`);
    }

    return pathMatch;
}

/**
 * Extract the filename, extension and
 * query string from every file
 */
function parseFilename(filename) {
    // ignore hidden files/folers
    if (filename[0] == '.') {
        return;
    }

    let ret = pathLib.parse(filename);

    // extract the query string
    ret.nameStripped = ret.name.split('?')[0];
    let queryString = ret.name.split('?')[1];

    // parse the query string
    ret.query = querystring.parse(queryString);
    return ret;
}

/**
 * Does a single level match between A and B
 * where it retuns a count is the number of keys that
 * matched.
 *
 * Returns -1 on no match.
 */
function fuzzyEqual(actual, matching) {
    let matchCount = 0;

    if (!actual) { // no query params
        if (!matching || Object.keys(matching) == 0) return 0;
        return -1;
    }

    for (let key in actual) {
        let matchingValue = matching[key];

        if (!matchingValue) continue; // does that key exist in the actual?

        // does the value in matching match that in actual?
        if (matchingValue != actual[key]) {
            return -1;
        }

        matchCount += 1;
    }

    // prefer the shortest item
    if (matchCount > 0 && Object.keys(matching).length > Object.keys(actual).length) {
        let temp = matchCount - (Object.keys(matching).length - Object.keys(actual).length);
        matchCount = Math.max(temp, 0.5);
    }

    return matchCount;
}
