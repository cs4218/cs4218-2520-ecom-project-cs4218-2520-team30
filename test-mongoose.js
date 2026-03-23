const mongoose = require("mongoose");
const url = "mongodb+srv://guozhijiealek_db_user:wkcmTasHjU8L4eu7@cluster0.mgqccow.mongodb.net/playwright_ms2_ui";
mongoose.connect(url).then(async () => {
   const users = await mongoose.connection.db.collection("users").find().toArray();
   console.log("Users in DB:", users);
   process.exit(0);
});
