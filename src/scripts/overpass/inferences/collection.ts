import { Atomic } from "../../state/index.js";
import { OsmMaybe } from "../../types/osm.js";
import {
	InferencesMade,
	MergeWayTag,
	MergeWayTags,
	MergeWayTagsIn
} from "../../types/processed.js";
import { TagWarning } from "../warnings.js";
import { UnknownInference } from "./builder.js";
import { TransformFn, ValidationFn } from "./interfaces.js";

/**
 * Define how a certain tag can be inferred.
 *
 * There are five stages to the inference process, where each stage is performed on all the tags
 * until no changes can be made, then the next stage is performed the same way on tags that remain
 * with no value. Finally, for any tags that still do not have a value, their corresponding default
 * value is set.
 *
 * The five stages of inference are:
 *
 * 1. {@link calculations} are computations that can be made for the value of a tag based on the
 * values of other tags. It is crucial that these inferences, if run on the same tags object, will
 * either infer the same value or not make an inference, as absolute precision is a requirement for
 * this level of inference.
 *
 * 2. {@link fallbacks} are instructions for how to create a default value based on the values of
 * other tags. Fallbacks do not have the strict requirement for being precise like calculations,
 * thus they should be ordered in descending order of desirability.
 *
 * 3. {@link default} is the final chance for a value to be set, indicating that a tag's value is
 * completely missing with no chance of any reasonably guess to what the value should be. These
 * values are not based on any data, acting as a pure default value.
 *
 * 4. {@link formatFn} is designed to ensure the final tag's value is the most canonical version of
 * itself it can be. Sometimes, values for tags, or partial values in the case of arrays, can use
 * shortcuts in the way they are written to make it easier for mappers. The goal of format is to
 * reverse these changes to make it clearest what different values are referring to.
 *
 * 5. {@link validateFn} is used to check that the value makes sense in the context of all the other
 * tags. This is not the correct place to ensure values are "proper" (i.e., a surface is specified)
 * as a valid surface, these checks should be made in a class extending from {@link OsmValue},
 * restricting possible inner values to the "proper" ones.
 *
 * A tag must, at the very least, specify a default value, however may not specify a method for any
 * of the other stages if it is not applicable.
 *
 * Note: since each inference stage is completely separate, checks made in later stages cannot rely
 * on inferences made from earlier ones.
 */
export class InferenceCollection<
	Tag extends MergeWayTag,
	OsmType extends MergeWayTags[Tag] = MergeWayTags[Tag]
> {
	/**
	 * The {@link MergeWayTag} this inference object is declared for.
	 */
	readonly tag: Tag;

	private readonly calculations: Array<UnknownInference<Tag>>;
	private readonly fallbacks: Array<UnknownInference<Tag>>;
	private readonly defaultValue: MergeWayTags[Tag];
	private readonly formatFn: TransformFn<Tag>;
	private readonly validateFn: ValidationFn<Tag>;

	/**
	 * Define how a certain {@link tag} can be inferred.
	 *
	 * @param tag The tag these inferences apply to.
	 * @param calculations A method containing each calculation available for this tag.
	 * @param fallbacks A method containing each fallback available for this tag.
	 * @param defaultValue The value to set for this tag as a last resort.
	 * @param formatFn A method specifying how to properly format this tag.
	 * @param validateFn A method specifying validations checks for this tag.
	 */
	constructor(
		tag: Tag,
		calculations: Array<UnknownInference<Tag>>,
		fallbacks: Array<UnknownInference<Tag>>,
		defaultValue: MergeWayTags[Tag],
		formatFn: TransformFn<Tag>,
		validateFn: ValidationFn<Tag>
	) {
		this.tag = tag;
		this.calculations = calculations;
		this.fallbacks = fallbacks;
		this.defaultValue = defaultValue;
		this.formatFn = formatFn;
		this.validateFn = validateFn;
	}

	/**
	 * Attempt to calculate the value for this tag based on other existing tags.
	 *
	 * Calculations will only be attempted if the value of the tag is unset. In the case where no
	 * inferences can be made, no changes will occur. In the case where changes are made however,
	 * {@link hasChanged} will be set to `true` and the tag being inferred will be added to
	 * {@link inferredTags}.
	 *
	 * @param tags The current state of the existing tags.
	 * @param hasChanged State value to set if changes are made in this method.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 */
	tryCalculate(tags: MergeWayTagsIn, hasChanged: Atomic<boolean>, inferredTags: InferencesMade) {
		// ensure value doesn't already exist
		const oldValue = tags[this.tag];
		if (oldValue.isSet()) return;

		// try to infer value
		for (const calculation of this.calculations) {
			const newValue = calculation.exec(tags);
			if (newValue === undefined) continue;

			// make and record changes
			(tags[this.tag] as OsmMaybe<OsmType>) = newValue.maybe() as OsmMaybe<OsmType>;
			inferredTags.add(this.tag);
			hasChanged.set(true);
		}
	}

	/**
	 * Attempt to fallback the value for this tag based on other existing tags.
	 *
	 * Fallbacks will only be attempted if the value of the tag is unset. In the case where no
	 * inferences can be made, no changes will occur. In the case where changes are made however,
	 * {@link hasChanged} will be set to `true` and the tag being inferred will be added to
	 * {@link inferredTags}.
	 *
	 * @param tags The current state of the existing tags.
	 * @param hasChanged State value to set if changes are made in this method.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 */
	tryFallback(tags: MergeWayTagsIn, hasChanged: Atomic<boolean>, inferredTags: InferencesMade) {
		// ensure value already hasn't been inferred
		const oldValue = tags[this.tag];
		if (oldValue.isSet()) return;

		// try to perform fallbacks
		for (const fallback of this.fallbacks) {
			const newValue = fallback.exec(tags);
			if (newValue === undefined) return;

			// make and record changes
			(tags[this.tag] as OsmMaybe<OsmType>) = newValue.maybe() as OsmMaybe<OsmType>;
			inferredTags.add(this.tag);
			hasChanged.set(true);
		}
	}

	/**
	 * Default the value of this tag to its default value.
	 *
	 * The value will only defaulted if the tag is unset.
	 *
	 * @param tags The current state of the existing tags.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 */
	setDefault(tags: MergeWayTagsIn, inferredTags: InferencesMade) {
		// ensure value already hasn't been inferred
		const oldValue = tags[this.tag];
		if (oldValue.isSet()) return;

		// make and record changes
		(tags[this.tag] as OsmMaybe<OsmType>) = this.defaultValue.maybe() as OsmMaybe<OsmType>;
		inferredTags.add(this.tag);
	}

	/**
	 * Format the value in this tag to be the most explicit representation of the data.
	 *
	 * @param tags The final values of all tags.
	 */
	formatValue(tags: MergeWayTags) {
		// ensure tag value exists
		const value = tags[this.tag];

		// format value
		const formattedValue = this.formatFn(this.tag, value, tags);
		if (formattedValue === undefined) return;
		tags[this.tag] = formattedValue;
	}

	/**
	 * Validate the current tag to ensure it makes sense in the context of all other tags.
	 *
	 * @param tags The final values of all tags.
	 * @param warnings Set to keep track of warnings for all tags.
	 */
	validateValue = (tags: MergeWayTags, warnings: Set<TagWarning>) => {
		const value = tags[this.tag];

		// validate value
		this.validateFn(value, tags, warnings);
	};
}
