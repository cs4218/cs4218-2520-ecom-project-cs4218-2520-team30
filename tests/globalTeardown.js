// Alek Kwek, A0273471A
import { cleanupPlaywrightData } from "./uiTestUtils.js";

export default async function globalTeardown() {
  await cleanupPlaywrightData({ includeAdmin: true });
}
