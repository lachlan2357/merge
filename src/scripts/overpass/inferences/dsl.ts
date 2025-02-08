import { OsmInner, OsmMaybe, OsmValue, OsmValueForTag, ToString } from "../../types/osm.js";
import {
	Certain,
	MergeCertain,
	MergeWayTag,
	MergeWayTagIn,
	MergeWayTagsIn,
	Pretty
} from "../../types/processed.js";

type SetObject<Tags extends readonly MergeWayTagIn[]> = Pretty<
	MergeCertain<Pick<MergeWayTagsIn, Tags[number]>>
>;

type InferenceFn<Tag extends MergeWayTagIn, SetTags extends readonly MergeWayTagIn[]> = (
	tags: SetObject<SetTags>
) => Certain<MergeWayTagsIn[Tag]>;

type CompareFn = (tag: OsmValue<ToString>) => boolean;

export class InferenceDsl<Tag extends MergeWayTag, SetTags extends readonly MergeWayTagIn[] = []> {
	readonly tag: Tag;
	readonly setTags: SetTags;
	readonly cmpFns: Array<[MergeWayTagIn, CompareFn]>;

	private constructor(tag: Tag, setTags: SetTags, cmpFns: Array<[MergeWayTagIn, CompareFn]>) {
		this.tag = tag;
		this.setTags = setTags;
		this.cmpFns = cmpFns;
	}

	assertIsSet<OsmTag extends MergeWayTagIn>(tag: OsmTag) {
		return new InferenceDsl(this.tag, [...this.setTags, tag], this.cmpFns);
	}

	assertIs<
		OsmTag extends MergeWayTagIn,
		OsmType extends OsmValueForTag<OsmTag> = OsmValueForTag<OsmTag>
	>(tag: OsmTag, cmpFn: (tag: OsmType) => boolean) {
		const entry = [tag, cmpFn] as [MergeWayTagIn, CompareFn];
		return new InferenceDsl(this.tag, [...this.setTags, tag], [...this.cmpFns, entry]);
	}

	assertIsEq<
		OsmTag extends MergeWayTagIn,
		OsmType extends OsmValueForTag<OsmTag> = OsmValueForTag<OsmTag>
	>(tag: OsmTag, cmp: OsmType | OsmInner<OsmType>) {
		return this.assertIs(tag, tag => tag.eq(cmp));
	}

	setInferenceFn<Infer extends InferenceFn<Tag, SetTags>>(
		inferenceFn: Infer
	): Inference<Tag, SetTags> {
		return new Inference(this, inferenceFn);
	}

	static new<Tag extends MergeWayTag>(tag: Tag) {
		return new InferenceDsl(tag, [], []);
	}
}

export type UnknownInference<Tag extends MergeWayTag> = Inference<
	Tag,
	Readonly<Array<MergeWayTagIn>>
>;

export class Inference<
	Tag extends MergeWayTag,
	SetTags extends readonly MergeWayTagIn[],
	Infer extends InferenceFn<Tag, SetTags> = InferenceFn<Tag, SetTags>,
	Dsl extends InferenceDsl<Tag, SetTags> = InferenceDsl<Tag, SetTags>
> {
	readonly dsl: Dsl;
	readonly inferenceFn: Infer;

	constructor(dsl: Dsl, inferenceFn: Infer) {
		this.dsl = dsl;
		this.inferenceFn = inferenceFn;
	}

	exec(tags: MergeWayTagsIn) {
		// ensure tag should be inferred
		const currentValue = tags[this.dsl.tag];
		if (currentValue.isSet()) return undefined;

		// check and type unset values
		let anyUnset = false;
		const tagsSubset: Partial<Record<SetTags[number], OsmValue<ToString>>> = {};
		for (const tag of this.dsl.setTags) {
			const maybeValue = tags[tag];
			if (maybeValue.isSet()) {
				const typedMaybe: OsmMaybe<OsmValue<ToString>, OsmValue<ToString>> = maybeValue;
				tagsSubset[tag as SetTags[number]] = typedMaybe.get();
			} else {
				anyUnset = true;
				break;
			}
		}
		if (anyUnset) return undefined;
		const typedTagsSubset = tagsSubset as SetObject<SetTags>;

		// check for all comparison assertions
		let anyFalse = false;
		for (const [tag, cmpFn] of this.dsl.cmpFns) {
			const value = typedTagsSubset[tag as keyof typeof typedTagsSubset];
			const succeeded = cmpFn(value);
			if (!succeeded) {
				anyFalse = true;
				break;
			}
		}

		// return inferred value
		if (anyFalse) return undefined;
		return this.inferenceFn(typedTagsSubset);
	}
}
