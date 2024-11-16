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

describe("Default Request Logs:", () => {
  describe("When no options are provided and the request succeeds,", () => {
    it("then a default log message is written.", async () => {
      const app = express();
      const port = 3500;
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

      app.use(winstonPlugin.logRequestsWith(logger));

      app.get("/hello/world", (req, res) => {
        res.send("Hello World!");
      });

      logger.on("finish", () => {
        const data = JSON.parse(
          fs.readFileSync(`test_output/test_${port}.log`)
        );
        assume(data.level).equals("info");
        assume(data.message).matches(/^200 \d+ GET \/hello\/world$/);
      });

      const server = app.listen(port);
      await fetch(baseURL + "/hello/world");
      logger.end();
      server.close();
    });
  });
});
