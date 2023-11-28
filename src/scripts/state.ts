import { Canvas, MultiplierData } from "./canvas.js";
import { DrawnElement } from "./drawing.js";
import { Coordinate } from "./supplement.js";
import { ImportedData, OverpassWay } from "./types.js";

interface Compute {
	compute(): void;
}

export class Store<T> {
	protected data: T;
	protected dependents: Set<Compute>;

	constructor(initial: T) {
		this.data = initial;
		this.dependents = new Set();
	}

	get() {
		return this.data;
	}

	addDependents(...dependents: Array<Compute>) {
		for (let i = 0; i < dependents.length; i++) {
			const dependent = dependents[i];
			this.dependents.add(dependent);
		}
	}

	protected notifyDependents() {
		this.dependents.forEach(compute => compute.compute());
	}
}

export class Atomic<T> extends Store<T> {
	constructor(initial: T) {
		super(initial);
	}

	set(value: T) {
		this.data = value;
		this.notifyDependents();
	}

	setDynamic(fn: (old: T) => T) {
		this.set(fn(this.data));
	}
}

export class Computed<T> extends Store<T> implements Compute {
	protected computeFn: () => T;

	constructor(computeFn: () => T, dependencies: Array<Store<unknown>>) {
		super(computeFn());
		this.computeFn = computeFn;
		dependencies.forEach(dependency => dependency.addDependents(this));
	}

	compute() {
		this.data = this.computeFn();
		this.notifyDependents();
	}
}

export class Effect implements Compute {
	protected fn: () => void;

	constructor(fn: () => void, dependencies: Array<Store<unknown>>) {
		this.fn = fn;
		dependencies.forEach(dependency => dependency.addDependents(this));
	}

	compute() {
		this.fn();
	}
}

export class State {
	// atomics
	static readonly data: Atomic<ImportedData | undefined> = new Atomic(undefined);
	static readonly currentRelationId: Atomic<number | undefined> = new Atomic(undefined);
	static readonly drawnElements: Atomic<Record<number, DrawnElement>> = new Atomic({});
	static readonly selectedWay: Atomic<number> = new Atomic(-1);
	static readonly allWays: Atomic<Map<number, OverpassWay>> = new Atomic(new Map());
	static readonly canvasDimensions: Atomic<Coordinate> = new Atomic(new Coordinate());
	static readonly canvasOffset: Atomic<Coordinate> = new Atomic(new Coordinate());
	static readonly mousePos: Atomic<Coordinate> = new Atomic(new Coordinate());
	static readonly mouseDownPos: Atomic<Coordinate> = new Atomic(new Coordinate());
	static readonly mouseOffset: Atomic<Coordinate> = new Atomic(new Coordinate());
	static readonly zoomOffset: Atomic<Coordinate> = new Atomic(new Coordinate());
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

		const diff = new Coordinate(maxLon - minLon, maxLat - minLat);
		const diffScale = canvasCache.divide(diff);
		const minDiff = Math.min(diffScale.x, diffScale.y);

		multiplier = Math.sqrt(minDiff);

		return { minLat, maxLat, minLon, maxLon, multiplier };
	}, [this.data, this.canvasDimensions]);

	static readonly totalMultiplier = new Computed(() => {
		return (this.multiplier.get().multiplier + this.zoom.get()) ** 2;
	}, [this.multiplier, this.zoom]);

	static readonly offset = new Computed(() => {
		const totalMultiplierCache = this.totalMultiplier.get();
		const { minLon, maxLon, minLat, maxLat } = this.multiplier.get();
		const canvasCache = this.canvasDimensions.get();

		return new Coordinate(
			canvasCache.x / 2 -
				(minLon + (maxLon - minLon) / 2) * totalMultiplierCache +
				this.mouseOffset.get().x +
				this.zoomOffset.get().x,
			canvasCache.y / 2 +
				(minLat + (maxLat - minLat) / 2) * totalMultiplierCache +
				this.mouseOffset.get().y +
				this.zoomOffset.get().y
		);
	}, [
		this.totalMultiplier,
		this.multiplier,
		this.canvasDimensions,
		this.mouseOffset,
		this.zoomOffset
	]);

	// effects
	static readonly redraw = new Effect(
		() => Canvas.draw(),
		[
			this.data,
			this.canvasDimensions,
			this.mousePos,
			this.mouseDownPos,
			this.mouseOffset,
			this.zoomOffset,
			this.mouseDown,
			this.mouseMoved,
			this.zoom
		]
	);

	static readonly permalink = new Effect(
		() => (window.location.hash = `#${this.currentRelationId.get()}`),
		[this.currentRelationId]
	);
}
