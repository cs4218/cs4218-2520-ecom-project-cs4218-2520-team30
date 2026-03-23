// Alek Kwek, A0273471A
import { 
  cleanupPlaywrightData, 
  seedPlaywrightAdmin,
  ensurePlaywrightCatalog 
} from "./uiTestUtils.js";

export default async function globalSetup() {
  // Fresh start: wipe everything including admin
  await cleanupPlaywrightData({ includeAdmin: true });
  
  // Seed critical data
  await seedPlaywrightAdmin();
  await ensurePlaywrightCatalog();
  
  console.log("Playwright Global Setup complete: Database seeded with Admin and Product Catalog.");
}
