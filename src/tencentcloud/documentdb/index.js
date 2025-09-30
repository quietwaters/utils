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
 * @returns {Object} Object containing database operation methods
 */
const createCollection = (cloud, collectionName) => {
  if (!cloud || !cloud.database) {
    throw new Error('Cloud instance is required and must have database method');
  }
  if (!collectionName || typeof collectionName !== 'string') {
    throw new Error('Collection name must be a non-empty string');
  }

  const db = cloud.database();
  const collection = db.collection(collectionName);

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
        const result = await collection.add({
          data: doc
        });

        handleDbResult(result, 'create');

        return {
          _id: result._id,
          ...doc
        };
      } catch (error) {
        throw new Error(`Create document failed: ${error.message}`);
      }
    },

    /**
     * Update document
     * @param {string|Object} condition - Document ID string or where query object
     * @param {Object} updateDoc - Fields to update
     * @returns {Object} {success: boolean, count: number}
     */
    async update(condition, updateDoc) {
      if (!condition) {
        throw new Error('Update condition is required');
      }
      if (!updateDoc || typeof updateDoc !== 'object') {
        throw new Error('Update document must be an object');
      }

      try {
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

        return {
          success: true,
          count: result.stats?.updated || 0
        };
      } catch (error) {
        return {
          success: false,
          count: 0,
          error: error.message
        };
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

        return deletedIds;
      } catch (error) {
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
        let query;

        if (typeof condition === 'string') {
          query = collection.doc(condition);
          const result = await query.get();
          handleDbResult(result, 'find by id');
          return result.data || null;
        } else {
          query = collection.where(condition).limit(1);
          const result = await query.get();
          handleDbResult(result, 'find by condition');
          return result.data?.[0] || null;
        }
      } catch (error) {
        // Return null when find operation fails, instead of throwing exception
        console.warn(`Find document failed: ${error.message}`);
        return null;
      }
    },

    /**
     * Find multiple documents
     * @param {Object} where - Query condition object, defaults to empty object
     * @returns {Array<Object>} Array of documents
     */
    async all(where = {}) {
      try {
        const query = Object.keys(where).length > 0
          ? collection.where(where)
          : collection;

        const result = await query.get();
        handleDbResult(result, 'find all');

        return result.data || [];
      } catch (error) {
        throw new Error(`Query documents failed: ${error.message}`);
      }
    },

    // Export db.command for user to use query operators
    command: _
  };
};

// CommonJS export
module.exports = createCollection;
