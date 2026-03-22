// Alek Kwek, A0273471A
import { cleanupPlaywrightData, seedPlaywrightAdmin } from "./uiTestUtils.js";

export default async function globalSetup() {
  await cleanupPlaywrightData({ includeAdmin: true });
  await seedPlaywrightAdmin();
}
