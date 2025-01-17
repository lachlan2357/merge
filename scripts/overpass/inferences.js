import { Atomic } from "../state/index.js";
import { OsmArray, OsmBoolean, OsmDoubleArray, OsmString, OsmUnsignedInteger } from "../types/osm.js";
import { isEq, isSet } from "./process.js";
import { TagWarning } from "./warnings.js";
/**
 * NOP function to be used when there are no inferences available for a tag.
 */
function noInference() { }
/**
 * NOP function to be used when there are no transforms available for a tag.
 */
function noTransform(_tag, value) {
    return value;
}
/**
 * NOP function to be used when there are no validations available for a tag.
 */
function noValidation() { }
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
 * 4. {@link format} is designed to ensure the final tag's value is the most canonical version of
 * itself it can be. Sometimes, values for tags, or partial values in the case of arrays, can use
 * shortcuts in the way they are written to make it easier for mappers. The goal of format is to
 * reverse these changes to make it clearest what different values are referring to.
 *
 * 5. {@link validate} is used to check that the value makes sense in the context of all the other
 * tags. This is not the correct place to ensure values are "proper" (i.e., a surface is specified)
 * as a valid surface, these checks should be made in a class extending from {@link OsmValue},
 * restricting possible inner values to the "proper" ones.
 *
 * A tag must, at the very least, specify a default value, however may not specify a method for any
 * of the other stages if it is not applicable.
 *
 * Note: since each inference stage is completely separate, checks made in later stages cannot rely
 * on inferences made from earlier ones.
 *
 * @param tag The tag these inferences apply to.
 * @param calculations A method containing each calculation available for this tag.
 * @param fallbacks A method containing each fallback available for this tag.
 * @param defaultValue The value to set for this tag as a last resort.
 * @param format A method specifying how to properly format this tag.
 * @param validate A method specifying validations checks for this tag.
 */
function inferenceCreator(tag, calculations, fallbacks, defaultValue, format, validate) {
    const tryCalculate = (tags, hasChanged, inferredTags) => {
        // ensure value doesn't already exist
        const oldValue = tags[tag];
        if (isSet(oldValue))
            return;
        // try to infer value
        const newValue = calculations(tags);
        if (newValue === undefined)
            return;
        // make and record changes
        tags[tag] = newValue;
        inferredTags.add(tag);
        hasChanged.set(true);
    };
    const tryFallback = (tags, hasChanged, inferredTags) => {
        // ensure value already hasn't been inferred
        const oldValue = tags[tag];
        if (isSet(oldValue))
            return;
        // try to perform fallbacks
        const newValue = fallbacks(tags);
        if (newValue === undefined)
            return;
        // make and record changes
        tags[tag] = newValue;
        inferredTags.add(tag);
        hasChanged.set(true);
    };
    const setDefault = (tags, inferredTags) => {
        // ensure value already hasn't been inferred
        const oldValue = tags[tag];
        if (isSet(oldValue))
            return;
        // make and record changes
        tags[tag] = defaultValue;
        inferredTags.add(tag);
    };
    const formatValue = (tags) => {
        // ensure tag value exists
        const value = tags[tag];
        // format value
        const formattedValue = format(tag, value, tags);
        if (formattedValue === undefined)
            return;
        tags[tag] = formattedValue;
    };
    const validateValue = (tags, warnings) => {
        const value = tags[tag];
        // validate value
        validate(value, tags, warnings);
    };
    return { tag, tryCalculate, tryFallback, setDefault, formatValue, validateValue };
}
/**
 * Perform all available {@link inferences} on {@link tags}.
 *
 * Inferences will be performed as specified under {@link inferenceCreator()} on {@link tags}.
 *
 * @param tags The tags to perform inferences on.
 * @param inferences The inferences to perform.
 * @returns The tags which have been inferred.
 */
export function performInferences(tags) {
    const hasChanged = new Atomic(true);
    const inferredTags = new Set();
    const inferences = new Set(Object.values(allInferences));
    // perform calculations
    do {
        hasChanged.set(false);
        for (const infer of inferences)
            infer.tryCalculate(tags, hasChanged, inferredTags);
    } while (hasChanged.get() === true);
    // perform fallbacks
    do {
        hasChanged.set(false);
        for (const obj of inferences)
            obj.tryFallback(tags, hasChanged, inferredTags);
    } while (hasChanged.get() === true);
    // set defaults
    for (const obj of inferences)
        obj.setDefault(tags, inferredTags);
    return inferredTags;
}
export function performTransforms(tags) {
    const warningMap = new Map();
    const inferences = new Set(Object.values(allInferences));
    // format values
    for (const obj of inferences)
        obj.formatValue(tags);
    // validate values
    for (const obj of inferences) {
        const warnings = new Set();
        obj.validateValue(tags, warnings);
        if (warnings.size > 0)
            warningMap.set(obj.tag, warnings);
    }
    return warningMap;
}
/**
 * All available formatters to be used by various tags.
 */
const formatters = {
    /**
     * Format a `turn:lanes`, `turn:lanes:*` tag value.
     *
     * @param value The original value of the `turn:lanes` tag.
     * @returns The formatted value of the `turn:lanes` tag.
     */
    turnLanes(tag, value, tags) {
        // ensure formatter is applicable to this tag
        if (!(tag === "turnLanesForward" || tag === "turnLanesBackward"))
            return value;
        // add missing lanes to turn:lanes
        const numLanesObj = tag === "turnLanesForward" ? tags.lanesForward : tags.lanesBackward;
        const numLanes = numLanesObj.get();
        while (value.length < numLanes)
            value.push(new OsmArray(new Array(), OsmString));
        // convert implicit nones (empty element) to explicit nones "none"
        return value.map(array => {
            if (array.length === 0)
                array.push(new OsmString(""));
            return array.map(value => (value.eq("") ? new OsmString("none") : value), OsmString);
        }, OsmString);
    }
};
/**
 * All available inferences to use when compiling tags.
 */
const allInferences = {
    /**
     * Infer whether a way should be marked as one-way.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferOneway: inferenceCreator("oneway", tags => {
        // lanes:backward === 0
        if (isEq(tags.lanesBackward, 0))
            return OsmBoolean.TRUE;
    }, noInference, OsmBoolean.FALSE, (noTransform), (oneway, tags, warnings) => {
        // oneway === true && lanes:backward !== 0
        if (oneway.eq(true) && !tags.lanesBackward.eq(0))
            warnings.add(TagWarning.onewayWithBackwardLanes(tags.lanesBackward));
        // oneway === false && lanes:backward === 0
        if (oneway.eq(false) && tags.lanesBackward.eq(0))
            warnings.add(TagWarning.notOnewayWithNoBackwardLanes());
    }),
    /**
     * Infer whether a junction is present.
     *
     * Note: there is no way to infer the value of `junction` to be anything other than `no`. Thus, if
     * the `junction` tag is missing, it will be defaulted to `no`.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferJunction: inferenceCreator("junction", () => { }, () => { }, new OsmString("no"), (noTransform), noValidation),
    /**
     * Infer whether a surface is present.
     *
     * Note: there is no way to infer the value of `surface` to be anything other than its initial
     * value or `unknown`. Thus, if the `surface` tag is missing, it will be defaulted to `unknown`.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferSurface: inferenceCreator("surface", () => { }, () => { }, new OsmString("unknown"), (noTransform), noValidation),
    /**
     * Infer the total number of lanes.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferLanes: inferenceCreator("lanes", tags => {
        // oneway === true && lanes:forward set
        if (isEq(tags.oneway, true) && isSet(tags.lanesForward))
            return tags.lanesForward;
        // oneway === false && lanes:forward set && lanes:backward set
        if (isEq(tags.oneway, false) && isSet(tags.lanesForward) && isSet(tags.lanesBackward))
            return tags.lanesForward.add(tags.lanesBackward);
    }, tags => {
        // tags.oneway set
        if (isSet(tags))
            return new OsmUnsignedInteger(tags.oneway ? 1 : 2);
    }, new OsmUnsignedInteger(2), (noTransform), (lanes, tags, warnings) => {
        // lanes === 0
        if (lanes.eq(0))
            warnings.add(TagWarning.lanesEqualZero("lanes"));
        // lanes !== lanes:forward + lanes:backward
        if (!lanes.eq(tags.lanesForward.add(tags.lanesBackward)))
            warnings.add(TagWarning.lanesUnequalToForwardBackward(lanes, tags.lanesForward, tags.lanesBackward));
    }),
    /**
     * Infer the number of forward-lanes.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferLanesForward: inferenceCreator("lanesForward", tags => {
        // oneway === true && lanes:forward set
        if (isEq(tags.oneway, true) && isSet(tags.lanes))
            return tags.lanes;
        // oneway === false && tags.lanes set && tags.lanesBackwardSet
        if (isEq(tags.oneway, false) && isSet(tags.lanes) && isSet(tags.lanesBackward))
            return tags.lanes.subtract(tags.lanesBackward);
    }, tags => {
        // oneway === false && tags.lanes % 2 === 0
        if (isEq(tags.oneway, false) && isSet(tags.lanes) && isEq(tags.lanes.mod(2), 0))
            return tags.lanes?.divide(2);
    }, new OsmUnsignedInteger(1), (noTransform), (lanesForward, tags, warnings) => {
        // lanes:forward === 0
        if (lanesForward.eq(0))
            warnings.add(TagWarning.lanesEqualZero("lanesForward"));
    }),
    /**
     * Infer the number of backward lanes.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferLanesBackward: inferenceCreator("lanesBackward", tags => {
        // oneway === true
        if (isEq(tags.oneway, true))
            return new OsmUnsignedInteger(0);
        // oneway === false && tags.lanes set && tags.lanesForward set
        if (isEq(tags.oneway, false) && isSet(tags.lanes) && isSet(tags.lanesForward))
            return tags.lanes.subtract(tags.lanesForward);
    }, tags => {
        // oneway === false && tags.lanes % 2 === 0
        if (isEq(tags.oneway, false) && isSet(tags.lanes) && isEq(tags.lanes.mod(2), 0))
            return tags.lanes.divide(2);
    }, new OsmUnsignedInteger(1), (noTransform), (lanesBackward, tags, warnings) => {
        // oneway === true && lanes:backward !== 0
        if (tags.oneway.eq(true) && !lanesBackward.eq(0))
            warnings.add(TagWarning.onewayWithBackwardLanes(tags.lanesBackward));
        // oneway === false && lanes:backward === 0
        if (tags.oneway.eq(false) && lanesBackward.eq(0))
            warnings.add(TagWarning.notOnewayWithNoBackwardLanes());
    }),
    /**
     * Infer which forward lanes should have which turn lane road markings.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferTurnLanesForward: inferenceCreator("turnLanesForward", tags => {
        // oneway === true && turn:lanes set
        if (isEq(tags.oneway, true) && isSet(tags.turnLanes))
            return tags.turnLanes;
    }, tags => {
        // lanes:forward set
        if (isSet(tags.lanesForward))
            return new OsmDoubleArray("", OsmString);
    }, new OsmDoubleArray("", OsmString), formatters.turnLanes, (turnLanesForward, tags, warnings) => {
        // length turn:lanes:forward !== lanes:forward
        if (!tags.lanesForward.eq(turnLanesForward.length))
            warnings.add(TagWarning.turnLanesUnequalToLanes("turnLanesForward", turnLanesForward.length, "lanesForward", tags.lanesForward));
    }),
    /**
     * Infer which backward lanes should have which turn lane road markings.
     *
     * @param tags The current state of the tags.
     * @param hasChanged State to change when a change has been made.
     * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
     */
    inferTurnLanesBackward: inferenceCreator("turnLanesBackward", tags => {
        // oneway === true
        if (isEq(tags.oneway, true))
            return new OsmDoubleArray(new Array(), OsmString);
    }, tags => {
        // lanes:backward set
        if (isSet(tags.lanesBackward))
            return new OsmDoubleArray(new Array(tags.lanesBackward.get()).fill(new OsmArray("", OsmString)), OsmString);
    }, new OsmDoubleArray(new Array(), OsmString), formatters.turnLanes, (turnLanesBackward, tags, warnings) => {
        // length turn:lanes:backward !== lanes:backward
        if (!tags.lanesBackward.eq(turnLanesBackward.length))
            warnings.add(TagWarning.turnLanesUnequalToLanes("turnLanesBackward", turnLanesBackward.length, "lanesBackward", tags.lanesBackward));
    })
};
