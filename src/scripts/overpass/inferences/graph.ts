import { MergeWayTag, MergeWayTagIn, MergeWayTagsIn } from "../../types/processed.js";
import { UnknownInference } from "./builder.js";

/** Type of nodes to store in the {@link InferenceGraph}. */
export type Nodes = Array<UnknownInference<MergeWayTag>>;

/** Inner graph type to use in the {@link InferenceGraph}. */
export class Graph extends Map<MergeWayTagIn, Set<UnknownInference<MergeWayTag>>> {}

/** A graph to determine which tags can be inferred based on the values of all other tags. */
export class InferenceGraph {
	/** All nodes to be added to the graph. */
	readonly nodes: Nodes;

	/** Graph containing a tag-dependency relationship. */
	readonly graph: Graph;

	/**
	 * Initialise a new {@link InferenceGraph}.
	 *
	 * @param nodes All {@link UnknownInference} nodes that should form part of this graph.
	 */
	constructor(nodes: Nodes) {
		this.nodes = nodes;
		this.graph = this.#buildGraph();
	}

	/**
	 * Construct this graph based on {@link nodes}.
	 *
	 * @returns The built graph.
	 */
	#buildGraph() {
		const graph = new Graph();

		for (const calculation of this.nodes) {
			for (const tag of calculation.builder.setTags) {
				const set = graph.get(tag) ?? new Set();
				set.add(calculation);
				graph.set(tag, set);
			}
		}

		return graph;
	}

	/**
	 * Notify this graph that a {@link tag} has just had its value set.
	 *
	 * Notifying the graph will cause it to individually notify each dependent of the tag that its
	 * value has been set, giving all dependents an opportunity to infer their own values if
	 * possible.
	 *
	 * @param tag The tag which has just had its value set.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 * @param tags The current state of the tags.
	 */
	notifySet(tag: MergeWayTagIn, inferredTags: Set<MergeWayTag>, tags: MergeWayTagsIn) {
		const set = this.graph.get(tag);
		if (set === undefined) return;

		for (const inference of set) {
			inference.tryInfer(tags, inferredTags, this);
		}
	}

	/**
	 * Notify this graph that an {@link inference} is will never be possible to make.
	 *
	 * Notifying the graph will cause the inference to be completely stripped from the graph as to
	 * not cause unnecessary compute time.
	 *
	 * @param inference The inference that will never be possible to make;.
	 */
	notifyIsImpossible(inference: UnknownInference<MergeWayTag>) {
		for (const set of this.graph.values()) {
			set.delete(inference);
		}
	}
}
