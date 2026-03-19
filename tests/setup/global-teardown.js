/**
 * Playwright Global Teardown
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function globalTeardown() {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.log("[Teardown] MONGO_URL not found in environment, skipping cleanup.");
    return;
  }

  try {
    console.log("[Teardown] Connecting to MongoDB for cleanup...");
    await mongoose.connect(mongoUrl);

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Delete test users matching pattern: testuser_*@test.com
    const result = await usersCollection.deleteMany({
      email: { $regex: /^testuser_.*@test\.com$/ },
    });

    console.log(`[Teardown] Deleted ${result.deletedCount} test user(s) from database.`);

    await mongoose.connection.close();
    console.log("[Teardown] MongoDB connection closed.");
  } catch (error) {
    console.error("[Teardown] Error during cleanup:", error);
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

module.exports = globalTeardown;
