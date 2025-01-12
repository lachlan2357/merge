import { Compute, Store } from "./index.js";
import { GraphNodeSet } from "./node.js";

type Dependency = Store<unknown>;

/**
 * A item that requires hooking into the dependency graph.
 */
export class GraphItem {
	/**
	 * All {@link Compute} values which have been registered under the
	 * {@link GraphItem.dependencyGraph}.
	 */
	private static readonly allComputes = new Set<Compute>();

	/**
	 * The original dependency graph which maintains a record for the desired dependency
	 * relationships for all {@link Compute} values.
	 */
	private static readonly dependencyGraph = new GraphNodeSet<Compute, Dependency>();

	/**
	 * The trimmed dependency graph which aims to optimise the {@link GraphItem.dependencyGraph} to
	 * reduce the number of times an unnecessary recalculation occurs.
	 */
	private static readonly trimmedGraph = new GraphNodeSet<Compute, Dependency>();

	/**
	 * Register a {@link Compute}-{@link Dependency} relationship to the graph.
	 *
	 * @param compute The {@link Compute} object with the dependency.
	 * @param dependency The {@link Store} which {@link compute} is dependent on.
	 */
	protected static registerDependency(compute: Compute, dependency: Dependency) {
		// add dependency
		GraphItem.dependencyGraph.add(compute, dependency);

		// recalculate
		GraphItem.recalculateAllComputes();
		GraphItem.recalculateTrimmedGraph();
	}

	/**
	 * Recalculate the {@link GraphItem.trimmedGraph} to take into consideration new dependency
	 * relationships.
	 */
	private static recalculateTrimmedGraph() {
		GraphItem.trimmedGraph.clear();

		for (const compute of GraphItem.allComputes) {
			// calculate direct and indirect dependencies
			const { direct, indirect } = GraphItem.discoverAllDependencies(compute, compute);

			// only keep direct dependencies that aren't also indirect dependencies
			const trimmedDirect = direct.difference(indirect);
			for (const dependency of trimmedDirect) GraphItem.trimmedGraph.add(compute, dependency);
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
	private static discoverAllDependencies(
		currentCompute: Compute,
		rootCompute: Compute,
		direct?: Set<Dependency>,
		indirect?: Set<Dependency>
	) {
		direct ??= new Set();
		indirect ??= new Set();

		// find all relevant dependencies
		for (const [compute, dependency] of GraphItem.dependencyGraph) {
			if (compute !== currentCompute) continue;

			if (currentCompute === rootCompute) {
				direct.add(dependency);
			} else {
				if (indirect.has(dependency)) continue;
				indirect.add(dependency);
			}

			// check for any nested dependencies
			if (GraphItem.isRegisteredCompute(dependency))
				GraphItem.discoverAllDependencies(dependency, rootCompute, direct, indirect);
		}

		return { direct, indirect };
	}

	/**
	 * Recalculate the set of all {@link Compute} items.
	 */
	private static recalculateAllComputes() {
		GraphItem.allComputes.clear();
		for (const [compute] of GraphItem.dependencyGraph) GraphItem.allComputes.add(compute);
	}

	/**
	 * Determine whether a {@link Store} has been registered as a {@link Compute}.
	 *
	 * @param store The store to check.
	 * @returns Whether {@link store} is a registered {@link Compute}.
	 */
	private static isRegisteredCompute(store: Dependency): store is Dependency & Compute {
		for (const [compute] of GraphItem.dependencyGraph)
			if (compute === (store as unknown)) return true;

		return false;
	}

	/**
	 * Recalculate all {@link Compute} values which depend on a {@link dependency}.
	 *
	 * @param dependency The dependency which triggered the recalculations.
	 */
	protected static recalculateComputes(dependency: Dependency) {
		const toNotify = this.trimmedGraph.getFirstsForSecond(dependency);
		for (const compute of toNotify) compute.compute();
	}
}
