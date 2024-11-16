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

describe("Dynamic Logging Level:", () => {
  describe("When a function is used for the level option,", () => {
    it("then requests can be logged with different levels according to custom conditions.", async () => {
      const app = express();
      const port = 3560;
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
          level: (req, res) => (req.method === "GET" ? "info" : "warn"),
        })
      );

      app.get("/retrieve", (req, res) => {
        res.send("Hello GET!");
      });

      app.post("/submit", (req, res) => {
        res.send("Hello POST!");
      });

      logger.on("finish", () => {
        const data = fs
          .readFileSync(`test_output/test_${port}.log`, "utf-8")
          .split(/\r?\n/);
        const log1 = JSON.parse(data[0]);
        const log2 = JSON.parse(data[1]);
        assume(log1.level).equals("info");
        assume(log2.level).equals("warn");
      });

      const server = app.listen(port);
      await fetch(baseURL + "/retrieve");
      await fetch(baseURL + "/submit", { method: "POST" });
      logger.end();
      server.close();
    });
  });

  describe("When a function is used for the error level option,", () => {
    it("then errors can be logged with different levels according to custom conditions.", async () => {
      const app = express();
      const port = 3561;
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
        throw createError(503);
      });

      app.post("/submit", (req, res) => {
        throw createError(500);
      });

      app.use(
        winstonPlugin.logErrorsWith(logger, {
          level: (err, req, res) => (err.statusCode === 503 ? "warn" : "info"),
        })
      );

      app.use((err, req, res, next) => {
        res.statusCode = err.statusCode;
        res.status(err.statusCode).json({
          status: err.statusCode,
        });
      });

      logger.on("finish", () => {
        const data = fs
          .readFileSync(`test_output/test_${port}.log`, "utf-8")
          .split(/\r?\n/);
        const log1 = JSON.parse(data[0]);
        const log2 = JSON.parse(data[1]);
        assume(log1.level).equals("warn");
        assume(log2.level).equals("info");
      });

      const server = app.listen(port);
      await fetch(baseURL + "/retrieve");
      await fetch(baseURL + "/submit", { method: "POST" });
      logger.end();
      server.close();
    });
  });
});
