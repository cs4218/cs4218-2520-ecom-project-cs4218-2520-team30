const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: {}, required: true },
    answer: { type: String, required: true },
    role: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    
    // Check if the collection already has a model, if so use it, if not define it.
    let userModel;
    try {
        userModel = mongoose.model("users");
    } catch {
        userModel = mongoose.model("users", userSchema);
    }
    
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
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
createAdmin();
