// Leong Soon Mun Stephane, A0273409B
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "@jest/globals";
import express from "express";
import request from "supertest";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import router from "./authRoute.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

describe("Integrating authRoute with getOrdersController and requireSignIn", () => { // Leong Soon Mun Stephane, A0273409B
    let mongoServer;
    let app;
    let userId;
    const testJwtSecret = "test-secret";

    beforeAll(async () => {
        process.env.JWT_SECRET = testJwtSecret;
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        app = express();
        app.use(express.json());
        app.use("/api/v1/auth", router);
    });

    beforeEach(async () => {
        const user1 = await userModel.create({
            name: "Alice",
            email: "alice@example.com",
            password: "alice password",
            phone: "87654321",
            address: "alice address",
            answer: "alice answer",
            role: 0,
        });
        userId = user1._id;

        const user2 = await userModel.create({
            name: "Bob",
            email: "bob@example.com",
            password: "bob password",
            phone: "12345678",
            address: "bob address",
            answer: "bob answer",
            role: 1,
        });

        const categoryId = new mongoose.Types.ObjectId();

        const product1 = await productModel.create({
            name: "Mechanical Keyboard",
            slug: "mechanical-keyboard",
            description: "A clicky mechanical keyboard",
            price: 89.99,
            category: categoryId,
            quantity: 50,
            shipping: true,
            photo: {
                data: Buffer.from("sample-photo-data"),
                contentType: "image/jpeg",
            },
        });

        const product2 = await productModel.create({
            name: "Wireless Mouse",
            slug: "wireless-mouse",
            description: "An ergonomic wireless mouse",
            price: 45.99,
            category: categoryId,
            quantity: 100,
            shipping: true,
            photo: {
                data: Buffer.from("sample-photo-data"),
                contentType: "image/jpeg",
            },
        });

        await orderModel.create({
            products: [product1._id],
            payment: {
                method: "credit_card",
                transactionId: "txn_abc123",
                amount: 135.98,
            },
            buyer: user1._id,
            status: "Not Process",
        });

        await orderModel.create({
            products: [product2._id],
            payment: {
                method: "credit_card",
                transactionId: "txn_abc123",
                amount: 45.99,
            },
            buyer: user2._id,
            status: "Not Process",
        });
    });

    afterEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it("should return user's orders if user is signed in", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/orders")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({
            buyer: { name: "Alice" },
            payment: {
                method: "credit_card",
                transactionId: "txn_abc123",
                amount: 135.98,
            },
            status: "Not Process",
        });
        expect(response.body[0].products).toHaveLength(1);
        expect(response.body[0].products[0]).toMatchObject({
            name: "Mechanical Keyboard",
            slug: "mechanical-keyboard",
            description: "A clicky mechanical keyboard",
            price: 89.99,
            quantity: 50,
            shipping: true,
        });
        expect(Object.prototype.hasOwnProperty.call(response.body[0].products[0], "photo")).toBe(false);
    });

    it("should return 200 status and no orders if user doesn't have any orders", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: new mongoose.Types.ObjectId() }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/orders")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(0);
    });

    it("should return 200 status and no orders if user id is missing", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({}, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/orders")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(0);
    });

    it("should return 500 status and error message if user id is not ObjectId Type", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: "1" }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/orders")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Error While Getting Orders");
        expect(response.body.error).toBeDefined();
    });

    it("should return 401 status and error message if request does not have the correct JWTSecret", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: new mongoose.Types.ObjectId() }, "wrong JwtSecret");

        // Act
        const response = await request(app)
            .get("/api/v1/auth/orders")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid or expired token");
    });

    it("should return 401 status and error message if authorization is missing", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        const response = await request(app)
            .get("/api/v1/auth/orders")

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid or expired token");
    });
});
