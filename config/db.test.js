const mongoose = require('mongoose');

jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

const connectDB = require('./db').default;

describe('connectDB', () => {
  const originalEnv = process.env;
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, MONGO_URL: 'mongodb://test-url' };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
  });

  it('calls mongoose.connect and logs success on successful connection', async () => {
    // Arrange: mock connect to resolve
    mongoose.connect.mockResolvedValue({ connection: { host: 'some-host' } });
    // Act: call connectDB
    await connectDB();
    // Assert: connect called once with MONGO_URL, success message logged
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URL);
    const logged = consoleLogSpy.mock.calls.flat().join(' ');
    expect(logged).toContain('Connected To Mongodb Database');
    expect(logged).toContain('some-host');
  });

  it('logs error when connection fails', async () => {
    // Arrange: mock connect to reject
    const err = new Error('Connection refused');
    mongoose.connect.mockRejectedValue(err);
    // Act: call connectDB (no throw - catch handles it)
    await connectDB();
    // Assert: error message was logged
    const logged = consoleLogSpy.mock.calls.flat().join(' ');
    expect(logged).toContain('Error in Mongodb');
    expect(logged).toContain('Connection refused');
  });
});
