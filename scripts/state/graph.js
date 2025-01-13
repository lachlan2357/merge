import { GraphNodeSet } from "./node.js";
/**
 * Backend implementations for items needing to hook into the dependency graph.
 *
 * This dependency graph only supports {@link Compute}-{@link Store} relationships, so derived
 * classes should ideally implement/extend one of these otherwise it becomes difficult to properly
 * integrate required behaviours.
 */
export class GraphItem {
    /**
     * All {@link Compute} values which have been registered under the
     * {@link GraphItem.dependencyGraph}.
     */
    static allComputes = new Set();
    /**
     * The original dependency graph which maintains a record for the desired dependency
     * relationships for all {@link Compute} values.
     */
    static dependencyGraph = new GraphNodeSet();
    /**
     * The trimmed dependency graph which aims to optimise the {@link GraphItem.dependencyGraph} to
     * reduce the number of times an unnecessary recalculation occurs.
     */
    static trimmedGraph = new GraphNodeSet();
    /**
     * Register a dependency of this {@link Compute} object.
     *
     * Note: this method requires the calling object to implement {@link Compute}.
     *
     * @param this The {@link Compute} object with the dependency.
     * @param dependency The {@link Store} which {@link compute} is dependent on.
     */
    registerDependency(dependency) {
        // add dependency
        GraphItem.allComputes.add(this);
        GraphItem.dependencyGraph.add(this, dependency);
        // recalculate
        GraphItem.recalculateTrimmedGraph();
    }
    /**
     * Recalculate all {@link Compute} values which depend on a {@link dependency}.
     *
     * Note: this method requires the calling object to extend {@link Store}.
     *
     * @param this This item to recalculate the dependency of.
     */
    notifyDependents() {
        const toNotify = GraphItem.trimmedGraph.getFirstsForSecond(this);
        for (const compute of toNotify)
            compute.compute();
    }
    /**
     * Determine whether a {@link Store} has been registered as a {@link Compute}.
     *
     * While calling method does not require {@link this} to implement {@link Compute}, if it
     * doesn't, there is no chance it being found as a registered {@link Compute}. However, if it
     * is found, it's type with also be narrowed to include the fact it does implement
     * {@link Compute}.
     *
     * Note: this method requires the calling object to extend {@link Store}.
     *
     * @param this The store to check.
     * @returns Whether {@link store} is also a registered {@link Compute}.
     */
    isRegisteredCompute() {
        return GraphItem.allComputes.has(this);
    }
    /**
     * Recalculate the {@link GraphItem.trimmedGraph} to take into consideration new dependency
     * relationships.
     */
    static recalculateTrimmedGraph() {
        GraphItem.trimmedGraph.clear();
        for (const compute of GraphItem.allComputes) {
            // calculate direct and indirect dependencies
            const { direct, indirect } = GraphItem.discoverAllDependencies(compute, compute);
            // only keep direct dependencies that aren't also indirect dependencies
            const trimmedDirect = direct.difference(indirect);
            for (const dependency of trimmedDirect)
                GraphItem.trimmedGraph.add(compute, dependency);
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
    static discoverAllDependencies(currentCompute, rootCompute, direct, indirect) {
        direct ??= new Set();
        indirect ??= new Set();
        // find all relevant dependencies
        for (const [compute, dependency] of GraphItem.dependencyGraph) {
            if (compute !== currentCompute)
                continue;
            // record direct or indirect dependency, skipping it if it's already been registered
            if (currentCompute === rootCompute)
                direct.add(dependency);
            else if (!indirect.has(dependency))
                indirect.add(dependency);
            else
                continue;
            // check for any nested dependencies
            if (dependency.isRegisteredCompute())
                GraphItem.discoverAllDependencies(dependency, rootCompute, direct, indirect);
        }
        return { direct, indirect };
    }
}