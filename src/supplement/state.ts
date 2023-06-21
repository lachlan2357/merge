export class Store<T> {
	protected data: T;
	protected dependents: Array<Computed<unknown>>;
	protected effects: Array<Effect>;

	constructor(initial: T) {
		this.data = initial;
		this.dependents = [];
		this.effects = [];
	}

	get() {
		return this.data;
	}

	addDependent(dependent: Computed<unknown>) {
		this.dependents.push(dependent);
	}

	addEffect(effect: Effect) {
		this.effects.push(effect);
	}

	protected notifyDependents() {
		this.dependents.forEach(dependent => dependent.compute());
		this.effects.forEach(effect => effect.compute());
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

export class Computed<T> extends Store<T> {
	protected computeFn: () => T;

	constructor(computeFn: () => T, dependencies: Array<Store<unknown>>) {
		super(computeFn());
		this.computeFn = computeFn;
		dependencies.forEach(dependency => dependency.addDependent(this));
	}

	compute() {
		this.data = this.computeFn();
		this.notifyDependents();
	}
}

export class Effect {
	protected fn: () => void;

	constructor(fn: () => void, dependencies: Array<Store<unknown>>) {
		this.fn = fn;
		dependencies.forEach(dependency => dependency.addEffect(this));
	}

	compute() {
		this.fn();
	}
}
