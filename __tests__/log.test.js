const flushLogs = () => new Promise((resolve) => setImmediate(resolve));

describe('log module', () => {
  let log;
  let winston;
  let outputChunks;
  let captureStream;

  const getLines = () =>
    outputChunks
      .join('')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length);

  beforeEach(() => {
    jest.resetModules();
    outputChunks = [];

    const { Writable } = require('stream');
    captureStream = new Writable({
      write(chunk, encoding, callback) {
        outputChunks.push(chunk.toString());
        callback();
      }
    });

    winston = require('winston');
    ({ log } = require('../src/log'));
    log.__setTransportFactory(() => [
      new winston.transports.Stream({ stream: captureStream })
    ]);
    log.level = 'info';
  });

  afterEach(() => {
    log.__reset();
  });

  test('formats level tag in uppercase', async () => {
    const logger = log.getLogger();
    logger.info('Test message');
    await flushLogs();

    const [line] = getLines();
    expect(line).toEqual(expect.stringContaining('[INFO]'));
  });

  test('includes context fields from child logger', async () => {
    const logger = log.getLogger({ requestId: 'abc123', userId: 'user456' });
    logger.info('Test message');
    await flushLogs();

    const [line] = getLines();
    expect(line).toEqual(expect.stringContaining('requestId: abc123'));
    expect(line).toEqual(expect.stringContaining('userId: user456'));
  });

  test('separates context and message with hyphen', async () => {
    const logger = log.getLogger({ requestId: 'abc123' });
    logger.info('Test message');
    await flushLogs();

    const [line] = getLines();
    expect(line).toMatch(/requestId: abc123 - Test message$/);
  });

  test('omits hyphen when no context fields present', async () => {
    const logger = log.getLogger();
    logger.info('Test message');
    await flushLogs();

    const [line] = getLines();
    expect(line).not.toContain(' - ');
    expect(line).toMatch(/\[INFO\] .*Test message$/);
  });

  test('respects configured log level', async () => {
    log.level = 'error';
    const logger = log.getLogger({ requestId: 'abc123' });

    logger.debug('Debug message');
    logger.info('Info message');
    logger.error('Error message');
    await flushLogs();

    const lines = getLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\[ERROR\] requestId: abc123 - Error message$/);
  });

  test('includes extra arguments in message output', async () => {
    log.level = 'debug';
    const logger = log.getLogger({ requestId: 1, openId: 2 });
    logger.debug('hello', 'world', { obj: 3 });
    await flushLogs();

    const [line] = getLines();
    expect(line).toMatch(/\[DEBUG\] requestId: 1 openId: 2 - hello world {obj: 3}$/);
  });

  test('prefixes log line with ISO timestamp', async () => {
    const logger = log.getLogger();
    logger.info('Test message');
    await flushLogs();

    const [line] = getLines();
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\]/);
  });
});
