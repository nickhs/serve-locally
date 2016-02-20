# serve-locally
[![Build Status](https://travis-ci.org/nickhs/serve-locally.svg?branch=master)](https://travis-ci.org/nickhs/serve-locally)

Express middleware.

When defined, takes requests and checks the configured root folder for matching JSON responses
based on the url path and files/folders in the root folder.

Responds with the JSON response in matching file.

## Installation

```sh
$ npm install serve-locally
```

Uses ES6 features and requires NodeJS 5.6.x and above.

## Example

Refer to the [test/server.js][serverjs] and matching directories.

## API

```js
const serveLocally = require('serve-locally');
const app = require('express')();

app.use(serveLocally({'root': './sample_responses'}));
```

### serveLocally(opts)

- `options` options to configure the middleware
    - `root` where to search for the responses. Defaults to `.`

### Resolution Logic

Refer to the documentation in [index.js][indexjs] for the resolution logic and caveats.

### LICENSE

MIT

[serverjs]: https://github.com/nickhs/serve-locally/blob/master/test/server.js
[indexjs]: https://github.com/nickhs/serve-locally/blob/master/index.js
