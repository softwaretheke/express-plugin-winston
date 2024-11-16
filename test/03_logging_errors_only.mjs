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

describe("Logging Errors only:", () => {
  describe("When only errors are logged and the request fails,", () => {
    it("then a dash is written instead of the request duration.", async () => {
      const app = express();
      const port = 3520;
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

      app.get("/error", (req, res) => {
        throw createError(503);
      });

      app.use(winstonPlugin.logErrorsWith(logger));

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
        assume(data.message).equals("503 - GET /error");
      });

      const server = app.listen(port);
      await fetch(baseURL + "/error");
      logger.end();
      server.close();
    });
  });

  describe("When only errors are logged and a silent request logger is used,", () => {
    it("then the duration of the request is written whereas request logging is skipped.", async () => {
      const app = express();
      const port = 3521;
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

      app.get("/success", (req, res) => {
        res.send("Hello World!");
      });

      app.get("/error", (req, res) => {
        throw createError(503);
      });

      app.use(winstonPlugin.logErrorsWith(logger));

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
        assume(data.message).matches(/^503 \d+ GET \/error$/);
      });

      const server = app.listen(port);
      await fetch(baseURL + "/success");
      await fetch(baseURL + "/error");
      logger.end();
      server.close();
    });
  });
});
