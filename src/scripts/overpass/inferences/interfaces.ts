import { MergeWayTag, MergeWayTags } from "../../types/processed.js";
import { TagWarning } from "../warnings.js";

/**
 * Function signature for transform functions.
 */
export type TransformFn<Tag extends MergeWayTag> = (
	tag: Tag,
	value: MergeWayTags[Tag],
	tags: MergeWayTags
) => MergeWayTags[Tag];

/**
 * NOP function to be used when there are no transforms available for a tag.
 */
export function noTransform<Tag extends MergeWayTag>(
	_tag: Tag,
	value: MergeWayTags[Tag]
): MergeWayTags[Tag] {
	return value;
}

/**
 * Function signature for validation functions.
 */
export type ValidationFn<Tag extends MergeWayTag> = (
	value: MergeWayTags[Tag],
	tags: MergeWayTags,
	warnings: Set<TagWarning>
) => void;

/**
 * NOP function to be used when there are no validations available for a tag.
 */
export function noValidation() {}
