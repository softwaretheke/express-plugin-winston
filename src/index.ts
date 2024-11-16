/**
 * @softwaretheke/express-plugin-winston
 *
 * Copyright (c) 2024 SoftwareTheke GmbH
 *
 * Stefan Beer <technik@software-theke.de>
 *
 * MIT Licensed
 */

import type { Request, Response, NextFunction } from "express";
import type { Logger } from "winston";
import onHeaders from "on-headers";
import onFinished from "on-finished";

export function logRequestsWith(
  logger: Logger,
  options?: PluginRequestOptions
) {
  const silent = options?.silent || defaultRequestSilent;
  const isSilentFunction = typeof silent === "function";
  const level = options?.level || defaultRequestLevel;
  const isLevelFunction = typeof level === "function";
  const message = options?.message || defaultRequestMessage;
  const meta = options?.meta;
  const isMetaFunction = typeof meta === "function";

  return (req: PluginRequest, res: PluginResponse, next: NextFunction) => {
    req.epwStartedAt = process.hrtime();
    res.epwTotalMillis = -1;

    const logRequest = () => {
      const isSilent = isSilentFunction ? silent(req, res) : silent;
      if (!res.epwErrorLogged && !isSilent) {
        res.epwTotalMillis = calculateElapsedMillis(req);
        const logLevel = isLevelFunction ? level(req, res) : level;
        let info = { level: logLevel, message: message(req, res) };
        if (isMetaFunction) {
          info = { ...info, ...meta(req, res) };
        }
        logger.log(info);
      }
    };

    onFinished(res, logRequest);
    next();
  };
}

export function logErrorsWith(logger: Logger, options?: PluginErrorOptions) {
  const silent = options?.silent || defaultErrorSilent;
  const isSilentFunction = typeof silent === "function";
  const level = options?.level || defaultErrorLevel;
  const isLevelFunction = typeof level === "function";
  const message = options?.message || defaultErrorMessage;
  const meta = options?.meta;
  const isMetaFunction = typeof meta === "function";

  return (
    err: unknown,
    req: PluginRequest,
    res: PluginResponse,
    next: NextFunction
  ) => {
    res.epwErrorLogged = true;
    res.epwTotalMillis = -1;

    const logError = () => {
      const isSilent = isSilentFunction ? silent(err, req, res) : silent;
      if (!isSilent) {
        if (typeof req.epwStartedAt !== "undefined") {
          res.epwTotalMillis = calculateElapsedMillis(req);
        }
        const logLevel = isLevelFunction ? level(err, req, res) : level;
        let info = { level: logLevel, message: message(err, req, res) };
        if (isMetaFunction) {
          info = { ...info, ...meta(err, req, res) };
        }
        logger.log(info);
      }
    };

    onHeaders(res, logError);
    next(err);
  };
}

function calculateElapsedMillis(req: PluginRequest): number {
  const elapsed = process.hrtime(req.epwStartedAt);
  return Math.ceil(elapsed[0] * 1e3 + elapsed[1] * 1e-6);
}

interface PluginRequest extends Request {
  epwStartedAt: [number, number];
}

interface PluginResponse extends Response {
  epwTotalMillis: number;
  epwErrorLogged: boolean;
}

interface PluginRequestOptions {
  silent?: boolean | ((req: Request, res: Response) => boolean);
  level?: string | ((req: Request, res: Response) => string);
  message?: (req: Request, res: Response) => string;
  meta?: (req: Request, res: Response) => object;
}

interface PluginErrorOptions {
  silent?: boolean | ((err: unknown, req: Request, res: Response) => boolean);
  level?: string | ((err: unknown, req: Request, res: Response) => string);
  message?: (err: unknown, req: Request, res: Response) => string;
  meta?: (err: unknown, req: Request, res: Response) => object;
}

const defaultRequestSilent = false;
const defaultRequestLevel = "info";
const defaultRequestMessage = (req: PluginRequest, res: PluginResponse) =>
  `${res.statusCode} ${res.epwTotalMillis} ${req.method} ${req.url}`;

const defaultErrorSilent = false;
const defaultErrorLevel = "error";
const defaultErrorMessage = (
  err: unknown,
  req: PluginRequest,
  res: PluginResponse
) =>
  `${res.statusCode} ${res.epwTotalMillis >= 0 ? res.epwTotalMillis : "-"} ${
    req.method
  } ${req.url}`;
