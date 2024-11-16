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

describe("Skipping Error Logs:", () => {
  describe("When a function is used for the silent option,", () => {
    it("then error logs can be skipped according to custom conditions.", async () => {
      const app = express();
      const port = 3580;
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

      app.get("/retrieve", (req, res) => {
        throw createError(500);
      });

      app.post("/submit", (req, res) => {
        throw createError(503);
      });

      app.use(
        winstonPlugin.logErrorsWith(logger, {
          silent: (err, req, res) => err.statusCode !== 500,
          message: (err, req, res) => err.statusCode,
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
        assume(data.message).equals(500);
      });

      const server = app.listen(port);
      await fetch(baseURL + "/retrieve");
      await fetch(baseURL + "/submit", { method: "POST" });
      logger.end();
      server.close();
    });
  });
});
