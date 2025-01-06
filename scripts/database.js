import { MessageBoxError } from "./messages.js";
/**
 * A connection to the local IndexedDB database.
 *
 * Merge currently requires data persistence in order to cache responses from the Overpass API as
 * to not unnecessarily re-request the API.
 *
 * ## Usage
 *
 * Each time a connection to the database is required, a new {@link Database} object should be
 * retrieved, used while in the current scope and discarded afterwards. There is little point
 * trying to maintain an active connection.
 */
export class Database {
    static DB_NAME = "Overpass Data";
    static STORE_NAME = "overpass-cache";
    static STORE_OPTIONS = { keyPath: "request" };
    /**
     * Encapsulated instance of an {@link IDBDatabase}.
     *
     * This object is what is used by this class to perform database operations.
     */
    database;
    /**
     * Encapsulate an {@link IDBDatabase} for use within this application.
     *
     * This construction cannot be used to get a valid {@link IDBDatabase} instance, instead being
     * used internally to encapsulate one. To retrieve a valid instance, see
     * {@link Database.connect()}.
     *
     * @param database
     */
    constructor(database) {
        this.database = database;
    }
    /**
     * Retrieve a connection to the {@link Database} and {@link IDBDatabase}.
     *
     * @throws {DatabaseError} If a connection to the database could not be retrieved.
     * @returns
     */
    static async connect() {
        const database = await new Promise(resolve => {
            const req = window.indexedDB.open(Database.DB_NAME);
            // failed connection
            req.onerror = () => {
                throw DatabaseError.CONNECTION_ERROR;
            };
            // blocked connection
            req.onblocked = () => {
                throw DatabaseError.BLOCKED_ERROR;
            };
            // upgrade database
            req.onupgradeneeded = () => {
                const database = req.result;
                database.createObjectStore(Database.STORE_NAME, Database.STORE_OPTIONS);
            };
            // successful connection
            req.onsuccess = () => {
                const database = req.result;
                resolve(database);
            };
        });
        return new Database(database);
    }
    /**
     * Open a new transaction in the database to perform actions on.
     *
     * This method does not expose the {@link IDBTransaction} object, instead requiring clients to
     * designate a function `f` which will be run on the object store inside the transaction.
     *
     * This method signature resembles that of a {@link Promise} and can be used similarly as, when
     * called, this method will wrap the provided function inside a promise to complete the
     * required actions.
     *
     * @param mode The mode for this transaction.
     * @param fn The function for logic to perform on this transaction.
     */
    async transact(mode, fn) {
        // open transaction
        const transaction = this.database.transaction(Database.STORE_NAME, mode);
        const store = transaction.objectStore(Database.STORE_NAME);
        // complete actions
        const data = await new Promise((resolve, reject) => {
            return fn(store, resolve, reject);
        });
        transaction.commit();
        return data;
    }
    /**
     * Retrieve cached data from the database.
     *
     * @param key The key of the cached data.
     * @throws {DatabaseError} If the data could not be retrieved.
     */
    async get(key) {
        return this.transact("readonly", (store, resolve) => {
            const req = store.get(key);
            req.onerror = () => {
                throw DatabaseError.GET_ERROR;
            };
            req.onsuccess = () => {
                const result = req.result;
                if (result === undefined)
                    return resolve(null);
                const json = JSON.parse(result.value);
                resolve(json);
            };
        });
    }
    /**
     * Cache data into the database.
     *
     * @param data The data to cache.
     * @throws {DatabaseError} If the data could not be cached.
     */
    async set(data) {
        return this.transact("readwrite", (store, resolve) => {
            const req = store.put(data);
            req.onerror = () => {
                throw DatabaseError.SET_ERROR;
            };
            req.onsuccess = () => {
                resolve();
            };
        });
    }
}
/**
 * Errors which could occur while opening a new connection to the {@link IDBDatabase}.
 */
export class DatabaseError extends MessageBoxError {
    static CONNECTION_ERROR = new DatabaseError("Could not connect to the local database.");
    static BLOCKED_ERROR = new DatabaseError("Database is awaiting an upgrade, however other connections are still open.");
    static GET_ERROR = new DatabaseError("Could not retrieve data from the database.");
    static SET_ERROR = new DatabaseError("Could not insert data into the database.");
}
