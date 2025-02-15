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
 * Function signature for validation functions.
 */
export type ValidationFn<Tag extends MergeWayTag> = (
	value: MergeWayTags[Tag],
	tags: MergeWayTags,
	warnings: Set<TagWarning>
) => void;
