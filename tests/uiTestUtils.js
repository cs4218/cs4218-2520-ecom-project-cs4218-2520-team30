// Alek Kwek, A0273471A
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import {
  PLAYWRIGHT_ADMIN_ADDRESS,
  PLAYWRIGHT_ADMIN_ANSWER,
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_NAME,
  PLAYWRIGHT_ADMIN_PASSWORD,
  PLAYWRIGHT_ADMIN_PHONE,
  PLAYWRIGHT_DB_NAME,
  PLAYWRIGHT_PREFIX,
  getBaseMongoUri,
  getMongoHost,
  getPlaywrightMongoUri,
} from "./playwrightDb.js";

const prefixRegex = new RegExp(`^${PLAYWRIGHT_PREFIX}`, "i");

export function getCleanupPlan(includeAdmin = false) {
  const collections = [
    {
      name: "products",
      filter: { name: { $regex: `^${PLAYWRIGHT_PREFIX}`, $options: "i" } },
    },
    {
      name: "categories",
      filter: { name: { $regex: `^${PLAYWRIGHT_PREFIX}`, $options: "i" } },
    },
  ];

  if (includeAdmin) {
    collections.push({
      name: "users",
      filter: { email: PLAYWRIGHT_ADMIN_EMAIL },
    });
  }

  return {
    mongoHost: getMongoHost(getPlaywrightMongoUri()),
    appDbName: PLAYWRIGHT_DB_NAME,
    helperDbName: PLAYWRIGHT_DB_NAME,
    collections,
  };
}

async function withPlaywrightConnection(work) {
  const connection = await mongoose.connect(getPlaywrightMongoUri());

  try {
    return await work(connection);
  } finally {
    await mongoose.disconnect();
  }
}

export async function seedPlaywrightAdmin() {
  return withPlaywrightConnection(async () => {
    const hashedPassword = await bcrypt.hash(PLAYWRIGHT_ADMIN_PASSWORD, 10);

    await userModel.findOneAndUpdate(
      { email: PLAYWRIGHT_ADMIN_EMAIL },
      {
        name: PLAYWRIGHT_ADMIN_NAME,
        email: PLAYWRIGHT_ADMIN_EMAIL,
        password: hashedPassword,
        phone: PLAYWRIGHT_ADMIN_PHONE,
        address: PLAYWRIGHT_ADMIN_ADDRESS,
        answer: PLAYWRIGHT_ADMIN_ANSWER,
        role: 1,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  });
}

export async function cleanupPlaywrightData({ includeAdmin = false } = {}) {
  const cleanupPlan = getCleanupPlan(includeAdmin);

  console.log(
    JSON.stringify(
      {
        cleanup: cleanupPlan,
        mongoHost: getMongoHost(getBaseMongoUri()),
      },
      null,
      2
    )
  );

  return withPlaywrightConnection(async () => {
    await productModel.deleteMany({ name: prefixRegex });
    await categoryModel.deleteMany({ name: prefixRegex });

    if (includeAdmin) {
      await userModel.deleteMany({ email: PLAYWRIGHT_ADMIN_EMAIL });
    }
  });
}

export async function findResidualPlaywrightData() {
  return withPlaywrightConnection(async () => {
    const [categories, products, users] = await Promise.all([
      categoryModel.find({ name: prefixRegex }).select("name slug").lean(),
      productModel
        .find({ name: prefixRegex })
        .select("name slug category")
        .lean(),
      userModel
        .find({
          $or: [{ email: PLAYWRIGHT_ADMIN_EMAIL }, { name: prefixRegex }],
        })
        .select("email name role")
        .lean(),
    ]);

    return {
      dbName: PLAYWRIGHT_DB_NAME,
      categories,
      products,
      users,
    };
  });
}
