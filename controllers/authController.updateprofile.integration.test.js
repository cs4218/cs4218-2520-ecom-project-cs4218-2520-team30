// Leong Soon Mun Stephane, A0273409B
import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { updateProfileController } from "./authController.js";
import userModel from "../models/userModel.js";
import { comparePassword, hashPassword } from "./../helpers/authHelper.js";

describe('Integrating updateProfileController with userModel', () => { // Leong Soon Mun Stephane, A0273409B
    let mongoServer;
    let uri;
    let userId;
    let oldPassword;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        await mongoose.connect(uri);
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

    it('should respond with 200 and new user if update with password is successful', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: userId,
            },
            body: {
                name: "Bob",
                password: "bob password",
                phone: "12345678",
                address: "bob address",
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith({
            success: true,
            message: "Profile updated successfully",
            updatedUser: expect.objectContaining({
                name: "Bob",
                phone: "12345678",
                address: "bob address",
            }),
        });
        const payload = res.send.mock.calls[0][0];
        const isPasswordMatch = await comparePassword(
            req.body.password,
            payload.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it('should respond with 200 and same user if there are no updates', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: userId,
            },
            body: {
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith({
            success: true,
            message: "Profile updated successfully",
            updatedUser: expect.objectContaining({
                name: "Alice",
                phone: "87654321",
                address: "alice address",
            }),
        });
        const payload = res.send.mock.calls[0][0];
        const isPasswordMatch = await comparePassword(
            oldPassword,
            payload.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it('should return response json with error if password is 5 characters', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: userId,
            },
            body: {
                password: "12345",
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        const findByIdAndUpdateSpy = jest.spyOn(userModel, "findByIdAndUpdate");


        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toBeCalledWith({ error: "Password is required and 6 character long" });
    });

    it('should return response with 200 if password is 6 characters', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: userId,
            },
            body: {
                password: "123456",
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith({
            success: true,
            message: "Profile updated successfully",
            updatedUser: expect.objectContaining({
                name: "Alice",
                phone: "87654321",
                address: "alice address",
            }),
        });
        const payload = res.send.mock.calls[0][0];
        const isPasswordMatch = await comparePassword(
            req.body.password,
            payload.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it('should return response with 200 if password is 7 characters', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: userId,
            },
            body: {
                password: "1234567",
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith({
            success: true,
            message: "Profile updated successfully",
            updatedUser: expect.objectContaining({
                name: "Alice",
                phone: "87654321",
                address: "alice address",
            }),
        });
        const payload = res.send.mock.calls[0][0];
        const isPasswordMatch = await comparePassword(
            req.body.password,
            payload.updatedUser.password
        );
        expect(isPasswordMatch).toBe(true);
    });

    it('should respond with 500 and message if user id is missing', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
            },
            body: {
                name: "Bob",
                password: "bob password",
                phone: "12345678",
                address: "bob address",
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        const findByIdAndUpdateSpy = jest.spyOn(userModel, "findByIdAndUpdate");


        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toBeCalledWith(500);
        expect(res.send).toBeCalledWith({
            success: false,
            message: "Error while updating profile",
            error: expect.anything(),
        });
        expect(findByIdAndUpdateSpy).not.toHaveBeenCalled();
        findByIdAndUpdateSpy.mockRestore();
    });

    it('should respond with 500 and message if user field is missing', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            body: {
                name: "Bob",
                password: "bob password",
                phone: "12345678",
                address: "bob address",
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        const findByIdAndUpdateSpy = jest.spyOn(userModel, "findByIdAndUpdate");


        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toBeCalledWith(500);
        expect(res.send).toBeCalledWith({
            success: false,
            message: "Error while updating profile",
            error: expect.anything(),
        });
        expect(findByIdAndUpdateSpy).not.toHaveBeenCalled();
        findByIdAndUpdateSpy.mockRestore();
    });
});