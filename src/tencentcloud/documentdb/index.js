/**
 * Cloud Function Database ORM Wrapper
 * Provides an ORM-like interface for database operations
 * Supports create, update, delete, find, and all operations
 * Uses native WeChat Cloud Database query syntax
 *
 * Usage example:
 * const createCollection = require('./db-wrapper');
 * const users = createCollection(wx.cloud, 'users');
 * const _ = users.command;
 *
 * // Create user
 * const user = await users.create({name: 'Alice', age: 30});
 *
 * // Query user
 * const foundUser = await users.find('user_id');
 * const adults = await users.all({age: _.gte(18)});
 *
 * // Update user
 * await users.update('user_id', {age: 31});
 * await users.update({status: _.eq('pending')}, {status: 'active'});
 *
 * // Delete user
 * const deletedIds = await users.delete({age: _.lt(13)});
 */

// Error handling function - checks WeChat Cloud Database result
const handleDbResult = (result, operation) => {
  if (!result.errMsg || !result.errMsg.includes(':ok')) {
    throw new Error(`Database ${operation} failed: ${result.errMsg || 'Unknown error'}`);
  }
  return result;
};

/**
 * Create collection operation object
 * @param {Object} cloud - WeChat Cloud Development instance (wx.cloud)
 * @param {string} collectionName - Collection name
 * @param {Object} [options] - Optional configuration
 * @param {Object} [options.logger] - Logger instance for logging operations
 * @returns {Object} Object containing database operation methods
 */
const createCollection = (cloud, collectionName, options = {}) => {
  if (!cloud || !cloud.database) {
    throw new Error('Cloud instance is required and must have database method');
  }
  if (!collectionName || typeof collectionName !== 'string') {
    throw new Error('Collection name must be a non-empty string');
  }

  const db = cloud.database();
  const collection = db.collection(collectionName);
  const logger = options.logger;

  // Export db.command for user usage
  const _ = db.command;

  return {
    /**
     * Create document
     * @param {Object} doc - Document data to create
     * @returns {Object} Complete created document (including _id)
     */
    async create(doc) {
      if (!doc || typeof doc !== 'object') {
        throw new Error('Document must be an object');
      }

      try {
        logger && logger.debug(`Creating document in collection ${collectionName}`);

        const result = await collection.add({
          data: doc
        });

        handleDbResult(result, 'create');

        logger && logger.debug(`Document created with _id: ${result._id}`);

        return {
          _id: result._id,
          ...doc
        };
      } catch (error) {
        logger && logger.error(`Create document failed in ${collectionName}: ${error.message}`);
        throw new Error(`Create document failed: ${error.message}`);
      }
    },

    /**
     * Update document
     * @param {string|Object} condition - Document ID string or where query object
     * @param {Object} updateDoc - Fields to update
     * @returns {Object} {success: boolean, count: number}
     * @throws {Error} When update operation fails
     */
    async update(condition, updateDoc) {
      if (!condition) {
        throw new Error('Update condition is required');
      }
      if (!updateDoc || typeof updateDoc !== 'object') {
        throw new Error('Update document must be an object');
      }

      try {
        logger && logger.debug(`Updating document(s) in collection ${collectionName}`);

        let query;

        if (typeof condition === 'string') {
          query = collection.doc(condition);
        } else {
          query = collection.where(condition);
        }

        const result = await query.update({
          data: updateDoc
        });

        handleDbResult(result, 'update');

        logger && logger.debug(`Updated ${result.stats?.updated || 0} document(s)`);

        return {
          success: true,
          count: result.stats?.updated || 0
        };
      } catch (error) {
        logger && logger.error(`Update document failed in ${collectionName}: ${error.message}`);
        throw new Error(`Update document failed: ${error.message}`);
      }
    },

    /**
     * Delete document
     * @param {string|Object} condition - Document ID string or where query object
     * @returns {Array<string>} Array of deleted document IDs
     */
    async delete(condition) {
      if (!condition) {
        throw new Error('Delete condition is required');
      }

      try {
        logger && logger.debug(`Deleting document(s) in collection ${collectionName}`);

        let query;
        let deletedIds = [];

        if (typeof condition === 'string') {
          query = collection.doc(condition);
          deletedIds = [condition];
        } else {
          // First query the document IDs to delete
          const findResult = await collection.where(condition).field({ _id: true }).get();
          handleDbResult(findResult, 'query for delete');

          deletedIds = findResult.data.map(doc => doc._id);
          query = collection.where(condition);
        }

        const result = await query.remove();
        handleDbResult(result, 'delete');

        logger && logger.debug(`Deleted ${deletedIds.length} document(s)`);

        return deletedIds;
      } catch (error) {
        logger && logger.error(`Delete document failed in ${collectionName}: ${error.message}`);
        throw new Error(`Delete document failed: ${error.message}`);
      }
    },

    /**
     * Find single document
     * @param {string|Object} condition - Document ID string or where query object
     * @returns {Object|null} Found document or null
     */
    async find(condition) {
      if (!condition) {
        throw new Error('Find condition is required');
      }

      try {
        logger && logger.debug(`Finding document in collection ${collectionName}`);

        let query;

        if (typeof condition === 'string') {
          query = collection.doc(condition);
          const result = await query.get();
          handleDbResult(result, 'find by id');

          logger && logger.debug(`Found document by id: ${condition}`);

          return result.data || null;
        } else {
          query = collection.where(condition).limit(1);
          const result = await query.get();
          handleDbResult(result, 'find by condition');

          logger && logger.debug(`Found ${result.data?.length || 0} document(s) by condition`);

          return result.data?.[0] || null;
        }
      } catch (error) {
        // Return null when find operation fails, instead of throwing exception
        logger && logger.warn(`Find document failed in ${collectionName}: ${error.message}`);
        return null;
      }
    },

    /**
     * Find multiple documents
     * @param {Object} [queryOptions]
     * @param {Object} [queryOptions.where] - Query conditions object
     * @param {Object} [queryOptions.orderBy] - Map of field to sort direction ('asc'|'desc')
     * @param {number} [queryOptions.limit] - Max number of documents to return
     * @param {number} [queryOptions.skip] - Number of documents to skip (pagination)
     * @param {Object} [queryOptions.field] - Field projection definition
     * @returns {Array<Object>} Array of documents
     */
    async all(queryOptions = {}) {
      try {
        logger && logger.debug(`Querying documents in collection ${collectionName}`);

        if (queryOptions !== undefined && (typeof queryOptions !== 'object' || Array.isArray(queryOptions))) {
          throw new Error('Query options must be an object');
        }

        const {
          where,
          orderBy,
          limit,
          skip,
          field
        } = queryOptions || {};

        let query = collection;

        if (where !== undefined) {
          if (!where || typeof where !== 'object' || Array.isArray(where)) {
            throw new Error('`where` must be an object');
          }

          if (Object.keys(where).length > 0) {
            query = query.where(where);
          }
        }

        if (orderBy !== undefined) {
          if (!orderBy || typeof orderBy !== 'object' || Array.isArray(orderBy)) {
            throw new Error('`orderBy` must be an object with field: direction pairs');
          }

          for (const [fieldName, direction] of Object.entries(orderBy)) {
            if (typeof fieldName !== 'string' || !fieldName) {
              throw new Error('`orderBy` field names must be non-empty strings');
            }
            if (direction !== 'asc' && direction !== 'desc') {
              throw new Error('`orderBy` direction must be either "asc" or "desc"');
            }
            query = query.orderBy(fieldName, direction);
          }
        }

        if (limit !== undefined) {
          if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
            throw new Error('`limit` must be a positive number');
          }
          query = query.limit(limit);
        }

        if (skip !== undefined) {
          if (typeof skip !== 'number' || !Number.isFinite(skip) || skip < 0) {
            throw new Error('`skip` must be a non-negative number');
          }
          query = query.skip(skip);
        }

        if (field !== undefined) {
          if (!field || typeof field !== 'object' || Array.isArray(field)) {
            throw new Error('`field` must be an object');
          }
          if (Object.keys(field).length > 0) {
            query = query.field(field);
          }
        }

        const result = await query.get();
        handleDbResult(result, 'find all');

        logger && logger.debug(`Found ${result.data?.length || 0} document(s)`);

        return result.data || [];
      } catch (error) {
        logger && logger.error(`Query documents failed in ${collectionName}: ${error.message}`);
        throw new Error(`Query documents failed: ${error.message}`);
      }
    },

    // Export db.command for user to use query operators
    command: _
  };
};

// CommonJS export
module.exports = {createCollection};
