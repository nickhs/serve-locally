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

function serveLocally(opts) {
    if (!opts) opts = {};

    return function serveLocally(req, res, next) {
        let filePath = locateFilePath(req.path, req.query, opts);

        // if we got a file path back load that sucker up
        if (!filePath) {
            return next();
        }

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return next();
            }

            try {
                data = JSON.parse(data);
            } catch (err) {
                return next();
            }

            res.json(data);
        });
    }
};

function locateFilePath(path, queryParams, opts) {
    let root = '.';

    if (opts.root) {
        root = opts.root;
    }

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

    if (potentialMatches.length > 0) {
        return pathLib.format(potentialMatches[0]);
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
