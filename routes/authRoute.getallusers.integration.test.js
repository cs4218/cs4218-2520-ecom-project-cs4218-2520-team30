// Leong Soon Mun Stephane, A0273409B
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "@jest/globals";
import express from "express";
import request from "supertest";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import router from "./authRoute.js";
import userModel from "../models/userModel.js";

describe("Integrating authRoute with getAllUserController, isAdmin and requireSignIn", () => { // Leong Soon Mun Stephane, A0273409B
    let mongoServer;
    let app;
    let adminId;
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
        const user1 = await userModel.create(
            { name: 'Bob', email: 'bob@example.com', password: 'bob password', phone: '12345678', address: 'bob address', answer: 'bob answer', role: 1 }
        );
        const users2 = await userModel.create(
            { name: 'Charlie', email: 'charlie@example.com', password: 'charlie password', phone: '12348765', address: 'charlie address', answer: 'charlie answer', role: 0 }
        );
        const normalUser = await userModel.create(
            { name: 'Alice', email: 'alice@example.com', password: 'alice password', phone: '87654321', address: 'alice address', answer: 'alice answer', role: 0 }
        );
        const adminUser = await userModel.create(
            { name: 'Tester', email: 'test@example.com', password: 'test password', phone: '21436587', address: 'test address', answer: 'test answer', role: 1 }
        );
        adminId = adminUser._id
        userId = normalUser._id
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

    it("should return users if user is signed in and is an admin", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: adminId }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/all-users")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(4);
        expect(response.body).toMatchObject(
            expect.arrayContaining([
                expect.objectContaining({ _id: expect.anything(), name: 'Alice', email: 'alice@example.com', phone: '87654321', address: 'alice address', role: 0, }),
                expect.objectContaining({ _id: expect.anything(), name: 'Bob', email: 'bob@example.com', phone: '12345678', address: 'bob address', role: 1 }),
                expect.objectContaining({ _id: expect.anything(), name: 'Charlie', email: 'charlie@example.com', phone: '12348765', address: 'charlie address', role: 0 }),
                expect.objectContaining({ _id: expect.anything(), name: 'Tester', email: 'test@example.com', phone: '21436587', address: 'test address', role: 1 }),
            ])
        );
    });

    it("should return users without password and answer if user is signed in and is an admin", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: adminId }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/all-users")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(4);
        expect(Object.prototype.hasOwnProperty.call(response.body[0], "password")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(response.body[0], "answer")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(response.body[1], "password")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(response.body[1], "answer")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(response.body[2], "password")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(response.body[2], "answer")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(response.body[3], "password")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(response.body[3], "answer")).toBe(false);
    });

    it("should return 403 status and error message if user id is missing", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({}, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/all-users")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Forbidden - Admin access required");
    });

    it("should return 500 status and error message if user id is not ObjectId Type", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: "1" }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/all-users")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Error in admin middleware");
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

    it("should return 403 status and error message if user is not an admin", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/all-users")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Forbidden - Admin access required");
    });
});