export class TagWarning extends Error {
    static onewayWithBackwardLanes(numLanes) {
        return new TagWarning(`Way is set as 'oneway' while also specifying '${numLanes}' backward lanes.`);
    }
    static notOnewayWithNoBackwardLanes() {
        return new TagWarning(`Way is not set as 'oneway' while having no backward lanes.`);
    }
    static lanesEqualZero(tag) {
        return new TagWarning(`Way has 0 '${tag}' specified.`);
    }
    static lanesUnequalToForwardBackward(lanes, lanesForward, lanesBackward) {
        return new TagWarning(`Way has '${lanes}' lanes specified, however forward and backward lanes total to '${lanesForward.add(lanesBackward)}'.`);
    }
    static turnLanesUnequalToLanes(turnLanesTag, turnLanesNumber, lanesTag, lanesNumber) {
        return new TagWarning(`'${lanesTag}' specifies '${lanesNumber}' lanes, however '${turnLanesTag}' specifies '${turnLanesNumber}' lanes.`);
    }
}
