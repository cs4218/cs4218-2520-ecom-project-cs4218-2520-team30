/**
 * Playwright Global Setup
 * Creates required test users before running UI tests.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const TEST_USERS = [
  {
    name: "MyAdmin",
    email: "admin@admin.com",
    password: "password123",
    phone: "1234567890",
    address: "123 Admin Street",
    answer: "Football",
    role: 1, // Admin role
  },
  {
    name: "Test User",
    email: "user@test.com",
    password: "password123",
    phone: "0987654321",
    address: "456 User Avenue",
    answer: "Football",
    role: 0, // Normal user role
  },
];

async function globalSetup() {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.log("[Setup] MONGO_URL not found in environment, skipping user creation.");
    return;
  }

  try {
    console.log("[Setup] Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    for (const user of TEST_USERS) {
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email: user.email });

      if (existingUser) {
        console.log(`[Setup] User ${user.email} already exists, skipping.`);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create the user
      await usersCollection.insertOne({
        name: user.name,
        email: user.email,
        password: hashedPassword,
        phone: user.phone,
        address: user.address,
        answer: user.answer,
        role: user.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`[Setup] Created user: ${user.email} (role: ${user.role === 1 ? "admin" : "user"})`);
    }

    await mongoose.connection.close();
    console.log("[Setup] MongoDB connection closed.");
  } catch (error) {
    console.error("[Setup] Error during setup:", error);
    // Don't throw - setup errors should be visible but not block tests entirely
  }
}

module.exports = globalSetup;
