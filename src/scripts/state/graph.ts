import { Compute, Effect, Store } from "./index.js";

/**
 * All {@link Compute} objects that have a registered dependency.
 */
const allComputes = new Set<Compute>();

/**
 * The dependency graph that maps each dependency as ({@link Compute}, {@link Store}).
 *
 * This graph is the backbone for trimming unnecessary dependencies. See
 * {@link trimDependencies} for more information.
 */
const graph = new Set<[Compute, Store<unknown>]>();

/**
 * Register a dependency to the graph.
 *
 * @param dependent The dependent {@link Compute} value.
 * @param dependency The {@link Store} the {@link dependent} depends on.
 */
export function registerDependency(dependent: Compute, dependency: Store<unknown>) {
	allComputes.add(dependent);
	graph.add([dependent, dependency]);
	trimDependencies();
}

/**
 * Deregister a dependency from the graph.
 *
 * @param dependent The dependent {@link Compute} value
 * @param dependency The {@link Store} the {@link dependent} no longer should depend on.
 * @returns Whether the dependency entry actually existed before removal.
 */
export function deregisterDependency(dependent: Compute, dependency: Store<unknown>) {
	for (const item of graph)
		if (item[0] === dependent && item[1] === dependency) return graph.delete(item);

	return false;
}

/**
 * Trim all the dependency relationships in the graph.
 */
function trimDependencies() {
	for (const compute of allComputes) {
		const { direct, indirect } = getAllDependencies(compute, compute, new Set(), new Set());

		// remove unnecessary direct dependencies
		for (const dependency of direct) {
			if (!indirect.has(dependency)) continue;
			dependency.trimDependent(compute);

			// log removal
			const dependencyName = dependency.name;
			let computeName = "<unknown>";
			if (compute instanceof Store) computeName = compute.name;
			if (compute instanceof Effect) computeName = compute.name;

			console.debug(
				`Removed dependency '${dependencyName}' from '${computeName}' due to nested duplication.`
			);
		}
	}
}

/**
 * Find all dependencies for a {@link Compute}.
 *
 * Dependencies can either be direct (in cases where the {@link Compute} directly specifies a
 * dependency) or indirect (in cases for dependencies of dependencies).
 *
 * @param compute The current {@link Compute} value to find all dependencies for.
 * @param rootCompute The root {@link Compute} value which was originally requested.
 * @param direct All currently discovered direct dependencies.
 * @param indirect All currently discovered indirect dependencies.
 * @returns All direct and indirect dependences of {@link rootCompute}.
 */
function getAllDependencies(
	compute: Compute,
	rootCompute: Compute,
	direct: Set<Store<unknown>>,
	indirect: Set<Store<unknown>>
) {
	for (const [dependent, dependency] of graph) {
		// find all relevant dependencies
		if (dependent !== compute) continue;

		if (compute === rootCompute) direct.add(dependency);
		else {
			if (indirect.has(dependency)) continue;
			indirect.add(dependency);
		}

		// check for any nested dependencies
		if (isRegisteredCompute(dependency))
			getAllDependencies(dependency, rootCompute, direct, indirect);
	}

	return { direct, indirect };
}

/**
 * Determine whether a {@link Store} has been registered as a {@link Compute}.
 *
 * @param store The store to check.
 * @returns Whether {@link store} is a registered {@link Compute}.
 */
function isRegisteredCompute(store: Store<unknown>): store is Store<unknown> & Compute {
	return allComputes.has(store as unknown as Compute);
}
