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
        jest.resetAllMocks();
    });

    it("should validate successfully if fields are valid", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        userMock.name = "johndoe";
        userMock.email = "johndoe@gmail.com";
        userMock.password = "password123";
        userMock.phone = "87654321";
        userMock.address = "johndoe address";
        userMock.answer = "johndoe answer";

        let user = new userModel(userMock);

        // Act
        let error = user.validateSync();

        // Assert
        expect(error).toBeUndefined();
    });

    it("should throw validation error if required fields are missing", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let user = new userModel(userMock);

        // Act
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

    it("should have suitable field type", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let nameField = userModel.schema.path('name');
        let emailField = userModel.schema.path('email');
        let passwordField = userModel.schema.path('password');
        let phoneField = userModel.schema.path('phone');
        let addressField = userModel.schema.path('address');
        let answerField = userModel.schema.path('answer');
        let roleField = userModel.schema.path('role');

        // Assert
        expect(nameField.instance).toBe("String");
        expect(emailField.instance).toBe("String");
        expect(passwordField.instance).toBe("String");
        expect(phoneField.instance).toBe("String");
        expect(addressField.instance).toBe("Mixed");
        expect(answerField.instance).toBe("String");
        expect(roleField.instance).toBe("Number");
    });

    it("should have trim option for name", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let nameField = userModel.schema.path('name');

        // Assert
        expect(nameField.options.trim).toBe(true);
    });

    it("should be required for fields except role", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let nameField = userModel.schema.path('name');
        let emailField = userModel.schema.path('email');
        let passwordField = userModel.schema.path('password');
        let phoneField = userModel.schema.path('phone');
        let addressField = userModel.schema.path('address');
        let answerField = userModel.schema.path('answer');
        let roleField = userModel.schema.path('role');


        // Assert
        expect(nameField.isRequired).toBe(true);
        expect(emailField.isRequired).toBe(true);
        expect(passwordField.isRequired).toBe(true);
        expect(phoneField.isRequired).toBe(true);
        expect(addressField.isRequired).toBe(true);
        expect(answerField.isRequired).toBe(true);
        expect(roleField.isRequired).not.toBe(true);
    });

    it("should have 0 as default for role", () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let roleField = userModel.schema.path('role');

        // Assert
        expect(roleField.options.default).toBe(0);
    });
});