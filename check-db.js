import mongoose from "mongoose";
import userModel from "./models/userModel.js";

const PLAYWRIGHT_DB_NAME = "playwright_ms2_ui";
const url = "mongodb+srv://guozhijiealek_db_user:wkcmTasHjU8L4eu7@cluster0.mgqccow.mongodb.net/playwright_ms2_ui";

async function run() {
  await mongoose.connect(url);
  const user = await userModel.findOne({ email: "playwright-admin@test.com" });
  console.log("FOUND USER:", user);
  process.exit(0);
}
run();
