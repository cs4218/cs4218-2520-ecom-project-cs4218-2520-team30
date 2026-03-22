// Leong Soon Mun Stephane, A0273409B
import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getOrdersController } from "./authController.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

describe('Integrating getOrdersController with models', () => { // Leong Soon Mun Stephane, A0273409B
    let mongoServer;
    let user_id;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    beforeEach(async () => {
        const user1 = await userModel.create(
            { name: 'Alice', email: 'alice@example.com', password: 'alice password', phone: '87654321', address: 'alice address', answer: 'alice answer', role: 0 }
        );
        user_id = user1._id;


        const user2 = await userModel.create(
            { name: 'Bob', email: 'bob@example.com', password: 'bob password', phone: '12345678', address: 'bob address', answer: 'bob answer', role: 1 }
        );

        const categoryId = new mongoose.Types.ObjectId();

        const product1 = await productModel.create({
            name: 'Mechanical Keyboard',
            slug: 'mechanical-keyboard',
            description: 'A clicky mechanical keyboard',
            price: 89.99,
            category: categoryId,
            quantity: 50,
            shipping: true,
            photo: {
                data: Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD....", "base64"),
                contentType: "image/jpeg",
            }
        });

        const product2 = await productModel.create({
            name: 'Wireless Mouse',
            slug: 'wireless-mouse',
            description: 'An ergonomic wireless mouse',
            price: 45.99,
            category: categoryId,
            quantity: 100,
            shipping: true,
            photo: {
                data: Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD....", "base64"),
                contentType: "image/jpeg",
            }
        });


        const order1 = await orderModel.create({
            products: [product1._id],
            payment: {
                method: 'credit_card',
                transactionId: 'txn_abc123',
                amount: 135.98,
            },
            buyer: user1._id,
            status: 'Not Process',
        });

        const order2 = await orderModel.create({
            products: [product2._id],
            payment: {
                method: 'credit_card',
                transactionId: 'txn_abc123',
                amount: 135.98,
            },
            buyer: user2._id,
            status: 'Not Process',
        });
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


    it('should call json response with user orders if successful', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: user_id
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getOrdersController(req, res);

        // Assert
        expect(res.json).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    buyer: expect.objectContaining({
                        name: "Alice",
                    }),
                    products: expect.arrayContaining([
                        expect.objectContaining({
                            name: "Mechanical Keyboard",
                            slug: "mechanical-keyboard",
                            description: "A clicky mechanical keyboard",
                            price: 89.99,
                            category: expect.anything(),
                            quantity: 50,
                            shipping: true,
                            createdAt: expect.any(Date),
                            updatedAt: expect.any(Date),
                        }),
                    ]),
                    payment: expect.objectContaining({
                        method: "credit_card",
                        transactionId: "txn_abc123",
                        amount: 135.98,
                    }),
                    status: "Not Process",
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                }),
            ])
        );
    });

    it('should call json response without product photo if successful', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: user_id
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getOrdersController(req, res);

        // Assert
        const orders = res.json.mock.calls[0][0];
        const firstProduct = orders[0].products[0];
        expect(Object.prototype.hasOwnProperty.call(firstProduct, "photo")).toBe(false);
    });

    it('should call json response with empty orders if user id does not have orders', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: new mongoose.Types.ObjectId()
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getOrdersController(req, res);

        // Assert
        expect (res.json).toHaveBeenCalledWith([]);
    });

    it('should respond with 500 and message if user id is not ObjectId Type', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {
                _id: 1
            }
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getOrdersController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error: expect.anything(),
        });
    });

    it('should call json response with empty orders if id is null', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {
            user: {},
        };
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getOrdersController(req, res);

        // Assert
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should respond with 500 and message if user field is empty', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let req = {};
        let res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };

        // Act
        await getOrdersController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error: expect.anything(),
        });
    });
});
