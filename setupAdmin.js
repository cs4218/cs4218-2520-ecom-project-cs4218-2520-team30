import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

import userModel from "./models/userModel.js";
import {
  getPlaywrightMongoUrl,
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_PASSWORD,
} from "./tests/uiTestUtils.js";

dotenv.config({ path: ".env" });

const mongoUrl = getPlaywrightMongoUrl();
const email = PLAYWRIGHT_ADMIN_EMAIL;
const password = PLAYWRIGHT_ADMIN_PASSWORD;

const createAdmin = async () => {
  let exitCode = 0;

  try {
    await mongoose.connect(mongoUrl);

    const hashedPassword = await bcrypt.hash(password, 10);
    let user = await userModel.findOne({ email });

    if (!user) {
      user = new userModel({
        name: "Playwright Admin",
        email,
        password: hashedPassword,
        phone: "1234567890",
        address: "Test Address",
        answer: "Test Answer",
        role: 1,
      });
      await user.save();
      console.log("Admin user created successfully.");
    } else {
      user.role = 1;
      user.password = hashedPassword;
      await user.save();
      console.log("Admin user updated successfully.");
    }
  } catch (error) {
    console.error(error);
    exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error(disconnectError);
        exitCode = 1;
      }
    }

    process.exitCode = exitCode;
  }
};

await createAdmin();
