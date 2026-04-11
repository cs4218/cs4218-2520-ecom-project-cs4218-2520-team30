/**
 * Seeds / cleans large MongoDB dataset for volume (k6) testing.
 * @author Boh Xiang You Basil (A0273232M)
 */
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import slugify from "slugify";
import dotenv from "dotenv";

dotenv.config();

const VOLUME_PREFIX = "__volume__";
const DEFAULT_MONGO_URL =
  process.env.VOLUME_MONGO_URL ||
  "mongodb://localhost:27017/virtualvault_volume_test";
const PASSWORD = "password123";
const SALT_ROUNDS = 10;

/** Volume-test dataset size (keep in sync with tests/volume/config.js). */
const NUM_CATEGORIES = 20;
const NUM_REGULAR_USERS = 500;
const NUM_PRODUCTS = 8000;
const NUM_GENERAL_ORDERS = 1500;
const NUM_HEAVY_USER_ORDERS = 2000;
/** Larger blobs stress storage + photo reads (4 KiB per product). */
const PHOTO_BYTE_LENGTH = 4096;

// Inline schema definitions so this script is self-contained and doesn't
// interfere with Mongoose model registrations in the main app.
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, lowercase: true },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.ObjectId, ref: "Category", required: true },
    quantity: { type: Number, required: true },
    photo: { data: Buffer, contentType: String },
    shipping: { type: Boolean },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: {}, required: true },
    answer: { type: String, required: true },
    role: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    products: [{ type: mongoose.ObjectId, ref: "Products" }],
    payment: {},
    buyer: { type: mongoose.ObjectId, ref: "users" },
    status: {
      type: String,
      default: "Not Process",
      enum: ["Not Process", "Processing", "Shipped", "deliverd", "cancel"],
    },
  },
  { timestamps: true }
);

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
const Product =
  mongoose.models.Products || mongoose.model("Products", productSchema);
const User = mongoose.models.users || mongoose.model("users", userSchema);
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

const PLACEHOLDER_PHOTO = {
  data: Buffer.alloc(PHOTO_BYTE_LENGTH, 0x42),
  contentType: "image/png",
};

const ADJECTIVES = [
  "Premium",  "Classic",  "Ultra",    "Mega",     "Super",
  "Deluxe",   "Pro",      "Elite",    "Smart",    "Eco",
  "Vintage",  "Modern",   "Compact",  "Portable", "Heavy-Duty",
  "Slim",     "Turbo",    "Nano",     "Titan",    "Flex",
];

const NOUNS = [
  "Widget",    "Gadget",    "Device",   "Tool",     "Machine",
  "Keyboard",  "Mouse",     "Monitor",  "Speaker",  "Charger",
  "Headphone", "Camera",    "Lamp",     "Fan",      "Printer",
  "Router",    "Cable",     "Adapter",  "Battery",  "Sensor",
];

const KEYWORDS = [
  "electronics", "gadget",  "wireless", "portable", "smart",
  "premium",     "compact", "heavy",    "turbo",    "eco",
  "durable",     "fast",    "secure",   "bright",   "silent",
];

/** @author Boh Xiang You Basil (A0273232M) */
async function connect() {
  console.log(`Connecting to ${DEFAULT_MONGO_URL} …`);
  await mongoose.connect(DEFAULT_MONGO_URL);
  console.log("Connected.");
}

/** @author Boh Xiang You Basil (A0273232M) */
async function disconnect() {
  await mongoose.disconnect();
  console.log("Disconnected.");
}

// ──────────────────────────── SEED ────────────────────────────

/** @author Boh Xiang You Basil (A0273232M) */
async function seed() {
  await connect();

  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // --- Categories ---
  console.log(`Seeding ${NUM_CATEGORIES} categories …`);
  const categoryDocs = [];
  for (let i = 0; i < NUM_CATEGORIES; i++) {
    const name = `${VOLUME_PREFIX} Category ${i}`;
    categoryDocs.push({ name, slug: slugify(name, { lower: true }) });
  }
  const categories = await Category.insertMany(categoryDocs);
  const categoryIds = categories.map((c) => c._id);
  console.log(`  ✓ ${categories.length} categories created.`);

  // --- Users (regular + admin + heavy-order user) ---
  console.log(`Seeding ${NUM_REGULAR_USERS + 2} users …`);
  const userDocs = [];

  // Admin user
  userDocs.push({
    name: `${VOLUME_PREFIX} Admin`,
    email: `${VOLUME_PREFIX}admin@admin.com`,
    password: hashedPassword,
    phone: "90000001",
    address: "Volume Admin Address",
    answer: "volume",
    role: 1,
  });

  // Heavy-order user
  userDocs.push({
    name: `${VOLUME_PREFIX} Heavy User`,
    email: `${VOLUME_PREFIX}heavyuser@test.com`,
    password: hashedPassword,
    phone: "90000002",
    address: "Volume Heavy User Address",
    answer: "volume",
    role: 0,
  });

  for (let i = 0; i < NUM_REGULAR_USERS; i++) {
    userDocs.push({
      name: `${VOLUME_PREFIX} User ${i}`,
      email: `${VOLUME_PREFIX}user${i}@test.com`,
      password: hashedPassword,
      phone: `9${String(i).padStart(7, "0")}`,
      address: `Volume Address ${i}`,
      answer: "volume",
      role: 0,
    });
  }
  const users = await User.insertMany(userDocs, { ordered: false });
  const regularUserIds = users.filter((u) => u.role === 0).map((u) => u._id);
  const heavyUser = users.find(
    (u) => u.email === `${VOLUME_PREFIX}heavyuser@test.com`
  );
  console.log(`  ✓ ${users.length} users created.`);

  // --- Products (large collection for query / pagination / search volume) ---
  console.log(`Seeding ${NUM_PRODUCTS} products …`);
  const productDocs = [];
  for (let i = 0; i < NUM_PRODUCTS; i++) {
    const adj = ADJECTIVES[i % ADJECTIVES.length];
    const noun = NOUNS[Math.floor(i / ADJECTIVES.length) % NOUNS.length];
    const kw = KEYWORDS[i % KEYWORDS.length];
    const name = `${VOLUME_PREFIX} ${adj} ${noun} ${i}`;
    productDocs.push({
      name,
      slug: slugify(name, { lower: true }),
      description: `A ${kw} ${noun.toLowerCase()} for volume testing. Item #${i}.`,
      price: Math.round((Math.random() * 500 + 1) * 100) / 100,
      category: categoryIds[i % categoryIds.length],
      quantity: Math.floor(Math.random() * 100) + 1,
      photo: PLACEHOLDER_PHOTO,
      shipping: i % 2 === 0,
    });
  }

  // insertMany in chunks of 200 to avoid exceeding BSON limits
  const CHUNK = 200;
  const allProducts = [];
  for (let start = 0; start < productDocs.length; start += CHUNK) {
    const chunk = productDocs.slice(start, start + CHUNK);
    const inserted = await Product.insertMany(chunk, { ordered: false });
    allProducts.push(...inserted);
    process.stdout.write(`  … ${allProducts.length} products\r`);
  }
  const productIds = allProducts.map((p) => p._id);
  console.log(`  ✓ ${allProducts.length} products created.`);

  // --- Orders (many rows for order-history + admin listing queries) ---
  console.log(`Seeding ${NUM_GENERAL_ORDERS} general orders …`);
  const STATUSES = ["Not Process", "Processing", "Shipped", "deliverd", "cancel"];
  const generalOrders = [];
  const buyerPool = regularUserIds.slice(0, 50);
  for (let i = 0; i < NUM_GENERAL_ORDERS; i++) {
    const numProducts = Math.floor(Math.random() * 5) + 1;
    const orderProducts = [];
    for (let j = 0; j < numProducts; j++) {
      orderProducts.push(productIds[Math.floor(Math.random() * productIds.length)]);
    }
    generalOrders.push({
      products: orderProducts,
      payment: { success: true, id: `vol_txn_${i}` },
      buyer: buyerPool[i % buyerPool.length],
      status: STATUSES[i % STATUSES.length],
    });
  }
  await Order.insertMany(generalOrders, { ordered: false });
  console.log(`  ✓ ${NUM_GENERAL_ORDERS} general orders created.`);

  console.log(`Seeding ${NUM_HEAVY_USER_ORDERS} orders for heavy user …`);
  const heavyOrders = [];
  for (let i = 0; i < NUM_HEAVY_USER_ORDERS; i++) {
    const numProducts = Math.floor(Math.random() * 3) + 1;
    const orderProducts = [];
    for (let j = 0; j < numProducts; j++) {
      orderProducts.push(productIds[Math.floor(Math.random() * productIds.length)]);
    }
    heavyOrders.push({
      products: orderProducts,
      payment: { success: true, id: `vol_heavy_${i}` },
      buyer: heavyUser._id,
      status: STATUSES[i % STATUSES.length],
    });
  }

  for (let start = 0; start < heavyOrders.length; start += CHUNK) {
    const chunk = heavyOrders.slice(start, start + CHUNK);
    await Order.insertMany(chunk, { ordered: false });
    process.stdout.write(
      `  … ${Math.min(start + CHUNK, NUM_HEAVY_USER_ORDERS)} heavy orders\r`
    );
  }
  console.log(`  ✓ ${NUM_HEAVY_USER_ORDERS} heavy-user orders created.`);

  console.log("\nSeeding complete.");
  await disconnect();
}

// ──────────────────────────── CLEAN ────────────────────────────

/** @author Boh Xiang You Basil (A0273232M) */
async function clean() {
  await connect();

  console.log("Cleaning volume test data …");

  const prefixRegex = new RegExp(`^${VOLUME_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

  const prodResult = await Product.deleteMany({ name: prefixRegex });
  console.log(`  Deleted ${prodResult.deletedCount} products.`);

  const catResult = await Category.deleteMany({ name: prefixRegex });
  console.log(`  Deleted ${catResult.deletedCount} categories.`);

  const userResult = await User.deleteMany({ email: prefixRegex });
  console.log(`  Deleted ${userResult.deletedCount} users.`);

  // Orders don't have the prefix in a text field, but their buyers are
  // volume-test users which we just deleted. Find remaining orphaned orders
  // by looking for payment IDs with our marker.
  const orderResult = await Order.deleteMany({
    "payment.id": { $regex: /^vol_/ },
  });
  console.log(`  Deleted ${orderResult.deletedCount} orders.`);

  console.log("Cleanup complete.");
  await disconnect();
}

// ──────────────────────────── CLI ────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--clean")) {
  clean().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
