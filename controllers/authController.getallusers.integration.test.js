// Leong Soon Mun Stephane, A0273409B
import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getAllUsersController } from "./authController.js";
import userModel from "../models/userModel.js";

describe('Integrating getAllUsersController with userModel', () => { // Leong Soon Mun Stephane, A0273409B
    let mongoServer;
    let uri;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    beforeEach(async () => {
        const user1 = await userModel.create(
            { name: 'Alice', email: 'alice@example.com', password: 'alice password', phone: '87654321', address: 'alice address', answer: 'alice answer', role: 0 }
        );

        const user2 = await userModel.create(
            { name: 'Bob', email: 'bob@example.com', password: 'bob password', phone: '12345678', address: 'bob address', answer: 'bob answer', role: 1 }
        );

        const users3 = await userModel.create(
            { name: 'Charlie', email: 'charlie@example.com', password: 'charlie password', phone: '12348765', address: 'charlie address', answer: 'charlie answer', role: 0 }
        );

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

    it('should respond with 200 and get all users if successful', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {};
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getAllUsersController(req, res);

        // Assert
        expect(res.json).toBeCalledWith(expect.arrayContaining([
                expect.objectContaining({ name: 'Alice', email: 'alice@example.com', phone: '87654321', address: 'alice address', role: 0, }),
                expect.objectContaining({ name: 'Bob', email: 'bob@example.com', phone: '12345678', address: 'bob address', role: 1 }),
                expect.objectContaining({ name: 'Charlie', email: 'charlie@example.com', phone: '12348765', address: 'charlie address', role: 0 }),
            ]));
    });

    it('should respond with 200 and without password and answer if successful', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {};
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getAllUsersController(req, res);

        // Assert
        const users = res.json.mock.calls[0][0];
        const user1 = users[0];
        expect(Object.prototype.hasOwnProperty.call(user1, "password")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(user1, "answer")).toBe(false);
        const user2 = users[1];
        expect(Object.prototype.hasOwnProperty.call(user2, "password")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(user2, "answer")).toBe(false);
        const user3 = users[2];
        expect(Object.prototype.hasOwnProperty.call(user3, "password")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(user3, "answer")).toBe(false);
    });

    it('should respond with 500 and message if database gets disconnected', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {};
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await mongoose.disconnect()
        await getAllUsersController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Users",
            error: expect.anything(),
        });

        await mongoose.connect(uri)
    });
});
