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
import assume from "assume";
import fs from "fs";

describe("Skipping Request Logs:", () => {
  describe("When a function is used for the silent option,", () => {
    it("then request logs can be skipped according to custom conditions.", async () => {
      const app = express();
      const port = 3570;
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
          silent: (req, res) => req.method !== "POST",
          message: (req, res) => req.method,
        })
      );

      app.get("/retrieve", (req, res) => {
        res.send("Hello GET!");
      });

      app.post("/submit", (req, res) => {
        res.send("Hello POST!");
      });

      logger.on("finish", () => {
        const data = JSON.parse(
          fs.readFileSync(`test_output/test_${port}.log`)
        );
        assume(data.level).equals("info");
        assume(data.message).equals("POST");
      });

      const server = app.listen(port);
      await fetch(baseURL + "/retrieve");
      await fetch(baseURL + "/submit", { method: "POST" });
      await fetch(baseURL + "/retrieve");
      logger.end();
      server.close();
    });
  });
});
