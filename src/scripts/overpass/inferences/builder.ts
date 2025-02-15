import { OsmInner, OsmMaybe, OsmValue, OsmValueForTag, ToString } from "../../types/osm.js";
import {
	Certain,
	MergeCertain,
	MergeWayTag,
	MergeWayTagIn,
	MergeWayTagsIn,
	Pretty
} from "../../types/processed.js";
import { InferenceGraph } from "./graph.js";

/**
 * Typed object for a subset of {@link MergeWayTagsIn}.
 */
type SetObject<Tags extends readonly MergeWayTagIn[]> = Pretty<
	MergeCertain<Pick<MergeWayTagsIn, Tags[number]>>
>;

/**
 * A function used to infer a certain {@link Tag}.
 */
type InferenceFn<Tag extends MergeWayTagIn, SetTags extends readonly MergeWayTagIn[]> = (
	tags: SetObject<SetTags>
) => Certain<MergeWayTagsIn[Tag]>;

/**
 * A function used to compare a value with an expected value.
 */
type CompareFn = (tag: OsmValue<ToString>) => boolean;

/**
 * A loosely-typed {@link Inference} object to allow polymorphism.
 */
export type UnknownInference<Tag extends MergeWayTag> = Inference<
	Tag,
	Readonly<Array<MergeWayTagIn>>
>;

/**
 * Build a pathway for a tag to be able to infer its value.
 *
 * A pathway requires two components:
 *
 * 1. Assertions. Each assertion forms a check that must be true in order for this inference to be
 * able to be made. Some common assertions are provided as their own functions, such as
 * {@link InferenceBuilder.assertIsSet()}, {@link InferenceBuilder.assertIsEq()}, etc., however a
 * catch-all {@link InferenceBuilder.assertThat()} is provided for extended functionality.
 * 2. Inference Function. Given all the assertions to be true, an inference function is required
 * to transform the assertions into an inferred value.
 *
 * @template Tag The {@link MergeWayTag} which this creator is building for.
 * @template SetTags All tags this pathway requires to be present to evaluate an inference.
 */
export class InferenceBuilder<
	Tag extends MergeWayTag,
	SetTags extends readonly MergeWayTagIn[] = []
> {
	/**
	 * The {@link MergeWayTag} this inference is being built for.
	 */
	readonly tag: Tag;

	/**
	 * All tags that have been asserted to exist.
	 */
	readonly setTags: SetTags;

	/**
	 * All comparison functions which must return true to be able to use this inference path.
	 */
	readonly cmpFns: Array<[MergeWayTagIn, CompareFn]>;

	/**
	 * Initialise a new {@link InferenceBuilder} object.
	 *
	 * Generally, this method should not be used to initialise a new {@link InferenceBuilder}.
	 * Instead, consider using {@link InferenceBuilder.new()}. This constructor is designed for
	 * internal use during the builder pattern.
	 *
	 * @param tag The tag this builder is created for.
	 * @param setTags All tags which must exist for this inference.
	 * @param cmpFns All comparison functions which must return true for this inference.
	 */
	private constructor(tag: Tag, setTags: SetTags, cmpFns: Array<[MergeWayTagIn, CompareFn]>) {
		this.tag = tag;
		this.setTags = setTags;
		this.cmpFns = cmpFns;
	}

	/**
	 * Assert that a certain tag is a certain thing.
	 *
	 * @param tag The tag to assert.
	 * @param cmpFn A comparison function which determines whether the 'thing' is true.
	 * @returns A new builder with this assertion added.
	 */
	assertThat<
		OsmTag extends MergeWayTagIn,
		OsmType extends OsmValueForTag<OsmTag> = OsmValueForTag<OsmTag>
	>(tag: OsmTag, cmpFn: (tag: OsmType) => boolean) {
		const entry = [tag, cmpFn] as [MergeWayTagIn, CompareFn];
		return new InferenceBuilder(this.tag, [...this.setTags, tag], [...this.cmpFns, entry]);
	}

	/**
	 * Assert that a certain tag has it's value set.
	 *
	 * @param tag The tag to assert.
	 * @returns A new builder with this assertion added.
	 */
	assertIsSet<OsmTag extends MergeWayTagIn>(tag: OsmTag) {
		return new InferenceBuilder(this.tag, [...this.setTags, tag], this.cmpFns);
	}

	/**
	 * Assert that a certain tag is equal to a certain value.
	 *
	 * @param tag The tag to assert.
	 * @param cmp The value to compare {@link tag} with.
	 * @returns A new builder with this assertion added.
	 */
	assertIsEq<
		OsmTag extends MergeWayTagIn,
		OsmType extends OsmValueForTag<OsmTag> = OsmValueForTag<OsmTag>
	>(tag: OsmTag, cmp: OsmType | OsmInner<OsmType>) {
		return this.assertThat(tag, tag => tag.eq(cmp));
	}

	/**
	 * Complete this builder by defining an inference function.
	 *
	 * @param inferenceFn The function used to infer a value for this tag.
	 * @returns The completed inference.
	 */
	setInferenceFn<Infer extends InferenceFn<Tag, SetTags>>(
		inferenceFn: Infer
	): Inference<Tag, SetTags> {
		return new Inference(this, inferenceFn);
	}

	/**
	 * Create a new {@link InferenceBuilder} for a specific {@link tag}.
	 *
	 * @param tag The tag to create this builder for.
	 * @returns A new {@link InferenceBuilder} object.
	 */
	static new<Tag extends MergeWayTag>(tag: Tag) {
		return new InferenceBuilder(tag, [], []);
	}
}

/**
 * An complete inference path.
 *
 * Generally, {@link Inference} objects should be initialised by first creating an
 * {@link InferenceBuilder} then building it through {@link InferenceBuilder.setInferenceFn}.
 *
 * @template Tag The {@link MergeWayTag} which this creator is building for.
 * @template SetTags All tags this pathway requires to be present to evaluate an inference.
 * @template InferFn The shape of the required inference function.
 * @template Builder The type of builder used to create this {@link Inference}.
 */
export class Inference<
	Tag extends MergeWayTag,
	SetTags extends readonly MergeWayTagIn[],
	InferFn extends InferenceFn<Tag, SetTags> = InferenceFn<Tag, SetTags>,
	Builder extends InferenceBuilder<Tag, SetTags> = InferenceBuilder<Tag, SetTags>
> {
	/**
	 * The {@link InferenceBuilder} used to create this {@link Inference}.
	 */
	readonly builder: Builder;

	/**
	 * The function to be used to infer a the {@link Tag} value.
	 */
	readonly inferenceFn: InferFn;

	/**
	 * Create a new {@link Inference}.
	 *
	 * @param builder The {@link InferenceBuilder} this {@link Inference} is based on.
	 * @param inferenceFn The function defining how to infer this {@link Tag} value.
	 */
	constructor(builder: Builder, inferenceFn: InferFn) {
		this.builder = builder;
		this.inferenceFn = inferenceFn;
	}

	/**
	 * Attempt to infer the value for {@link this.builder.tag}.
	 *
	 * In the case this inference cannot be successfully completed, nothing will be updated.
	 * However in the event it can be, the value stored in {@link tags} will be set and
	 * {@link inferenceGraph} will be notified that the value has been set.
	 *
	 * It is also possible for it to be determined that it is impossible for this inference to ever
	 * yield a result. In this case, {@link inferenceGraph} will be notified as such.
	 *
	 * @param tags The current state of the tags.
	 * @param inferenceGraph The graph this inference is attached to.
	 * @returns The inferred value, if it is possible to be inferred.
	 */
	tryInfer(
		tags: MergeWayTagsIn,
		inferenceGraph: InferenceGraph
	): Certain<MergeWayTagsIn[Tag]> | undefined {
		// ensure tag doesn't already have a value set
		const currentValue = tags[this.builder.tag];
		if (currentValue.isSet()) return;

		// check and type set values
		const partialTagsSubset: Partial<Record<SetTags[number], OsmValue<ToString>>> = {};
		for (const tag of this.builder.setTags) {
			const maybeValue = tags[tag];
			if (!maybeValue.isSet()) return;

			const typedMaybe: OsmMaybe<OsmValue<ToString>, OsmValue<ToString>> = maybeValue;
			partialTagsSubset[tag as SetTags[number]] = typedMaybe.get();
		}
		const tagsSubset = partialTagsSubset as SetObject<SetTags>;

		// ensure all comparison assertions are true
		for (const [tag, cmpFn] of this.builder.cmpFns) {
			const value = tagsSubset[tag as keyof typeof tagsSubset];
			const succeeded = cmpFn(value);
			if (succeeded) continue;

			// check has not succeeded, thus inference is impossible
			inferenceGraph.notifyIsImpossible(this);
		}

		// infer value
		const newValue = this.inferenceFn(tagsSubset);
		if (newValue === undefined) return;
		(tags[this.builder.tag] as OsmMaybe<OsmValue<ToString>>) = newValue.maybe() as OsmMaybe<
			OsmValue<ToString>
		>;

		// notify graph of set value
		if (newValue) inferenceGraph.notifySet(this.builder.tag, tags);
	}
}
