import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

import userModel from "./models/userModel.js";

dotenv.config({ path: ".env" });

const createAdmin = async () => {
  let exitCode = 0;

  try {
    await mongoose.connect(process.env.MONGO_URL);

    const email = "playwright-admin@test.com";
    const password = "adminpassword123";
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
        role: 1, // Admin role
      });
      await user.save();
      console.log("Admin user created successfully.");
    } else {
      user.role = 1;
      user.password = hashedPassword;
      await user.save();
      console.log("Admin user updated successfully.");
    }
  } catch (e) {
    console.error(e);
    exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {
      exitCode = 1;
    });
    process.exitCode = exitCode;
  }
};

await createAdmin();
