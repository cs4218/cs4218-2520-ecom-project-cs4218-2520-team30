jest.mock('braintree', () => {
  const mockGenerate = jest.fn();
  const mockSale = jest.fn();
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate: mockGenerate },
      transaction: { sale: mockSale },
    })),
    Environment: { Sandbox: 'Sandbox' },
    mockGenerate,
    mockSale,
  };
});

jest.mock('../models/orderModel.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({}),
  })),
}));

import {
  braintreeTokenController,
  brainTreePaymentController,
} from './productController.js';
import { mockGenerate, mockSale } from 'braintree';

describe('Payment Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { _id: '123' }, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  describe('braintreeTokenController', () => {
    it('should send client token on success', async () => {
      // ARRANGE
      const fakeResponse = { clientToken: 'fake-token-123' };
      mockGenerate.mockImplementation((opts, callback) =>
        callback(null, fakeResponse)
      );

      // ACT
      braintreeTokenController(req, res);

      // ASSERT (mock calls callback synchronously)
      expect(mockGenerate).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(fakeResponse);
    });

    it('should send 500 error on failure', async () => {
      // ARRANGE
      const fakeError = new Error('Braintree Error');
      mockGenerate.mockImplementation((opts, callback) =>
        callback(fakeError, null)
      );

      // ACT
      braintreeTokenController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(fakeError);
    });
  });

  describe('brainTreePaymentController', () => {
    it('should process payment successfully', async () => {
      // ARRANGE
      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 10 }, { price: 20 }],
      };
      const fakeResult = { success: true };
      mockSale.mockImplementation((opts, callback) =>
        callback(null, fakeResult)
      );

      // ACT
      brainTreePaymentController(req, res);

      // ASSERT
      expect(mockSale).toHaveBeenCalled();
      expect(mockSale).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 30,
          paymentMethodNonce: 'fake-nonce',
          options: { submitForSettlement: true },
        }),
        expect.any(Function)
      );
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should send 500 on payment failure', async () => {
      // ARRANGE
      req.body = { nonce: 'fake-nonce', cart: [{ price: 10 }] };
      const fakeError = new Error('Declined');
      mockSale.mockImplementation((opts, callback) =>
        callback(fakeError, null)
      );

      // ACT
      brainTreePaymentController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(fakeError);
    });
  });
});
