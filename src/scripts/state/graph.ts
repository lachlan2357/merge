import { MessageBoxError } from "../messages.js";
import { Compute, Store } from "./index.js";

/**
 * The type that this graph recognises as a dependency.
 *
 * For all relationships, the dependency in question must be a subclass of this type, however it is
 * not possible to restrict which elements derive {@link GraphItem}, thus this acts as a word of
 * warning rather than any meaningful restriction.
 */
type Dependency = Store<unknown>;

/**
 * Backend implementations for items needing to hook into the dependency graph.
 *
 * This dependency graph only supports {@link Compute}-{@link Store} relationships, so derived
 * classes should ideally implement/extend one of these otherwise it becomes difficult to properly
 * integrate required behaviours.
 */
export abstract class GraphItem {
	/**
	 * Map to keep track of which {@link Dependency Dependencies} each {@link Compute} relies on.
	 */
	static readonly dependencyMap = new Map<Compute, Set<Dependency>>();

	/**
	 * A stack of {@link Compute Computes} keeping track of any {@link Compute} objects that are
	 * currently in the process of being recalculated.
	 *
	 * When a {@link Compute} begins it's recalculation, it is pushed onto this stack with an empty
	 * set. Then, when a {@link Dependency} is accessed, a reference to itself is added to the
	 * {@link Dependency} set attached to the element at the top of the stack. Once the
	 * {@link Compute} has finished it's recalculation, it saves the {@link Dependency} set as the
	 * only dependencies for the {@link Compute}.
	 *
	 * This method of dependency discovery relies on recalculation functions being deterministic,
	 * i.e., they don't pull pre-cached data from outside the scope of the function itself. If this
	 * occurs, some dependencies of a {@link Compute} may not be properly tracked, leading to
	 * situations where a recalculation does not occur when it needs to. This can be mitigated by
	 * always caching state data within the computation function, however there is no way to enforce
	 * this in JavaScript.
	 *
	 * Another assumption of calculation functions is that they must be both synchronous and
	 * blocking. If this assumption is not true for a calculation function, it may cause
	 * re-calculations to finished in an order different than the reverse order in which they began.
	 * In the event this occurs, a {@link DependencyError} will be thrown.
	 */
	private static readonly accessStack = new Array<[Compute, Set<Dependency>]>();

	/**
	 * Register that a {@link Dependency} has been accessed.
	 *
	 * If there is a {@link Compute} currently being calculated, {@link this} will be tracked as a
	 * dependency of that {@link Compute}.
	 *
	 * @param this The dependency that was accessed.
	 */
	protected wasAccessed(this: Dependency) {
		// inspect (not pop) top item references off the access stack
		const topItem = GraphItem.accessStack.at(-1);
		if (topItem === undefined) return;

		// add dependency to the access stack
		topItem[1].add(this);
	}

	/**
	 * Notify the dependency graph that a {@link Compute} is beginning its calculation.
	 *
	 * It is imperative this method is called at the beginning of any computation as to properly
	 * track its dependencies. Usually, such as in the case of {@link Computed} or {@link Effect},
	 * this is done automatically, however any non-standard implementations must ensure this method
	 * is called itself.
	 *
	 * It is also imperative to call {@link finishCalculation} at the end of any calculation.
	 *
	 * @param this The {@link Compute} value which is beginning its calculation.
	 */
	protected beginCalculation(this: Compute) {
		GraphItem.accessStack.push([this, new Set()]);
	}

	/**
	 * Notify the dependency graph that a {@link Compute} has finished its calculation.
	 *
	 * It is imperative this method is called at the end of an computation as to properly stop
	 * tracking its dependencies. Usually, such as in the case of {@link Computed} or
	 * {@link Effect}, this is done automatically, however any non-standard implementations must
	 * ensure this method is called itself.
	 *
	 * It is also imperative to call {@link beginCalculation} at the start of any calculation.
	 *
	 * @throws {DependencyError} If the dependencies could not be collated.
	 */
	protected finishCalculation(this: Compute) {
		// pop top item off the access stack
		const dependencyAccesses = GraphItem.accessStack.pop();
		if (dependencyAccesses === undefined)
			throw DependencyError.untrackedComputationFinished(this);

		// ensure the dependencies are for the correct computed value
		const [compute, dependencies] = dependencyAccesses;
		if (compute !== this) throw DependencyError.incorrectComputationFinished(this, compute);

		// update dependencies for this compute
		GraphItem.dependencyMap.set(compute, dependencies);
	}

	/**
	 * Notify all the {@link Compute Computes} of a {@link Dependency} that a dependency has had its
	 * value changed and a recalculation should commence.
	 *
	 * @param this The {@link Dependency} which has changed.
	 */
	protected notifyDependents(this: Dependency) {
		for (const [compute, dependencies] of GraphItem.dependencyMap) {
			if (dependencies.has(this)) compute.compute();
		}
	}
}

/**
 * Errors relating to the automatic dependency management system.
 */
class DependencyError extends MessageBoxError {
	/**
	 * Error for when a {@link Compute} finishes its calculation while the access stack is empty.
	 *
	 * This error usually means a calculation did not call {@link GraphItem.beginCalculation} when
	 * it should have.
	 *
	 * @param compute The {@link Compute} which just finished its calculation.
	 * @returns The error.
	 */
	static untrackedComputationFinished(compute: Compute) {
		return new DependencyError(
			`Computation ${compute} finished, however no computations we registered as having been started.`
		);
	}

	/**
	 * Error for when the {@link Compute} that has just finished its calculation is not the same as
	 * the {@link Compute} on the top of the stack.
	 *
	 * This error usually means calculations finished out of order due to either being asynchronous
	 * or non-blocking, however could also be if {@link GraphItem.beginCalculation} or
	 * {@link GraphItem.finishCalculation} are not called when they should be.
	 *
	 * @param compute The {@link Compute} which just finished its calculation.
	 * @param expectedCompute The expected {@link Compute} value to have finished.
	 * @returns The error.
	 */
	static incorrectComputationFinished(compute: Compute, expectedCompute: Compute) {
		return new DependencyError(
			`Computations finished out of order: expected ${expectedCompute} to finish next, however ${compute} finished before.`
		);
	}
}
