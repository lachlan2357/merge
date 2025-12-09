/**
 * Build a pathway for a tag to be able to infer its value.
 *
 * A pathway requires two components:
 *
 * 1. Assertions. Each assertion forms a check that must be true in order for this inference to be able
 *    to be made. Some common assertions are provided as their own functions, such as
 *    {@link InferenceBuilder.assertIsSet()}, {@link InferenceBuilder.assertIsEq()}, etc., however a
 *    catch-all {@link InferenceBuilder.assertThat()} is provided for extended functionality.
 * 2. Inference Function. Given all the assertions to be true, an inference function is required to
 *    transform the assertions into an inferred value.
 *
 * @template Tag The {@link MergeWayTag} which this creator is building for.
 * @template SetTags All tags this pathway requires to be present to evaluate an inference.
 */ export class InferenceBuilder {
    /** The {@link MergeWayTag} this inference is being built for. */ tag;
    /** All tags that have been asserted to exist. */ setTags;
    /** All comparison functions which must return true to be able to use this inference path. */ cmpFns;
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
	 */ constructor(tag, setTags, cmpFns){
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
	 */ assertThat(tag, cmpFn) {
        const entry = [
            tag,
            cmpFn
        ];
        return new InferenceBuilder(this.tag, [
            ...this.setTags,
            tag
        ], [
            ...this.cmpFns,
            entry
        ]);
    }
    /**
	 * Assert that a certain tag has it's value set.
	 *
	 * @param tag The tag to assert.
	 * @returns A new builder with this assertion added.
	 */ assertIsSet(tag) {
        return new InferenceBuilder(this.tag, [
            ...this.setTags,
            tag
        ], this.cmpFns);
    }
    /**
	 * Assert that a certain tag is equal to a certain value.
	 *
	 * @param tag The tag to assert.
	 * @param cmp The value to compare {@link tag} with.
	 * @returns A new builder with this assertion added.
	 */ assertIsEq(tag, cmp) {
        return this.assertThat(tag, (tag)=>tag.eq(cmp));
    }
    /**
	 * Complete this builder by defining an inference function.
	 *
	 * @param inferenceFn The function used to infer a value for this tag.
	 * @returns The completed inference.
	 */ setInferenceFn(inferenceFn) {
        return new Inference(this, inferenceFn);
    }
    /**
	 * Create a new {@link InferenceBuilder} for a specific {@link tag}.
	 *
	 * @param tag The tag to create this builder for.
	 * @returns A new {@link InferenceBuilder} object.
	 */ static new(tag) {
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
 */ export class Inference {
    /** The {@link InferenceBuilder} used to create this {@link Inference}. */ builder;
    /** The function to be used to infer a the {@link Tag} value. */ inferenceFn;
    /**
	 * Create a new {@link Inference}.
	 *
	 * @param builder The {@link InferenceBuilder} this {@link Inference} is based on.
	 * @param inferenceFn The function defining how to infer this {@link Tag} value.
	 */ constructor(builder, inferenceFn){
        this.builder = builder;
        this.inferenceFn = inferenceFn;
    }
    /**
	 * Attempt to infer the value for a {@link builder}'s tag.
	 *
	 * In the case this inference cannot be successfully completed, nothing will be updated. However
	 * in the event it can be, the value stored in {@link tags} will be set and {@link inferenceGraph}
	 * will be notified that the value has been set.
	 *
	 * It is also possible for it to be determined that it is impossible for this inference to ever
	 * yield a result. In this case, {@link inferenceGraph} will be notified as such.
	 *
	 * Note that if {@link inferenceGraph} is not passed, all hooks into a graph will be disabled and
	 * nothing will be notified.
	 *
	 * @param tags The current state of the tags.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 * @param inferenceGraph The graph this inference is attached to.
	 * @returns The inferred value, if it is possible to be inferred.
	 */ tryInfer(tags, inferredTags, inferenceGraph) {
        // ensure tag doesn't already have a value set
        const currentValue = tags[this.builder.tag];
        if (currentValue.isSet()) return false;
        // check and type set values
        const partialTagsSubset = {};
        for (const tag of this.builder.setTags){
            const maybeValue = tags[tag];
            if (!maybeValue.isSet()) return false;
            const typedMaybe = maybeValue;
            partialTagsSubset[tag] = typedMaybe.get();
        }
        const tagsSubset = partialTagsSubset;
        // ensure all comparison assertions are true
        for (const [tag, cmpFn] of this.builder.cmpFns){
            const value = tagsSubset[tag];
            const succeeded = cmpFn(value);
            if (succeeded) continue;
            // check has not succeeded, thus inference is impossible
            inferenceGraph?.notifyIsImpossible(this);
            return false;
        }
        // try infer value
        const newValue = this.inferenceFn(tagsSubset);
        if (newValue === undefined) return false;
        // set inferred value
        const tag = this.builder.tag;
        tags[tag] = newValue.maybe();
        inferredTags.add(tag);
        inferenceGraph?.notifySet(tag, inferredTags, tags);
        return true;
    }
}
