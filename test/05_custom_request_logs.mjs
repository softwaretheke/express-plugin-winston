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

describe("Custom Request Logs:", () => {
  describe("When custom options are provided and the request succeeds,", () => {
    it("then a custom log message is written.", async () => {
      const app = express();
      const port = 3540;
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

      app.use(
        winstonPlugin.logRequestsWith(logger, {
          level: "warn",
          message: (req, res) => req.method,
          meta: (req, res) => ({
            status: res.statusCode,
            millis: res.epwTotalMillis,
          }),
        })
      );

      app.get("/", (req, res) => {
        setTimeout(() => res.send("Hello World!"), 50);
      });

      logger.on("finish", () => {
        const data = JSON.parse(
          fs.readFileSync(`test_output/test_${port}.log`)
        );
        assume(data.level).equals("warn");
        assume(data.message).equals("GET");
        assume(data.status).equals(200);
        assume(data.millis).is.above(0);
      });

      const server = app.listen(port);
      await fetch(baseURL);
      logger.end();
      server.close();
    });
  });
});
