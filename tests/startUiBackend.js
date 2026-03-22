// Alek Kwek, A0273471A
import {
  PLAYWRIGHT_APP_PORT,
  PLAYWRIGHT_DB_NAME,
  getMongoHost,
  getPlaywrightMongoUri,
} from "./playwrightDb.js";

process.env.PORT = PLAYWRIGHT_APP_PORT;
process.env.DEV_MODE = process.env.DEV_MODE || "test";
process.env.MONGO_URL = getPlaywrightMongoUri();

console.log(
  JSON.stringify(
    {
      playwrightBackend: {
        mongoHost: getMongoHost(process.env.MONGO_URL),
        dbName: PLAYWRIGHT_DB_NAME,
        port: process.env.PORT,
      },
    },
    null,
    2
  )
);

await import("../server.js");
