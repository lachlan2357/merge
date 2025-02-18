import { MessageBoxError } from "./messages.js";
import { OverpassResponse } from "./overpass/structures.js";
import { Constructor, Oath } from "./supplement/oath.js";

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
		return new Oath<IDBDatabase, DatabaseError>(DatabaseError, resolve => {
			const request = Oath.mapException(
				() => window.indexedDB.open(Database.DB_NAME, Database.DB_VERSION),
				error => {
					/* https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/open#exceptions */
					if (error instanceof TypeError)
						return DatabaseError.new("invalidDatabaseVersion", error);
				}
			);

			request.onerror = function (e) {
				throw DatabaseError.new("connectionError", e);
			};

			request.onblocked = function (e) {
				throw DatabaseError.new("upgradeBlocked", e);
			};

			request.onupgradeneeded = () => {
				const database = request.result;
				this.upgradeDatabase(database);
			};

			request.onsuccess = () => {
				const database = request.result;
				resolve(database);
			};
		}).map(database => new Database(database));
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
			error => {
				if (error instanceof DatabaseError) return error;
				if (error instanceof SyntaxError) return DatabaseError.new("invalidKeyPath", error);
				if (error instanceof DOMException) {
					switch (error.name) {
						case "ConstraintError":
							return DatabaseError.new("objectStoreAlreadyExists", error);
						case "InvalidAccessError":
							return DatabaseError.new("autoIncrementAndKeyPathProvided", error);
						case "InvalidStateError":
							return DatabaseError.new("creationFromNonUpgrade", error);
						case "TransactionInactiveError":
							return DatabaseError.new("inactiveTransaction", error);
					}
				}
			}
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
				error => {
					/* https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction#exceptions */
					if (error instanceof TypeError) return DatabaseError.new("invalidMode", error);
					if (error instanceof DOMException) {
						switch (error.name) {
							case "InvalidStateError":
								throw DatabaseError.new("databaseClosed", error);
							case "NotFoundError":
								throw DatabaseError.new("nonExistentObjectStore", error);
							case "InvalidAccessError":
								throw DatabaseError.new("missingObjectStore", error);
							default:
								throw DatabaseError.new("unknownError", error);
						}
					}
				}
			);

			// retrieve object store
			const store = Oath.mapException(
				() => transaction.objectStore(Database.STORE_NAME),
				error => {
					/* https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/objectStore#exceptions */
					if (error instanceof DOMException) {
						switch (error.name) {
							case "NotFoundError":
								return DatabaseError.new("objectStoreOutOfScope", error);
							case "InvalidStateError":
								return DatabaseError.new("couldNotAccessObjectStore", error);
						}
					}
				}
			);

			// complete transaction logic
			const data = await new Promise<R>((resolve, reject) => fn(store, resolve, reject));

			// commit and close transaction
			const [_, commitError] = Oath.sync(DatabaseError, () => {
				return Oath.mapException(
					() => transaction.commit(),
					error => {
						/* https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/commit#exceptions */
						if (error instanceof DOMException) {
							switch (error.name) {
								case "InvalidStateError":
									return DatabaseError.new("transactionAlreadyClosed", error);
							}
						}
					}
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
	get(key: string) {
		return this.transact<OverpassResponse | null>("readonly", (store, resolve) => {
			const req = Oath.mapException(
				() => store.get(key),
				error => {
					/* https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/get#exceptions */
					if (error instanceof DOMException) {
						switch (error.name) {
							case "TransactionInactiveError":
								return DatabaseError.new("inactiveTransaction", error);
							case "DataError":
								return DatabaseError.new("invalidKeyPath", error);
							case "InvalidStateError":
								return DatabaseError.new("couldNotAccessObjectStore", error);
						}
					}
				}
			);

			req.onerror = e => {
				throw DatabaseError.new("getError", e);
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
	set(data: CachedQuery) {
		return this.transact<boolean>("readwrite", (store, resolve) => {
			const req = store.put(data);

			req.onerror = e => {
				throw DatabaseError.new("setError", e);
			};

			req.onsuccess = () => {
				resolve(true);
			};
		});
	}
}

/** Errors which could occur while opening a new connection to the {@link IDBDatabase}. */
class DatabaseError extends MessageBoxError {
	private static readonly ERROR_MAP = {
		// database open request
		invalidDatabaseVersion: ["Requested database version is invalid.", TypeError],
		connectionError: ["Could not connect to the local database.", Event],
		upgradeBlocked: [
			"Database attempted to upgrade, however other database connections are open.",
			IDBVersionChangeEvent
		],

		// object store creation
		invalidKeyPath: ["Invalid key path provided.", TypeError],
		objectStoreAlreadyExists: [
			"Attempted to create an object store with a name is already in use.",
			DOMException
		],
		autoIncrementAndKeyPathProvided: [
			"Both 'autoIncrement' and 'keyPath' options cannot be provided. Choose one to be used.",
			DOMException
		],
		creationFromNonUpgrade: [
			"Attempted to create a new object store outside of an upgrade event.",
			DOMException
		],
		inactiveTransaction: ["Upgrade transaction is not in an active state.", DOMException],

		// transaction open
		invalidMode: ["Transaction 'mode' is invalid.", TypeError],
		databaseClosed: ["This connection to the database has been closed.", DOMException],
		nonExistentObjectStore: ["One or more requested object stores do not exist.", DOMException],
		missingObjectStore: ["No object stores requested in this transaction.", DOMException],

		// object store fetch
		objectStoreOutOfScope: [
			"Attempted to access an object store out scope of it's transaction.",
			DOMException
		],
		couldNotAccessObjectStore: ["Could not access requested object store.", DOMException],

		// transaction commit
		transactionAlreadyClosed: ["Transaction has already been closed.", DOMException],

		// generic
		getError: ["Could not retrieve data from the database.", Event],
		setError: ["Could to insert data into the database.", Event],
		unknownError: ["An unknown database error has occurred.", Error]
	} as const satisfies Record<string, [string, Constructor<unknown>]>;

	static new<Key extends keyof typeof DatabaseError.ERROR_MAP>(
		error: Key,
		cause: InstanceType<(typeof DatabaseError.ERROR_MAP)[Key][1]>
	) {
		return new DatabaseError(DatabaseError.ERROR_MAP[error][0], { cause });
	}
}
