![SoftwareTheke GmbH](https://avatars.githubusercontent.com/u/162547559?s=200&v=4)

# @softwaretheke/express-plugin-winston

![workflow][workflow-badge]

The plugin connects [Express][express] with a [winston][winston] logger and enables requests and errors to be logged in a simple and flexible way.

## Installation

Use your favorite package manager to install the plugin in your project directory:

```bash
npm install @softwaretheke/express-plugin-winston
```

## Usage

In the following hello-world-example, only three lines of code are necessary to (1) import the plugin, (2) log requests and (3) log errors:

```js
// Import dependencies.
const express = require("express");
const winston = require("winston");
const winstonPlugin = require("@softwaretheke/express-plugin-winston"); // 1

// Create Express application.
const app = express();
const port = 3000;

// Create winston logger.
const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

// Use the plugin to log requests.
// If possible, it should be the first middleware
// to accurately determine the request duration.
app.use(winstonPlugin.logRequestsWith(logger)); // 2

// Implement your routes.
app.get("/path/of/endpoint", (req, res) => {
  res.send("Hello World!");
});

// Use the plugin to log errors.
// Put it right next to your error handlers.
// Under the hood, it is an error handler by itself.
app.use(winstonPlugin.logErrorsWith(logger)); // 3

// Implement your error handlers.
app.use((err, req, res, next) => {
  res.status(500).send("Sorry!");
});

// Start the server.
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
```

## Default Request Logs

If you don't provide any options, like in the hello-world-example above, each logged request results in a winston [info object][winston-info-object] of the following form:

```js
{
  level: "info",
  message: "200 25 GET /path/of/endpoint",
}
```

The message consists of four elements:

- HTTP Status Code
- Request Duration in Milliseconds
- HTTP Method
- Endpoint

## Default Error Logs

If you don't provide any options, like in the hello-world-example above, each logged error results in a winston [info object][winston-info-object] of the following form:

```js
{
  level: "error",
  message: "500 25 GET /path/of/endpoint",
}
```

The message consists of four elements:

- HTTP Status Code
- Request Duration in Milliseconds
- HTTP Method
- Endpoint

## Log Errors only

If you want to log errors only, but no requests, i.e. if you remove line `// 2` in the hello-world-example above, the duration of the request cannot be determined. In this case, the log message contains a `-` (dash) instead of the duration:

```js
{
  level: "error",
  message: "500 - GET /path/of/endpoint",
}
```

In order to get the duration, you have to retain request logging, i.e. line `// 2`, and pass the `silent` option to the plugin. This makes the plugin capture the start time, but suppresses logging the requests:

```js
app.use(winstonPlugin.logRequestsWith(logger, { silent: true }));
```

## Custom Request Logs

You can customize the levels and messages of the request logs by passing an options object as the second argument to the plugin:

```js
app.use(
  winstonPlugin.logRequestsWith(logger, {
    level: "warn",
    message: (req, res) => req.method,
  })
);
```

It is also possible to specify the log level using a function:

```js
app.use(
  winstonPlugin.logRequestsWith(logger, {
    level: (req, res) => (req.method === "GET" ? "info" : "warn"),
  })
);
```

If you want to include additional data into the request logs, use the meta option:

```js
app.use(
  winstonPlugin.logRequestsWith(logger, {
    meta: (req, res) => ({
      status: res.statusCode,
      millis: res.epwTotalMillis,
    }),
  })
);
```

The resulting object will be merged into the winston [info object][winston-info-object]:

```js
{
  level: "info",
  message: "200 25 GET /path/of/endpoint",
  status: 200,
  millis: 25
}
```

## Custom Error Logs

You can customize the levels and messages of the error logs by passing an options object as the second argument to the plugin:

```js
app.use(
  winstonPlugin.logErrorsWith(logger, {
    level: "warn",
    message: (err, req, res) => `${err.statusCode} ${err.message}`,
  })
);
```

It is also possible to specify the log level using a function:

```js
app.use(
  winstonPlugin.logErrorsWith(logger, {
    level: (err, req, res) => (err.statusCode === 503 ? "warn" : "info"),
  })
);
```

If you want to include additional data into the error logs, use the meta option:

```js
app.use(
  winstonPlugin.logErrorsWith(logger, {
    meta: (err, req, res) => ({
      status: err.statusCode,
      millis: res.epwTotalMillis,
    }),
  })
);
```

The resulting object will be merged into the winston [info object][winston-info-object]:

```js
{
  level: "error",
  message: "503 25 GET /path/of/endpoint",
  status: 503,
  millis: 25
}
```

## Log Request Duration

The plugin captures the duration in milliseconds of each request and stores it in the `res.epwTotalMillis` property. You can include the duration into your custom message or meta logs. The property is available when logging requests as well as errors:

```js
app.use(
  winstonPlugin.logRequestsWith(logger, {
    message: (req, res) => res.epwTotalMillis,
  })
);
```

If you want to [log errors only](#log-errors-only), but no requests, you have to retain request logging and pass the `silent` option to the plugin. This is necessary to make the plugin capture the duration of the requests:

```js
// Capture the start time of the request.
app.use(winstonPlugin.logRequestsWith(logger, { silent: true }));

// Implement your routes.
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Log errors including the request duration.
app.use(
  winstonPlugin.logErrorsWith(logger, {
    message: (err, req, res) => ({ millis: res.epwTotalMillis }),
  })
);
```

## Skip Request Logs

You can skip request logs by passing the silent option to the plugin:

```js
app.use(
  winstonPlugin.logRequestsWith(logger, {
    silent: (req, res) => req.method !== "POST", // Log only POST requests.
  })
);
```

If you want to disable request logging entirely:

```js
app.use(
  winstonPlugin.logRequestsWith(logger, {
    silent: true,
  })
);
```

## Skip Error Logs

You can skip error logs by passing the silent option to the plugin:

```js
app.use(
  winstonPlugin.logErrorsWith(logger, {
    silent: (err, req, res) => err.statusCode < 500, // Log only server errors.
  })
);
```

If you want to disable error logging entirely:

```js
app.use(
  winstonPlugin.logErrorsWith(logger, {
    silent: true,
  })
);
```

## Help

If you have any questions or found a bug, first take a look at the open and closed [issues][issues]. If you cannot find an answer, don't hesitate to get in touch and open a new issue. We are happy to help.

## License

MIT License

Copyright (c) 2024 SoftwareTheke GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[workflow-badge]: https://github.com/softwaretheke/express-plugin-winston/actions/workflows/node.js.yml/badge.svg
[express]: https://expressjs.com/
[winston]: https://www.npmjs.com/package/winston
[winston-info-object]: https://github.com/winstonjs/winston?tab=readme-ov-file#streams-objectmode-and-info-objects
[issues]: https://github.com/softwaretheke/express-plugin-winston/issues
