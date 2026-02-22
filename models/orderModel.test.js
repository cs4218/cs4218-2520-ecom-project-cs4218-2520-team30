// Leong Soon Mun Stephane, A0273409B
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import orderModel from './orderModel';

describe("orderModel", () => { // Leong Soon Mun Stephane, A0273409B

    it("should have suitable field type", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let productsField = orderModel.schema.path('products');
        let paymentField = orderModel.schema.path('payment');
        let buyerField = orderModel.schema.path('buyer');
        let statusField = orderModel.schema.path('status');

        // Assert
        expect(productsField.instance).toBe("Array");
        expect(paymentField.instance).toBe("Mixed");
        expect(buyerField.instance).toBe("ObjectId");
        expect(statusField.instance).toBe("String");
    });


    it("should have Not Process as default for status", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let statusField = orderModel.schema.path('status');

        // Assert
        expect(statusField.options.default).toBe("Not Process");
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