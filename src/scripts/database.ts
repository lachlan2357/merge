import { MessageBoxError } from "./messages.js";
import { OverpassResponse } from "./overpass/structures.js";
import { Oath } from "./supplement/oath.js";

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

	/** Current version of the database. */
	private static readonly DB_VERSION: number = 1;

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
	static connect(): Oath<Database, DatabaseError> {
		return new Oath(DatabaseError, ({ resolve, reject }) => {
			const request = Oath.mapException(
				() => window.indexedDB.open(Database.DB_NAME, Database.DB_VERSION),
				error => DatabaseError.new("databaseOpen", error)
			);

			request.onerror = e => reject(DatabaseError.new("databaseOpen", e));
			request.onblocked = e => reject(DatabaseError.new("databaseOpen", e));
			request.onupgradeneeded = () => this.upgradeDatabase(request.result);
			request.onsuccess = () => resolve(new Database(request.result));
		});
	}

	/**
	 * Upgrade the IndexedDB database to the current version defined by {@link Database}.
	 *
	 * @param database The database object to perform the upgrades on.
	 * @throws {DatabaseError} If the database could not be successfully upgraded.
	 */
	private static upgradeDatabase(database: IDBDatabase) {
		Oath.mapException(
			() => database.createObjectStore(Database.STORE_NAME, Database.STORE_OPTIONS),
			error => DatabaseError.new("objectStoreCreate", error)
		);
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
	private transact<R>(
		mode: IDBTransactionMode,
		fn: (
			store: IDBObjectStore,
			resolve: (data: R) => void,
			reject: (error: DatabaseError) => void
		) => void
	): Oath<R, DatabaseError> {
		return Oath.fromAsync(DatabaseError, async () => {
			// open transaction
			const transaction = Oath.mapException(
				() => this.database.transaction(Database.STORE_NAME, mode),
				error => DatabaseError.new("transactionOpen", error)
			);

			// retrieve object store
			const store = Oath.mapException(
				() => transaction.objectStore(Database.STORE_NAME),
				error => DatabaseError.new("objectStoreGet", error)
			);

			// complete transaction logic
			const data = await new Promise<R>((resolve, reject) => fn(store, resolve, reject));

			// commit and close transaction
			const [_, commitError] = Oath.sync(DatabaseError, () => {
				return Oath.mapException(
					() => transaction.commit(),
					error => DatabaseError.new("transactionCommit", error)
				);
			});
			if (commitError !== null) console.warn(commitError);
			return data;
		});
	}

	/**
	 * Retrieve cached data from the database.
	 *
	 * @param key The key of the cached data.
	 * @returns The cached data from the database, if it exists.
	 * @throws {DatabaseError} If the data could not be retrieved.
	 */
	get(key: string): Oath<OverpassResponse | null, DatabaseError> {
		return this.transact("readonly", (store, resolve, reject) => {
			const req = Oath.mapException(
				() => store.get(key),
				error => DatabaseError.new("objectStoreGetFrom", error)
			);

			req.onerror = event => reject(DatabaseError.new("objectStoreGetFrom", event));
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
	set(data: CachedQuery): Oath<void, DatabaseError> {
		return this.transact("readwrite", (store, resolve, reject) => {
			const req = Oath.mapException(
				() => store.put(data),
				error => DatabaseError.new("objectStoreInsertInto", error)
			);

			req.onerror = event => reject(DatabaseError.new("objectStoreInsertInto", event));
			req.onsuccess = () => resolve();
		});
	}
}

/** Errors which could occur while opening a new connection to the {@link IDBDatabase}. */
class DatabaseError extends MessageBoxError {
	private static readonly ERROR_MAP = {
		databaseOpen: "Connection to the database could not be opened.",

		objectStoreCreate: "Object store could not be created.",
		objectStoreGet: "Object store could not be found.",
		objectStoreGetFrom: "Data could not be retrieved from object store.",
		objectStoreInsertInto: "Data could not be inserted into object store.",

		transactionOpen: "Transaction could not be opened.",
		transactionCommit: "Transaction could not be committed."
	} as const satisfies Record<string, string>;

	static new<Key extends keyof typeof DatabaseError.ERROR_MAP>(stage: Key, cause: unknown) {
		const message = DatabaseError.ERROR_MAP[stage];
		return new DatabaseError(message, { cause });
	}
}

console.log(DatabaseError);
