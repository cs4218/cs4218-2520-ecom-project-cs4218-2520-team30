require("dotenv").config();
const mongoose = require("mongoose");
console.log(process.env.MONGO_URL);
mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("DB NAME:", mongoose.connection.name);
  process.exit(0);
});
