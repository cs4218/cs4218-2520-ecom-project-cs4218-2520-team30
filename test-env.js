process.env.MONGO_URL = "mongodb://foo/bar";
require("dotenv").config();
console.log(process.env.MONGO_URL);
