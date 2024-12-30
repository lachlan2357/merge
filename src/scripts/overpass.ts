import { Canvas } from "./canvas.js";
import { Database } from "./database.js";
import { setSearching } from "./dom.js";
import { AppErr, asyncWrapper } from "./errors.js";
import { AppMsg, Message } from "./messages.js";
import { Settings } from "./settings.js";
import { State } from "./state.js";
import { nullish } from "./supplement.js";
import {
	ImportedData,
	OverpassNode,
	OverpassRelation,
	OverpassResponse,
	OverpassWay,
	WayData
} from "./types.js";

export class Overpass {
	static async search(name: string) {
		const propagateError = (e: AppMsg) => {
			Message.display(e);
			setSearching(false);
		};

		setSearching();
		const roadName = name;
		const roadNumber = Number(name);

		if (roadName.length === 0) return propagateError("noSearchTerm");

		if (roadName.includes('"')) return propagateError("malformedSearchTerm");

		const searchMode = isNaN(roadNumber)
			? `<has-kv k="name" v="${roadName}"/>`
			: `<id-query type="relation" ref="${roadName}"/>`;

		const queryResult = await this.query(searchMode);
		if (!queryResult.ok) return propagateError("overpassError");
		const query = queryResult.unwrap();

		const relations = new Array<OverpassRelation>();
		const ways = new Map<number, OverpassWay>();
		const nodes = new Map<number, OverpassNode>();

		for (let i = 0, n = query.elements.length; i < n; i++) {
			const element = query.elements[i];

			switch (element.type) {
				case "relation":
					relations.push(element);
					break;
				case "way":
					if (element.tags?.highway) ways.set(element.id, element);
					break;
				case "node":
					nodes.set(element.id, element);
					break;
			}
		}

		if (relations.length > 1) return propagateError("multipleRelations");
		const relation = relations[0];

		if (!relation) return propagateError("noResult");
		State.currentRelationId.set(relation.id);

		const wayIdsInRelation = new Array<number>();

		for (let i = 0, n = relation.members.length; i < n; i++) {
			wayIdsInRelation.push(relation.members[i].ref);
		}

		const externalWays = new Array<OverpassWay>();
		ways.forEach((way, id) => {
			if (!wayIdsInRelation.includes(id)) {
				externalWays.push(way);
				ways.delete(id);
			}
		});

		this.process(ways, nodes);
		Canvas.centre();
		State.allWays.set(ways);
		setSearching(false);
	}

	static async query(mode: string) {
		const query = `<osm-script output="json"><union><query type="relation">${mode}</query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`;

		const ignoreCache = Settings.get("ignoreCache");

		const result = await Database.get(query);
		if (!result.ok || ignoreCache) return await this.fetch(query);
		else return result;
	}

	static async fetch(query: string) {
		return asyncWrapper<OverpassResponse, AppErr>("overpass", async () => {
			Message.display("overpassDownload");

			const req = await fetch(Settings.get("endpoint"), {
				method: "POST",
				body: query
			});
			const json: OverpassResponse | undefined = await req.json();
			if (json === undefined) throw new Error();

			const allKeys = await Database.keys();
			if (allKeys.ok) if (allKeys.unwrap().includes(query)) await Database.delete(query);

			if (json.elements.length > 0) await Database.insert(query, JSON.stringify(json));

			Settings.set("ignoreCache", false);
			return json;
		});
	}

	static process(allWays: Map<number, OverpassWay>, allNodes: Map<number, OverpassNode>) {
		const waysInfo: ImportedData = new Map();
		allWays.forEach((way, id) => {
			const tags = way.tags;
			const wayData: WayData = {
				nodes: new Map(),
				originalWay: way,
				orderedNodes: way.nodes,
				tags: {
					oneway: this.bool(tags?.oneway),
					junction: tags?.junction,
					lanes: this.number(tags?.lanes),
					lanesForward: this.number(tags?.["lanes:forward"]),
					lanesBackward: this.number(tags?.["lanes:backward"]),
					turnLanes: this.dArray(this.array(tags?.["turn:lanes"])),
					turnLanesForward: this.dArray(this.array(tags?.["turn:lanes:forward"])),
					turnLanesBackward: this.dArray(this.array(tags?.["turn:lanes:backward"])),
					surface: tags?.surface
				},
				warnings: new Array(),
				inferences: new Set()
			};

			for (let i = 0, n = way.nodes.length; i < n; i++) {
				const id = way.nodes[i];
				const node = allNodes.get(id);

				if (!node) continue;
				wayData.nodes.set(id, node);
			}

			// infer data
			let noChanges = false;
			while (!noChanges) {
				noChanges = true;
				const tags = wayData.tags;

				// lanes
				if (nullish(tags.lanes) && !nullish(tags.lanesForward)) {
					if (tags.oneway) {
						tags.lanes = tags.lanesForward;
						noChanges = false;
					} else if (!nullish(tags.lanesBackward)) {
						tags.lanes = tags.lanesForward + tags.lanesBackward;
						noChanges = false;
					}
				}

				// lanes:forward
				if (nullish(tags.lanesForward) && !nullish(tags.lanes)) {
					if (tags.oneway) {
						tags.lanesForward = tags.lanes;
						noChanges = false;
					} else if (!nullish(tags.lanesBackward)) {
						tags.lanesForward = tags.lanes - tags.lanesBackward;
						noChanges = false;
					} else if (!tags.oneway && tags.lanes % 2 === 0) {
						tags.lanesForward = tags.lanes / 2;
						noChanges = false;
					}
				}

				// lanes:backward
				if (nullish(tags.lanesBackward)) {
					if (tags.oneway) {
						tags.lanesBackward = 0;
						noChanges = false;
					} else if (!nullish(tags.lanes) && !nullish(tags.lanesForward)) {
						tags.lanesBackward = tags.lanes - tags.lanesForward;
						noChanges = false;
					} else if (!nullish(tags.lanes) && !(tags.lanes % 2)) {
						tags.lanesBackward = tags.lanes / 2;
						noChanges = false;
					}
				}

				// turn:lanes:forward
				if (nullish(tags.turnLanesForward)) {
					if (tags.oneway && !nullish(tags.turnLanes)) {
						tags.turnLanesForward = tags.turnLanes;
						noChanges = false;
					} else if (!nullish(tags.lanesForward)) {
						tags.turnLanesForward = this.dArray(
							this.array("|".repeat(tags.lanesForward))
						);
						noChanges = false;
					}
				}

				// turn:lanes:backward
				if (nullish(tags.turnLanesBackward) && !nullish(tags.lanesBackward)) {
					tags.turnLanesBackward = this.dArray(
						this.array("|".repeat(tags.lanesBackward))
					);
					noChanges = false;
				}
			}

			waysInfo.set(id, wayData);
		});

		State.data.set(waysInfo);
	}

	private static bool(value?: string) {
		if (value) return value === "yes";
		else return undefined;
	}

	private static number(value?: string) {
		const num = Number(value);
		if (!isNaN(num)) return num;
		else return undefined;
	}

	private static array(value?: string, delimiter = "|") {
		return value?.split(delimiter).map(value => value || "none") ?? new Array<string>();
	}

	private static dArray(array?: Array<string>, delimiter = ";") {
		return (
			array?.map(value => value.split(delimiter).map(value => value || "none")) ??
			new Array<Array<string>>()
		);
	}
}
