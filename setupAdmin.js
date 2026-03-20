// Alek Kwek, A0273471A
import { seedPlaywrightAdmin } from "./tests/uiTestUtils.js";

let exitCode = 0;

try {
  await seedPlaywrightAdmin();
  console.log("Playwright admin user ensured successfully.");
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  process.exitCode = exitCode;
}
