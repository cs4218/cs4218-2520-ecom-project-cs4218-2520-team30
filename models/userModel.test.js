// Leong Soon Mun Stephane, A0273409B
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import userModel from './userModel';

describe("userModel", () => { // Leong Soon Mun Stephane, A0273409B
    let userMock;

    beforeEach(() => {
        userMock = {
            name: null,
            email: null,
            password: null,
            phone: null,
            address: null,
            answer: null,
        }
    });

    it("should validate successfully if fields are valid", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        userMock.name = "johndoe";
        userMock.email = "johndoe@gmail.com";
        userMock.password = "password123";
        userMock.phone = "87654321";
        userMock.address = "johndoe address";
        userMock.answer = "johndoe answer";

        // Act
        let user = new userModel(userMock);
        let error = user.validateSync();

        // Assert
        expect(error).toBeUndefined();
    });

    it("should throw validation error if required fields are missing", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        let user = new userModel(userMock);
        let error = user.validateSync();

        // Assert
        expect(error).toBeDefined();
        expect(error.errors["name"]).toBeDefined();
        expect(error.errors["email"]).toBeDefined();
        expect(error.errors["password"]).toBeDefined();
        expect(error.errors["phone"]).toBeDefined();
        expect(error.errors["answer"]).toBeDefined();
    });

    it("should have unique constraint on email field", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let emailField = userModel.schema.path('email');

        // Assert
        expect(emailField.options.unique).toBe(true);
    });

    it("should trim name", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        userMock.name = "       johndoe      ";
        userMock.email = "johndoe@gmail.com";
        userMock.password = "password123";
        userMock.phone = "87654321";
        userMock.address = "johndoe address";
        userMock.answer = "johndoe answer";

        // Act
        let user = new userModel(userMock);
        let error = user.validateSync();

        // Assert
        expect(user.name).toBe("johndoe")
    });

    it("should have 0 as default for role", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        userMock.name = "johndoe";
        userMock.email = "johndoe@gmail.com";
        userMock.password = "password123";
        userMock.phone = "87654321";
        userMock.address = "johndoe address";
        userMock.answer = "johndoe answer";

        // Act
        let user = new userModel(userMock);

        // Assert
        expect(user.role).toBe(0)
    });
});