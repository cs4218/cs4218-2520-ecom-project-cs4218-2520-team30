import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper.js";

jest.mock("bcrypt");

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * Test hashPassword function
 * Testing Type: mocking bcrypt + password lengths
 */
describe("Auth Helper - hashPassword", () => {

  describe("Successful Hashing - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should hash a valid password successfully", async () => {
      // Arrange
      const password = "mySecurePassword123";
      const hashedValue = "$2b$10$hashedPasswordValue";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });

    //Tay Kai Jun, A0283343E
    test("should use salt rounds of 10", async () => {
      // Arrange
      const password = "testPassword";
      const hashedValue = "$2b$10$anotherHashedValue";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    //Tay Kai Jun, A0283343E
    test("should return different hashes for different passwords", async () => {
      // Arrange
      bcrypt.hash.mockImplementation((pwd) => 
        Promise.resolve(`$2b$10$hash_${pwd}`)
      );

      // Act
      const hash1 = await hashPassword("password1");
      const hash2 = await hashPassword("password2");

      // Assert
      expect(hash1).not.toBe(hash2);
      expect(hash1).toContain("password1");
      expect(hash2).toContain("password2");
    });
  });

  describe("Password Length - Boundary Values", () => {
    //Tay Kai Jun, A0283343E
    test("should hash minimum length password (1 character)", async () => {
      // Arrange
      const password = "a";
      const hashedValue = "$2b$10$hashForSingleChar";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });

    //Tay Kai Jun, A0283343E
    test("should hash typical length password (8-12 characters)", async () => {
      // Arrange
      const password = "password123";
      const hashedValue = "$2b$10$hashForTypicalPassword";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });

    //Tay Kai Jun, A0283343E
    test("should hash very long password (100+ characters)", async () => {
      // Arrange
      const password = "a".repeat(150);
      const hashedValue = "$2b$10$hashForLongPassword";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });

    //Tay Kai Jun, A0283343E
    test("should hash empty string password (boundary at 0)", async () => {
      // Arrange
      const password = "";
      const hashedValue = "$2b$10$hashForEmpty";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });
  });

  describe("Special Characters - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should hash password with special characters", async () => {
      // Arrange
      const password = "P@ssw0rd!#$%";
      const hashedValue = "$2b$10$hashForSpecialChars";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });

    //Tay Kai Jun, A0283343E
    test("should hash password with unicode characters", async () => {
      // Arrange
      const password = "pāsswörd123™";
      const hashedValue = "$2b$10$hashForUnicode";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });

    //Tay Kai Jun, A0283343E
    test("should hash password with spaces", async () => {
      // Arrange
      const password = "my password 123";
      const hashedValue = "$2b$10$hashForSpaces";
      bcrypt.hash.mockResolvedValue(hashedValue);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedValue);
    });
  });

  describe("Error Handling", () => {
    //Tay Kai Jun, A0283343E
    test("should handle bcrypt error", async () => {
      // Arrange
      const password = "testPassword";
      const error = new Error("Bcrypt hashing failed");
      bcrypt.hash.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act & Assert
      await expect(hashPassword(password)).rejects.toThrow("Bcrypt hashing failed");
      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle memory allocation error", async () => {
      // Arrange
      const password = "testPassword";
      const error = new Error("Out of memory");
      bcrypt.hash.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act & Assert
      await expect(hashPassword(password)).rejects.toThrow("Out of memory");
      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });
  });
});

/**
 * Test comparePassword function
 */
describe("Auth Helper - comparePassword", () => {

  describe("Successful Password Comparison", () => {
    //Tay Kai Jun, A0283343E
    test("should return true when passwords match", async () => {
      // Arrange
      const plainPassword = "myPassword123";
      const hashedPassword = "$2b$10$hashedVersion";
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    //Tay Kai Jun, A0283343E
    test("should return false when passwords do not match", async () => {
      // Arrange
      const plainPassword = "wrongPassword";
      const hashedPassword = "$2b$10$correctHash";
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    //Tay Kai Jun, A0283343E
    test("should handle correct comparison with special characters", async () => {
      // Arrange
      const plainPassword = "P@ssw0rd!#$";
      const hashedPassword = "$2b$10$specialCharsHash";
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });
  });

  describe("Boundary Cases - Password Matching", () => {
    //Tay Kai Jun, A0283343E
    test("should return false for empty string vs hash", async () => {
      // Arrange
      const plainPassword = "";
      const hashedPassword = "$2b$10$someHash";
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    //Tay Kai Jun, A0283343E
    test("should return false when password differs by one character", async () => {
      // Arrange
      const plainPassword = "password123";
      const hashedPassword = "$2b$10$hashForPassword124";
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    //Tay Kai Jun, A0283343E
    test("should return false when password differs by case", async () => {
      // Arrange
      const plainPassword = "Password123";
      const hashedPassword = "$2b$10$hashForpassword123";
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });
  });

  describe("Invalid Hash Format - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should handle invalid hash format", async () => {
      // Arrange
      const plainPassword = "testPassword";
      const hashedPassword = "not-a-valid-hash";
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    //Tay Kai Jun, A0283343E
    test("should handle null hash", async () => {
      // Arrange
      const plainPassword = "testPassword";
      const hashedPassword = null;
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, null);
      expect(result).toBe(false);
    });

    //Tay Kai Jun, A0283343E
    test("should handle undefined hash", async () => {
      // Arrange
      const plainPassword = "testPassword";
      const hashedPassword = undefined;
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, undefined);
      expect(result).toBe(false);
    });
  });

  describe("Error Handling", () => {
    //Tay Kai Jun, A0283343E
    test("should propagate bcrypt comparison error", async () => {
      // Arrange
      const plainPassword = "testPassword";
      const hashedPassword = "$2b$10$someHash";
      const error = new Error("Bcrypt comparison failed");
      bcrypt.compare.mockRejectedValue(error);

      // Act & Assert
      await expect(comparePassword(plainPassword, hashedPassword)).rejects.toThrow("Bcrypt comparison failed");
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    //Tay Kai Jun, A0283343E
    test("should handle invalid bcrypt hash error", async () => {
      // Arrange
      const plainPassword = "testPassword";
      const hashedPassword = "invalid";
      const error = new Error("Invalid hash");
      bcrypt.compare.mockRejectedValue(error);

      // Act & Assert
      await expect(comparePassword(plainPassword, hashedPassword)).rejects.toThrow("Invalid hash");
    });

    //Tay Kai Jun, A0283343E
    test("should log error to console when comparison fails", async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const plainPassword = "testPassword";
      const hashedPassword = "$2b$10$someHash";
      const error = new Error("Bcrypt comparison failed");
      bcrypt.compare.mockRejectedValue(error);

      // Act
      try {
        await comparePassword(plainPassword, hashedPassword);
        // Should not reach here
        fail("Expected comparePassword to throw");
      } catch (thrownError) {
        // Assert
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(error);
        expect(thrownError).toEqual(error);
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe("Different Hash Algorithms - Edge Cases", () => {
    //Tay Kai Jun, A0283343E
    test("should handle comparison with different salt rounds", async () => {
      // Arrange
      const plainPassword = "password123";
      const hashedPassword = "$2b$12$differentSaltRounds";
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(result).toBe(true);
    });

    //Tay Kai Jun, A0283343E
    test("should handle comparison with bcrypt variant", async () => {
      // Arrange
      const plainPassword = "password123";
      const hashedPassword = "$2a$10$bcryptVariantA";
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(result).toBe(true);
    });
  });
});
