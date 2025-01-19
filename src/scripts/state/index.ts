import { DrawnElement } from "../drawing.js";
import { MultiplierData } from "../map/canvas.js";
import { ScreenCoordinate } from "../types/coordinate.js";
import { OverpassWay } from "../types/overpass.js";
import { MergeData } from "../types/processed.js";
import { GraphItem } from "./graph.js";

/**
 * Ability to perform calculations when dependent information changes.
 */
export interface Compute {
	/**
	 * Recalculate the value stored in this container and perform any effects.
	 *
	 * In most situations, this method will be called automatically by containers this container is
	 * dependent on, however it can also be called manually if desired.
	 *
	 * It is imperative that this method calls both {@link GraphItem.beginCalculation}
	 * and {@link GraphItem.finishCalculation} when it begins and finishes a calculation it if
	 * wishes to utility the automatic dependency management system.
	 */
	compute(): void;
}

export type ComputeFn<T> = () => T;

/**
 * A state container that can only store data.
 *
 * This container crucially does not have the ability to modify it's data, only be initialised with
 * some data and have that data retrievable.
 */
export class Store<T> extends GraphItem {
	/**
	 * The underlying data in this container.
	 */
	protected data: T;

	/**
	 * Initialise this state container with an initial value.
	 *
	 * @param initial The value to initialise this container with.
	 */
	constructor(initial: T) {
		super();
		this.data = initial;
	}

	/**
	 * Retrieve the currently-stored value in this container.
	 *
	 * The value returned by this method does not undergo any copying apart from that in which is
	 * already performed by JavaScript. So, for all non-object values, the return value will be
	 * passed by value, and for all object values, passed by reference. For this reason, even
	 * though objects can be retrieved through this method and subsequently modified, they should
	 * never be as doing so will bypass the state management from this container.
	 */
	get() {
		this.wasAccessed();
		return this.data;
	}
}

/**
 * A state container that can store and modify data.
 *
 * Generally, this type of state container should form the backbone of the state management
 * solution.
 */
export class Atomic<T> extends Store<T> {
	/**
	 * Overwrite the stored value with another value.
	 *
	 * This method discards whatever value is previously stored, overwriting it with whatever value
	 * is passed to it. In cases where the value should be modified instead of overwritten, see
	 * {@link Atomic.setDynamic()}
	 *
	 * @param value The new value to store.
	 */
	set(value: T) {
		this.data = value;
		this.notifyDependents();
	}

	/**
	 * Modify the stored value.
	 *
	 * In cases where this container stores an object rather than a primitive, and that object is
	 * modified and shouldn't be overwritten, it is still required to return the object at the end
	 * of the set {@link fn}. Doing so will not actually overwrite the object with a new one as it
	 * will instead replace the reference to the object with the same reference to the same object.
	 *
	 * This method should be used when reference to the currently-stored value is required, either
	 * as a jumping off point (i.e., modify the value) or if it needs to be tracked elsewhere. If
	 * the previous value isn't required, it is preferable to use {@link Atomic.set()}.
	 *
	 * @param fn The modification function.
	 */
	setDynamic(fn: (old: T) => T) {
		const value = fn(this.data);
		this.set(value);
	}
}

/**
 * A state container that calculates calculates data based off other containers.
 *
 * This state container should be used to augment {@link Atomic} containers by automatically
 * recalculating values to ensure they stay up-to-date.
 *
 * In cases where no data is needed to be stored, but something needs computing, it is preferred
 * to use an {@link Effect} container instead.
 */
export class Computed<T> extends Store<T> implements Compute {
	/**
	 * The function to compute a new value for this container.
	 */
	protected computeFn: ComputeFn<T>;

	/**
	 * Create a {@link Computed} container by defining a compute function.
	 *
	 * It is crucial to ensure all state containers used within the {@link computeFn} are specified
	 * in the {@link dependencies} array, otherwise the computed value may not be recalculated when
	 * it should be.
	 *
	 * It is also imperative not to create a circular dependency, for example by having two
	 * computed values dependent on each other. If this occurs, a call to compute this value will
	 * result in an infinite loop. Currently, there is no inbuilt mechanism to detect this, so it
	 * is up to implementers to ensure this does not occur.
	 *
	 * @param computeFn The function that will be used to compute new values.
	 * @param dependencies All dependencies of this computation.
	 */
	constructor(computeFn: ComputeFn<T>) {
		super(computeFn());
		this.computeFn = computeFn;

		// re-compute the value so that the dependency system can track it
		this.compute();
	}

	compute() {
		// recompute value
		this.beginCalculation();
		this.data = this.computeFn();
		this.finishCalculation();

		// notify dependencies
		this.notifyDependents();
	}
}

/**
 * A container that does not store any data, but can perform actions when dependencies change.
 *
 * In cases where data also needs to be computed each time dependencies change, it is preferred to
 * use an {@link Computed} container instead.
 */
export class Effect extends GraphItem implements Compute {
	/**
	 * The function to perform effects for this container.
	 */
	protected effectFn: ComputeFn<void>;

	/**
	 * Create a {@link Effect} container by defining an effect function.
	 *
	 * @param effectFn The function that will be used to perform effects.
	 * @param dependencies All dependencies of this computation.
	 */
	constructor(effectFn: ComputeFn<void>) {
		super();
		this.effectFn = effectFn;

		// re-compute the value so that the dependency system can track it
		this.compute();
	}

	compute() {
		// recalculate value
		this.beginCalculation();
		this.effectFn();
		this.finishCalculation();
	}
}

/**
 * Central state storage for the application.
 */
export class State {
	// atomics
	static readonly data: Atomic<MergeData | undefined> = new Atomic(undefined);
	static readonly currentRelationId: Atomic<number | undefined> = new Atomic(undefined);
	static readonly drawnElements: Atomic<Array<DrawnElement>> = new Atomic(new Array());
	static readonly selectedWay: Atomic<number> = new Atomic(-1);
	static readonly allWays: Atomic<Map<number, OverpassWay>> = new Atomic(new Map());
	static readonly canvasDimensions: Atomic<ScreenCoordinate> = new Atomic(new ScreenCoordinate());
	static readonly canvasOffset: Atomic<ScreenCoordinate> = new Atomic(new ScreenCoordinate());
	static readonly mousePos: Atomic<ScreenCoordinate> = new Atomic(new ScreenCoordinate());
	static readonly mouseDownPos: Atomic<ScreenCoordinate> = new Atomic(new ScreenCoordinate());
	static readonly mouseOffset: Atomic<ScreenCoordinate> = new Atomic(new ScreenCoordinate());
	static readonly zoomOffset: Atomic<ScreenCoordinate> = new Atomic(new ScreenCoordinate());
	static readonly mouseDown: Atomic<boolean> = new Atomic(false);
	static readonly mouseMoved: Atomic<boolean> = new Atomic(false);
	static readonly zoom: Atomic<number> = new Atomic(0);

	// computed
	static readonly multiplier: Computed<MultiplierData> = new Computed((): MultiplierData => {
		let maxLat = 0,
			minLat = 0,
			maxLon = 0,
			minLon = 0,
			multiplier = 0;

		const dataCache = this.data.get();
		const canvasCache = this.canvasDimensions.get();
		if (dataCache === undefined) return { minLat, maxLat, minLon, maxLon, multiplier };

		const allLats = new Array<number>();
		const allLons = new Array<number>();

		dataCache.forEach(way => {
			way.nodes.forEach(({ lat, lon }) => {
				allLats.push(lat);
				allLons.push(lon);
			});
		});

		maxLat = Math.max(...allLats);
		minLat = Math.min(...allLats);
		maxLon = Math.max(...allLons);
		minLon = Math.min(...allLons);

		const diff = new ScreenCoordinate(maxLon - minLon, maxLat - minLat);
		const diffScale = canvasCache.divide(diff);
		const minDiff = Math.min(diffScale.x, diffScale.y);

		multiplier = Math.sqrt(minDiff);

		return { minLat, maxLat, minLon, maxLon, multiplier };
	});

	static readonly totalMultiplierRaw = new Computed(() => {
		return this.multiplier.get().multiplier + this.zoom.get();
	});

	static readonly totalMultiplier = new Computed(() => {
		return this.totalMultiplierRaw.get() ** 2;
	});

	static readonly offset = new Computed(() => {
		const totalMultiplierCache = this.totalMultiplier.get();
		const { minLon, maxLon, minLat, maxLat } = this.multiplier.get();
		const canvasCache = this.canvasDimensions.get();

		return new ScreenCoordinate(
			canvasCache.x / 2 -
				(minLon + (maxLon - minLon) / 2) * totalMultiplierCache +
				this.mouseOffset.get().x +
				this.zoomOffset.get().x,
			canvasCache.y / 2 +
				(minLat + (maxLat - minLat) / 2) * totalMultiplierCache +
				this.mouseOffset.get().y +
				this.zoomOffset.get().y
		);
	});
}
