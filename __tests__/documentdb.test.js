const { createCollection } = require('../src/tencentcloud/documentdb');

const createMockQuery = () => {
  const query = {};

  query.where = jest.fn(function where(condition) {
    this.__calls.push({ method: 'where', args: [condition] });
    return this;
  });

  query.orderBy = jest.fn(function orderBy(fieldName, direction) {
    this.__calls.push({ method: 'orderBy', args: [fieldName, direction] });
    return this;
  });

  query.limit = jest.fn(function limit(value) {
    this.__calls.push({ method: 'limit', args: [value] });
    return this;
  });

  query.skip = jest.fn(function skip(value) {
    this.__calls.push({ method: 'skip', args: [value] });
    return this;
  });

  query.field = jest.fn(function field(projection) {
    this.__calls.push({ method: 'field', args: [projection] });
    return this;
  });

  query.get = jest.fn().mockResolvedValue({
    errMsg: 'collection.get:ok',
    data: []
  });

  query.__calls = [];

  return query;
};

const createTestCollection = () => {
  const mockQuery = createMockQuery();

  const db = {
    collection: jest.fn(() => mockQuery),
    command: {}
  };

  const cloud = {
    database: jest.fn(() => db)
  };

  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  const collection = createCollection(cloud, 'todos', { logger });

  return { collection, mockQuery, logger };
};

describe('Tencent Cloud DocumentDB collection all()', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('fetches all documents without filters', async () => {
    const { collection, mockQuery } = createTestCollection();

    mockQuery.get.mockResolvedValue({
      errMsg: 'collection.get:ok',
      data: [{ _id: '1', name: 'Alice' }]
    });

    const result = await collection.all();

    expect(result).toEqual([{ _id: '1', name: 'Alice' }]);
    expect(mockQuery.where).not.toHaveBeenCalled();
    expect(mockQuery.orderBy).not.toHaveBeenCalled();
    expect(mockQuery.limit).not.toHaveBeenCalled();
    expect(mockQuery.skip).not.toHaveBeenCalled();
    expect(mockQuery.field).not.toHaveBeenCalled();
    expect(mockQuery.get).toHaveBeenCalledTimes(1);
  });

  test('applies where, orderBy, limit, skip, and field options', async () => {
    const { collection, mockQuery } = createTestCollection();

    mockQuery.get.mockResolvedValue({
      errMsg: 'collection.get:ok',
      data: [{ _id: '2', name: 'Bob' }]
    });

    const result = await collection.all({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc', name: 'asc' },
      limit: 5,
      skip: 10,
      field: { name: true, status: true }
    });

    expect(result).toEqual([{ _id: '2', name: 'Bob' }]);
    expect(mockQuery.where).toHaveBeenCalledWith({ status: 'active' });
    expect(mockQuery.orderBy).toHaveBeenNthCalledWith(1, 'createdAt', 'desc');
    expect(mockQuery.orderBy).toHaveBeenNthCalledWith(2, 'name', 'asc');
    expect(mockQuery.limit).toHaveBeenCalledWith(5);
    expect(mockQuery.skip).toHaveBeenCalledWith(10);
    expect(mockQuery.field).toHaveBeenCalledWith({ name: true, status: true });
    expect(mockQuery.get).toHaveBeenCalledTimes(1);
  });

  test('throws when orderBy direction is invalid', async () => {
    const { collection, mockQuery } = createTestCollection();

    await expect(
      collection.all({ orderBy: { createdAt: 'invalid' } })
    ).rejects.toThrow('`orderBy` direction must be either "asc" or "desc"');

    expect(mockQuery.orderBy).not.toHaveBeenCalled();
    expect(mockQuery.get).not.toHaveBeenCalled();
  });
});

