// Leong Soon Mun Stephane, A0273409B
import { jest, describe, it, expect } from "@jest/globals";
import orderModel from './orderModel';
import mongoose from "mongoose";

describe("orderModel", () => { // Leong Soon Mun Stephane, A0273409B

    it("should validate successfully if fields are valid", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let orderMock = {
            products: new mongoose.Types.ObjectId(),
            payment: 'card',
            buyer: new mongoose.Types.ObjectId(),
        }

        // Act
        let order = new orderModel(orderMock);
        let error = order.validateSync();

        // Assert
        expect(error).toBeUndefined();
    });

    it("should invalidate if status is not part of enum", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let orderMock = {
            products: new mongoose.Types.ObjectId(),
            payment: 'card',
            buyer: new mongoose.Types.ObjectId(),
            status: "not an enum"
        }

        // Act
        let order = new orderModel(orderMock);
        let error = order.validateSync();

        // Assert
        expect(error).toBeDefined();
        expect(error.errors["status"]).toBeDefined();
    });

    it("should have Not Process as default for status", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let orderMock = {
            products: new mongoose.Types.ObjectId(),
            payment: 'card',
            buyer: new mongoose.Types.ObjectId(),

        }

        // Act
        let order = new orderModel(orderMock);

        // Assert
        expect(order.status).toBe("Not Process");
    });

    it("should have users as ref for buyer", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let buyerField = orderModel.schema.path('buyer');

        // Assert
        expect(buyerField.options.ref).toBe("users");
    });

    it("should have users as ref for products", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let productsField = orderModel.schema.path('products');

        // Assert
        expect(productsField.caster.options.ref).toBe("Products");
    });
});