import { MergeWayTag, MergeWayTagIn, MergeWayTagsIn } from "../../types/processed.js";
import { UnknownInference } from "./builder.js";

export type Nodes = Array<UnknownInference<MergeWayTag>>;
export class Graph extends Map<MergeWayTagIn, Set<UnknownInference<MergeWayTag>>> {}

export class InferenceGraph {
	/**
	 * All nodes to be added to the graph.
	 */
	private readonly nodes: Nodes;

	/**
	 * Graph containing a tag-dependency relationship.
	 */
	private readonly graph: Graph;

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
	 * Request all nodes in the graph attempt to infer their values.
	 *
	 * This request will set of a chain of inferences to ultimately render as many inferences as
	 * possible using this layer.
	 *
	 * @param tags The current state of the tags.
	 */
	runGraph(tags: MergeWayTagsIn) {
		// try infer each node
		for (const node of this.nodes) {
			node.tryInfer(tags, this);
		}
	}

	/**
	 * Notify this graph that a {@link tag} has just had its value set.
	 *
	 * Notifying the graph will cause it to individually notify each dependent of the tag that its
	 * value has been set, giving all dependents an opportunity to infer their own values if
	 * possible.
	 *
	 * @param tag The tag which has just had its value set.
	 * @param tags The current state of the tags.
	 */
	notifySet(tag: MergeWayTagIn, tags: MergeWayTagsIn) {
		const set = this.graph.get(tag);
		if (set === undefined) return;

		for (const inference of set) {
			inference.tryInfer(tags, this);
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
