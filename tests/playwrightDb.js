// Alek Kwek, A0273471A
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const PLAYWRIGHT_DB_NAME = "test";
export const PLAYWRIGHT_PREFIX = "__playwright__";
export const PLAYWRIGHT_ADMIN_EMAIL = "playwright-admin@test.com";
export const PLAYWRIGHT_ADMIN_PASSWORD = "adminpassword123";
export const PLAYWRIGHT_ADMIN_NAME = "Playwright Admin";
export const PLAYWRIGHT_ADMIN_PHONE = "1234567890";
export const PLAYWRIGHT_ADMIN_ADDRESS = "Test Address";
export const PLAYWRIGHT_ADMIN_ANSWER = "Test Answer";
export const PLAYWRIGHT_APP_PORT = process.env.PLAYWRIGHT_APP_PORT || "6060";
export const PLAYWRIGHT_CLIENT_PORT =
  process.env.PLAYWRIGHT_CLIENT_PORT || "3000";

export function getBaseMongoUri() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not set");
  }

  return process.env.MONGO_URL;
}

export function buildMongoUriWithDb(baseMongoUri, dbName = PLAYWRIGHT_DB_NAME) {
  const mongoUrl = new URL(baseMongoUri);
  mongoUrl.pathname = `/${dbName}`;
  return mongoUrl.toString();
}

export function getPlaywrightMongoUri() {
  return buildMongoUriWithDb(getBaseMongoUri(), PLAYWRIGHT_DB_NAME);
}

export function getMongoHost(mongoUri) {
  const mongoUrl = new URL(mongoUri);
  return mongoUrl.host;
}
