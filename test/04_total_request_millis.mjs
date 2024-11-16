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

describe("Total Request Millis:", () => {
  describe("When the request takes approximately one second,", () => {
    it("then the calculated total time is between 1000 and 1500 ms.", async () => {
      const app = express();
      const port = 3530;
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
          message: (req, res) => `${res.epwTotalMillis}`,
        })
      );

      app.get("/", (req, res) => {
        setTimeout(() => res.send("Hello World!"), 1000);
      });

      logger.on("finish", () => {
        const data = JSON.parse(
          fs.readFileSync(`test_output/test_${port}.log`)
        );
        assume(data.level).equals("warn");
        assume(Number(data.message)).is.between(1000, 1500);
      });

      const server = app.listen(port);
      await fetch(baseURL);
      logger.end();
      server.close();
    });
  });
});
