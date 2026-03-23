// Leong Soon Mun Stephane, A0273409B
import { describe, it, expect, beforeAll } from "@jest/globals";
import express from "express";
import request from "supertest";
import JWT from "jsonwebtoken";
import router from "./authRoute.js";
import mongoose from "mongoose";

describe("Integrating authRoute with getOrdersController and requireSignIn", () => { // Leong Soon Mun Stephane, A0273409B
    let app;
    const testJwtSecret = "test-secret";
    let userId = new mongoose.Types.ObjectId();

    beforeAll(async () => {
        process.env.JWT_SECRET = testJwtSecret;

        app = express();
        app.use(express.json());
        app.use("/api/v1/auth", router);
    });

    it("should return 200 status and ok if user is signed in", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/user-auth")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
    });

    it("should return 401 status and error message if request does not have the correct JWTSecret", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({ _id: userId }, "wrong JwtSecret");

        // Act
        const response = await request(app)
            .get("/api/v1/auth/user-auth")
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
            .get("/api/v1/auth/user-auth")

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid or expired token");
    });

    it("should return 200 status and ok even if user is signed in without a user id", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const token = JWT.sign({}, testJwtSecret);

        // Act
        const response = await request(app)
            .get("/api/v1/auth/user-auth")
            .set("authorization", token)

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
    });
});