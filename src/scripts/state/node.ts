/**
 * A node set is similar to a {@link Map}, except instead of all keys having to be unique, all
 * key-value pairs have to be unique.
 *
 * Note this class has very poor performance and should generally only be used where performance is
 * not paramount.
 */
export class GraphNodeSet<N1, N2> {
	private readonly inner = new Set<[N1, N2]>();

	/**
	 * Add an item to the node set.
	 *
	 * @param first The item to add in the first place position on the set.
	 * @param second The item to add in the second place position on the set.
	 */
	add(first: N1, second: N2) {
		// ensure no duplicates
		const newNode: [N1, N2] = [first, second];
		for (const existingNode of this.inner)
			if (this.areNodesEqual(newNode, existingNode)) return;

		this.inner.add(newNode);
	}

	/**
	 * Clear the node set.
	 */
	clear() {
		this.inner.clear();
	}

	/**
	 * Retrieve all {@link N2} values which have a relationship with a certain {@link N1} value.
	 *
	 * @param value The {@link N1} value to check a relationship with.
	 * @returns All {@link N2} values with a relationship.
	 */
	getSecondsForFirst(value: N1): Set<N2> {
		const set = new Set<N2>();

		for (const [first, second] of this.inner) {
			if (first === value) set.add(second);
		}

		return set;
	}

	/**
	 * Retrieve all {@link N1} values which have a relationship with a certain {@link N2} value.
	 *
	 * @param value The {@link N2} value to check a relationship with.
	 * @returns All {@link N1} values with a relationship.
	 */
	getFirstsForSecond(value: N2): Set<N1> {
		const set = new Set<N1>();

		for (const [first, second] of this.inner) {
			if (second === value) set.add(first);
		}

		return set;
	}

	/**
	 * Determine whether two nodes are equal.
	 *
	 * Since JavaScript compares values by reference comparison, an array containing the same two
	 * objects in the same order will not register as being equal. Thus, this method performs a
	 * deep comparison to determine whether the two nodes are equal.
	 *
	 * @param first The first node.
	 * @param second The second node.
	 * @returns Whether {@link first} and {@link second} represent the same node.
	 */
	private areNodesEqual(first: [N1, N2], second: [N1, N2]): boolean {
		return first[0] === second[0] && first[1] === second[1];
	}

	[Symbol.iterator]() {
		return this.inner[Symbol.iterator]();
	}
}
