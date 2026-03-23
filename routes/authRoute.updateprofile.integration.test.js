// Leong Soon Mun Stephane, A0273409B
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "@jest/globals";
import express from "express";
import request from "supertest";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import router from "./authRoute.js";
import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "./../helpers/authHelper.js";

describe("Integrating authRoute with updateProfileController, and requireSignIn", () => { // Leong Soon Mun Stephane, A0273409B
    let mongoServer;
    let app;
    let userId;
    let oldPassword;
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
        jest.restoreAllMocks();
        oldPassword = 'alice password'
        let user_hash_password = await hashPassword(oldPassword)
        const user = await userModel.create(
            { name: 'Alice', email: 'alice@example.com', password: user_hash_password, phone: '87654321', address: 'alice address', answer: 'alice answer', role: 0 }
        );
        userId = user._id
    })


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

    it("should respond with 200 and new user if update with password is successful", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);

        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token)
            .send({
                name: "Bob",
                password: "bob password",
                phone: "12345678",
                address: "bob address",
            });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Profile updated successfully");
        expect(response.body.updatedUser).toMatchObject(
            expect.objectContaining({
                name: "Bob",
                phone: "12345678",
                address: "bob address",
            })
        );
        const isPasswordMatch = await comparePassword(
            'bob password',
            response.body.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it("should respond with 200 and same user if there are no updates", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);

        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Profile updated successfully");
        expect(response.body.updatedUser).toMatchObject(
            expect.objectContaining({
                name: "Alice",
                phone: "87654321",
                address: "alice address",
            })
        );
        const isPasswordMatch = await comparePassword(
            oldPassword,
            response.body.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it("should return response json with error if password is 5 characters", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);
        const findByIdAndUpdateSpy = jest.spyOn(userModel, "findByIdAndUpdate");

        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token)
            .send({
                password: "12345",
            });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.error).toBe("Password is required and 6 character long");
        findByIdAndUpdateSpy.mockRestore();
    });


    it("should return response with 200 if password is 6 characters", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);


        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token)
            .send({
                password: "123456",
            });

        // Assert
        expect(response.status).toBe(200);
        const isPasswordMatch = await comparePassword(
            '123456',
            response.body.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it("should return response with 200 if password is 7 characters", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);


        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token)
            .send({
                password: "1234567",
            });

        // Assert
        expect(response.status).toBe(200);
        const isPasswordMatch = await comparePassword(
            '1234567',
            response.body.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it("should respond with 500 and message if user id is missing", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({}, testJwtSecret);

        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token)
            .send({
                password: "123456",
            });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Error while updating profile");
        expect(response.body.error).toBeDefined();
    });

    it("should return 401 status and error message if authorization is missing", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid or expired token");
    });

    it("should return 401 status and error message if request does not have the correct JWTSecret", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, "wrong JwtSecret");

        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid or expired token");
    });

    it("should return 200 but no new user if user id cannot be found", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: new mongoose.Types.ObjectId() }, testJwtSecret);

        // Act
        const response = await request(app)
            .put("/api/v1/auth/profile")
            .set("authorization", token)
            .send({
                name: "Bob",
                password: "bob password",
                phone: "12345678",
                address: "bob address",
            });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Profile updated successfully");
        expect(response.body.updatedUser).toBeNull();
    });
});