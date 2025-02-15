import { OsmMaybe, OsmValue, ToString } from "../../types/osm.js";
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

	constructor(nodes: Nodes) {
		this.nodes = nodes;
		this.graph = this.buildGraph();
	}

	buildGraph(): Graph {
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

	runGraph(tags: MergeWayTagsIn) {
		// try infer each node
		for (const node of this.nodes) {
			node.exec(tags, this);
		}
	}

	notifySet(tag: MergeWayTagIn, tags: MergeWayTagsIn) {
		// ensure value has actually been set
		const valueMaybe = tags[tag] as OsmMaybe<OsmValue<ToString>>;
		if (valueMaybe.isSet() === false) return;
		const value = valueMaybe.get();

		const set = this.graph.get(tag);
		if (set === undefined) return;

		for (const inference of set) {
			inference.notifySet(tag, tags, value, this);
		}
	}
}
