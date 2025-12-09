import { ScreenCoordinate } from "../supplement/coordinate.js";
import { GraphItem } from "./graph.js";
/**
 * A state container that can only store data.
 *
 * This container crucially does not have the ability to modify it's data, only be initialised with
 * some data and have that data retrievable.
 */ export class Store extends GraphItem {
    /** The underlying data in this container. */ data;
    /**
	 * Initialise this state container with an initial value.
	 *
	 * @param initial The value to initialise this container with.
	 */ constructor(initial){
        super();
        this.data = initial;
    }
    /**
	 * Retrieve the currently-stored value in this container.
	 *
	 * The value returned by this method does not undergo any copying apart from that in which is
	 * already performed by JavaScript. So, for all non-object values, the return value will be
	 * passed by value, and for all object values, passed by reference. For this reason, even though
	 * objects can be retrieved through this method and subsequently modified, they should never be
	 * as doing so will bypass the state management from this container.
	 *
	 * @returns The data stored in this container.
	 */ get() {
        this.wasAccessed();
        return this.data;
    }
}
/**
 * A state container that can store and modify data.
 *
 * Generally, this type of state container should form the backbone of the state management
 * solution.
 */ export class Atomic extends Store {
    /**
	 * Overwrite the stored value with another value.
	 *
	 * This method discards whatever value is previously stored, overwriting it with whatever value
	 * is passed to it. In cases where the value should be modified instead of overwritten, see
	 * {@link Atomic.setDynamic()}.
	 *
	 * @param value The new value to store.
	 */ set(value) {
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
	 */ setDynamic(fn) {
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
 * In cases where no data is needed to be stored, but something needs computing, it is preferred to
 * use an {@link Effect} container instead.
 */ export class Computed extends Store {
    /** The function to compute a new value for this container. */ computeFn;
    /**
	 * Create a {@link Computed} container by defining a compute function.
	 *
	 * A computed value does not require its dependencies listed as automatic dependency discovery
	 * will take place on the first run of the computation. However, it is imperative to not create
	 * a circular dependency as doing so will result in an infinite loop. There is no built-in
	 * method of detecting circular dependencies, so it is up to clients to ensure this does not
	 * occur.
	 *
	 * @param computeFn The function that will be used to compute new values.
	 */ constructor(computeFn){
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
 */ export class Effect extends GraphItem {
    /** The function to perform effects for this container. */ effectFn;
    /**
	 * Create a {@link Effect} container by defining an effect function.
	 *
	 * @param effectFn The function that will be used to perform effects.
	 */ constructor(effectFn){
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
/** Central state storage for the application. */ export class State {
    // atomics
    /** The data used to render the current map. */ static data = new Atomic(undefined);
    /** The ID of the relation currently drawn on the map. */ static currentRelationId = new Atomic(undefined);
    /** All elements currently drawn on the map. */ static drawnElements = new Atomic(new Array());
    /** The way that is currently selected for inspection. */ static selectedWay = new Atomic(-1);
    /** All ways that are part of the current relation. */ static allWays = new Atomic(new Map());
    /** The dimensions that the canvas raster should be drawn at. */ static canvasDimensions = new Atomic(new ScreenCoordinate());
    /** The offset of the canvas relative to the page. */ static canvasOffset = new Atomic(new ScreenCoordinate());
    /** The current mouse position. */ static mousePos = new Atomic(new ScreenCoordinate());
    /** The position of the mouse when the left mouse button started to be pressed. */ static mouseDownPos = new Atomic(new ScreenCoordinate());
    /**
	 * The offset of the mouse relative to {@link mouseDownPos}.
	 *
	 * TODO: this should probably be a computed value.
	 */ static mouseOffset = new Atomic(new ScreenCoordinate());
    /** The offset of the map caused by zooming in/out. */ static zoomOffset = new Atomic(new ScreenCoordinate());
    /** Whether the mouse is currently being held down. */ static mouseDown = new Atomic(false);
    /**
	 * Whether the mouse has moved since being held down.
	 *
	 * TODO: this should probably be a computed value.
	 */ static mouseMoved = new Atomic(false);
    /** The current zoom factor of the map. */ static zoom = new Atomic(0);
    // computed
    /** The multiplier data for the current map. */ static multiplier = new Computed(()=>{
        let maxLat = 0, minLat = 0, maxLon = 0, minLon = 0, multiplier = 0;
        const dataCache = this.data.get();
        const canvasCache = this.canvasDimensions.get();
        if (dataCache === undefined) return {
            minLat,
            maxLat,
            minLon,
            maxLon,
            multiplier
        };
        const allLats = new Array();
        const allLons = new Array();
        dataCache.forEach((way)=>{
            way.nodes.forEach(({ lat, lon })=>{
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
        return {
            minLat,
            maxLat,
            minLon,
            maxLon,
            multiplier
        };
    });
    /** The raw value of the combined {@link multiplier} and {@link zoom}. */ static totalMultiplierRaw = new Computed(()=>{
        return this.multiplier.get().multiplier + this.zoom.get();
    });
    /** The processed value of {@link totalMultiplierRaw} to provide a better zooming experience. */ static totalMultiplier = new Computed(()=>{
        return this.totalMultiplierRaw.get() ** 2;
    });
    /** The total offset of the map inside the canvas. */ static offset = new Computed(()=>{
        const totalMultiplierCache = this.totalMultiplier.get();
        const { minLon, maxLon, minLat, maxLat } = this.multiplier.get();
        const canvasCache = this.canvasDimensions.get();
        return new ScreenCoordinate(canvasCache.x / 2 - (minLon + (maxLon - minLon) / 2) * totalMultiplierCache + this.mouseOffset.get().x + this.zoomOffset.get().x, canvasCache.y / 2 + (minLat + (maxLat - minLat) / 2) * totalMultiplierCache + this.mouseOffset.get().y + this.zoomOffset.get().y);
    });
}
