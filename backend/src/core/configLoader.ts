import fs from "fs";
import { logger } from "../lib/logger";

const MAX_CONFIG_SIZE = 256 * 1024;

export function loadConfig(path = "./config/app.json"): unknown {
  const stats = fs.statSync(path);
  if (stats.size > MAX_CONFIG_SIZE) {
    throw new Error("CONFIG_TOO_LARGE");
  }

  const raw = fs.readFileSync(path, "utf-8");

  if (raw.length > MAX_CONFIG_SIZE) {
    throw new Error("CONFIG_TOO_LARGE");
  }

  logger.info({ path, size: raw.length }, "Config file loaded");

  return JSON.parse(raw);
}
