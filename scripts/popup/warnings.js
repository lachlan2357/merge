import { ElementBuilder, FontAwesomeIcon } from "../elements.js";
import { State } from "../state/index.js";
import { Popup, displaySidebar } from "./index.js";
export class WarningsPopup extends Popup {
    build() {
        const heading = new ElementBuilder("h2").text("Warnings").build();
        const emptyText = new ElementBuilder("p")
            .text("There are no warnings for the data on the map.")
            .build();
        // ensure data exists
        const dataCache = State.data.get();
        if (dataCache === undefined) {
            return [heading, emptyText];
        }
        // display all warnings
        const entries = new Array();
        for (const way of dataCache.values()) {
            const id = way.originalWay.id;
            const subHeading = new ElementBuilder("h3").text(`Way ${id.toString()}`).build();
            const icon = new FontAwesomeIcon("solid", "arrow-up-right-from-square").build();
            const subHeadingLink = new ElementBuilder("button")
                .event("click", () => displaySidebar(id))
                .children(icon)
                .build();
            const list = new ElementBuilder("ul");
            for (const [tag, warnings] of way.warnings) {
                for (const warning of warnings) {
                    const listItem = new ElementBuilder("li")
                        .text(`${tag}: ${warning.message}`)
                        .build();
                    list.children(listItem);
                }
            }
            const listElement = list.build();
            if (listElement.children.length > 0)
                entries.push(subHeading, subHeadingLink, listElement);
        }
        // display warnings if present
        if (entries.length === 0)
            return [heading, emptyText];
        else
            return [heading, ...entries];
    }
}
export const WARNINGS_POPUP = new WarningsPopup();
