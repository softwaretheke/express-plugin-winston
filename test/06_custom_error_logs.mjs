/**
 * @softwaretheke/express-plugin-winston
 *
 * Copyright (c) 2024 SoftwareTheke GmbH
 *
 * Stefan Beer <technik@software-theke.de>
 *
 * MIT Licensed
 */

import express from "express";
import winston from "winston";
import winstonPlugin from "../dist/index.js";
import createError from "http-errors";
import assume from "assume";
import fs from "fs";

describe("Custom Error Logs:", () => {
  describe("When custom options are provided and the request fails,", () => {
    it("then a custom error message is written.", async () => {
      const app = express();
      const port = 3550;
      const baseURL = `http://localhost:${port}`;

      const logger = winston.loggers.add(`logger_${port}`, {
        transports: [
          new winston.transports.File({
            filename: `test_output/test_${port}.log`,
            options: {
              flags: "w",
            },
          }),
        ],
      });

      app.use(winstonPlugin.logRequestsWith(logger, { silent: true }));

      app.get("/", (req, res, next) => {
        setTimeout(() => {
          next(createError(503));
        }, 50);
      });

      app.use(
        winstonPlugin.logErrorsWith(logger, {
          level: "error",
          message: (err, req, res) => `${err.statusCode} ${err.message}`,
          meta: (err, req, res) => ({
            status: err.statusCode,
            millis: res.epwTotalMillis,
          }),
        })
      );

      app.use((err, req, res, next) => {
        res.statusCode = err.statusCode;
        res.status(err.statusCode).json({
          status: err.statusCode,
        });
      });

      logger.on("finish", () => {
        const data = JSON.parse(
          fs.readFileSync(`test_output/test_${port}.log`)
        );
        assume(data.level).equals("error");
        assume(data.message).equals("503 Service Unavailable");
        assume(data.status).equals(503);
        assume(data.millis).is.above(0);
      });

      const server = app.listen(port);
      await fetch(baseURL);
      logger.end();
      server.close();
    });
  });
});
