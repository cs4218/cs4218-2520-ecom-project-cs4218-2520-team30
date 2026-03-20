/**
 * Standalone Cleanup Script
 * Deletes test users created during UI tests.
 *
 * Usage: node tests/setup/cleanup-test-users.js
 *
 * Test user pattern: testuser_*@test.com
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function cleanupTestUsers() {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.error("Error: MONGO_URL not found in .env file");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // First, let's see what test users exist
    const testUsers = await usersCollection
      .find({ email: { $regex: /^testuser_.*@test\.com$/ } })
      .toArray();

    if (testUsers.length === 0) {
      console.log("No test users found to delete.");
    } else {
      console.log(`Found ${testUsers.length} test user(s):`);
      testUsers.forEach((user) => {
        console.log(`  - ${user.email} (created: ${user.createdAt || "unknown"})`);
      });

      // Delete test users
      const result = await usersCollection.deleteMany({
        email: { $regex: /^testuser_.*@test\.com$/ },
      });

      console.log(`\nDeleted ${result.deletedCount} test user(s).`);
    }

    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupTestUsers();
