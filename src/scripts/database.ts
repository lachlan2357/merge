import { MessageBoxError } from "./messages.js";
import { OverpassResponse } from "./overpass/structures.js";
import { Oath, OathResult } from "./supplement/oath.js";

/** Structure of how a cached query is stored in the IndexedDB database. */
type CachedQuery = {
	/** The request string that was sent to the Overpass API. */
	request: string;
	/** The response string that was retrieved from the Overpass API. */
	value: string;
};

/**
 * A connection to the local IndexedDB database.
 *
 * Merge currently requires data persistence in order to cache responses from the Overpass API as to
 * not unnecessarily re-request the API.
 *
 * ## Usage
 *
 * Each time a connection to the database is required, a new {@link Database} object should be
 * retrieved, used while in the current scope and discarded afterwards. There is little point trying
 * to maintain an active connection.
 */
export class Database {
	/** Name of the IndexedDB database to use. */
	private static readonly DB_NAME: string = "Overpass Data";

	/** Name of the IndexedDB store to use for caching. */
	private static readonly STORE_NAME: string = "overpass-cache";

	/** Parameters of how to setup the IndexedDB cache store. */
	private static readonly STORE_OPTIONS: IDBObjectStoreParameters = { keyPath: "request" };

	/**
	 * Encapsulated instance of an {@link IDBDatabase}.
	 *
	 * This object is what is used by this class to perform database operations.
	 */
	private readonly database: IDBDatabase;

	/**
	 * Encapsulate an {@link IDBDatabase} for use within this application.
	 *
	 * This construction cannot be used to get a valid {@link IDBDatabase} instance, instead being
	 * used internally to encapsulate one. To retrieve a valid instance, see
	 * {@link Database.connect()}.
	 *
	 * @param database The raw {@link IDBDatabase} connection.
	 */
	private constructor(database: IDBDatabase) {
		this.database = database;
	}

	/**
	 * Retrieve a connection to the {@link Database} and {@link IDBDatabase}.
	 *
	 * @returns A connection to the database.
	 * @throws {DatabaseError} If a connection to the database could not be retrieved.
	 */
	static async connect() {
		return await new Oath<IDBDatabase, DatabaseError>(DatabaseError, resolve => {
			const request = window.indexedDB.open(Database.DB_NAME);

			request.onerror = function () {
				throw DatabaseError.CONNECTION_ERROR;
			};

			request.onblocked = function () {
				throw DatabaseError.BLOCKED_ERROR;
			};

			request.onupgradeneeded = function () {
				const database = this.result;
				database.createObjectStore(Database.STORE_NAME, Database.STORE_OPTIONS);
			};

			request.onsuccess = function () {
				const database = this.result;
				resolve(database);
			};
		})
			.map(database => new Database(database))
			.run();
	}

	/**
	 * Open a new transaction in the database to perform actions on.
	 *
	 * This method does not expose the {@link IDBTransaction} object, instead requiring clients to
	 * designate a function `f` which will be run on the object store inside the transaction.
	 *
	 * This method signature resembles that of a {@link Promise} and can be used similarly as, when
	 * called, this method will wrap the provided function inside a promise to complete the required
	 * actions.
	 *
	 * @param mode The mode for this transaction.
	 * @param fn The function for logic to perform on this transaction.
	 * @returns The value defined by {@link fn}.
	 */
	private async transact<R>(
		mode: IDBTransactionMode,
		fn: (
			store: IDBObjectStore,
			resolve: (data: R) => void,
			reject: (error: unknown) => void
		) => void
	): Promise<OathResult<R, DatabaseError>> {
		return await new Oath<R, Error>(DatabaseError, resolve => {
			// open transaction
			const transaction = this.database.transaction(Database.STORE_NAME, mode);
			const store = transaction.objectStore(Database.STORE_NAME);

			// complete actions
			void new Promise<R>((resolve, reject) => {
				return fn(store, resolve, reject);
			}).then(data => {
				transaction.commit();
				resolve(data);
			});
		})
			.mapError(DatabaseError, error => {
				if (error instanceof TypeError) return DatabaseError.INVALID_MODE;
				if (error instanceof DOMException) {
					switch (error.name) {
						case "InvalidStateError":
							return DatabaseError.DATABASE_CLOSED;
						case "NotFoundError":
							return DatabaseError.NON_EXISTENT_OBJECT_STORE;
						case "InvalidAccessError":
							return DatabaseError.MISSING_OBJECT_STORE;
						default:
							throw error;
					}
				}

				throw error;
			})
			.run();
	}

	/**
	 * Retrieve cached data from the database.
	 *
	 * @param key The key of the cached data.
	 * @returns The cached data from the database, if it exists.
	 * @throws {DatabaseError} If the data could not be retrieved.
	 */
	async get(key: string) {
		return await this.transact<OverpassResponse | null>("readonly", (store, resolve) => {
			const req = store.get(key);

			req.onerror = () => {
				throw DatabaseError.GET_ERROR;
			};

			req.onsuccess = () => {
				const result = req.result as CachedQuery | undefined;
				if (result === undefined) return resolve(null);

				const json = JSON.parse(result.value) as OverpassResponse | undefined;
				if (json === undefined) return resolve(null);
				resolve(json);
			};
		});
	}

	/**
	 * Cache data into the database.
	 *
	 * @param data The data to cache.
	 * @returns Whether the value was successfully set.
	 * @throws {DatabaseError} If the data could not be cached.
	 */
	async set(data: CachedQuery) {
		return this.transact<boolean>("readwrite", (store, resolve) => {
			const req = store.put(data);

			req.onerror = () => {
				throw DatabaseError.SET_ERROR;
			};

			req.onsuccess = () => {
				resolve(true);
			};
		});
	}
}

/** Errors which could occur while opening a new connection to the {@link IDBDatabase}. */
class DatabaseError extends MessageBoxError {
	static readonly CONNECTION_ERROR = new DatabaseError(
		"Could not connect to the local database."
	);
	static readonly BLOCKED_ERROR = new DatabaseError(
		"Database is awaiting an upgrade, however other connections are still open."
	);

	static readonly GET_ERROR = new DatabaseError("Could not retrieve data from the database.");
	static readonly SET_ERROR = new DatabaseError("Could not insert data into the database.");

	// transaction errors
	static readonly INVALID_MODE = new DatabaseError("Transaction 'mode' is invalid.");
	static readonly DATABASE_CLOSED = new DatabaseError(
		"This connection to the database has previously been closed."
	);
	static readonly NON_EXISTENT_OBJECT_STORE = new DatabaseError(
		"One or more requested object stores do not exist"
	);
	static readonly MISSING_OBJECT_STORE = new DatabaseError(
		"No object stores requested in this transaction."
	);
}
