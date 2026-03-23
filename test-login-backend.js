const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const url = "mongodb+srv://guozhijiealek_db_user:wkcmTasHjU8L4eu7@cluster0.mgqccow.mongodb.net/playwright_ms2_ui";

async function run() {
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db("playwright_ms2_ui");
  
  // Seed user
  const pwd = await bcrypt.hash("playwright-admin-password", 10);
  await db.collection("users").deleteMany({ email: "playwright-admin@test.com" });
  await db.collection("users").insertOne({
    name: "tester",
    email: "playwright-admin@test.com",
    password: pwd,
    phone: "123",
    address: "addr",
    answer: "ans",
    role: 1
  });
  console.log("Seeded user.");
  
  // Try to hit local server
  const res = await fetch("http://localhost:6060/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "playwright-admin@test.com", password: "playwright-admin-password" })
  });
  
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
  
  await client.close();
  process.exit(0);
}
run();
