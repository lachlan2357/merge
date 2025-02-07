import { FontAwesomeIcon } from "../components/icon.js";
import { PopupContainer } from "../components/popup.js";
import { ElementBuilder } from "../elements.js";
import { State } from "../state/index.js";
import { createCustomElement } from "../supplement/elements.js";
import { POPUP_DIALOG, Popup } from "./index.js";
import sidebar from "../map/sidebar.js";
export class WarningsPopup extends Popup {
    title = "Warnings";
    build() {
        const emptyText = new ElementBuilder("p")
            .text("There are no warnings for the data on the map.")
            .build();
        // ensure data exists
        const dataCache = State.data.get();
        if (dataCache === undefined)
            return [emptyText];
        // display all warnings for each way
        const containers = new Array();
        for (const way of dataCache.values()) {
            // don't show container if there are no warnings
            if (way.warnings.size === 0)
                continue;
            // header
            const id = way.originalWay.id;
            const heading = new ElementBuilder("h3").text(`Way ${id.toString()}`).build();
            const icon = createCustomElement(FontAwesomeIcon).setIcon("arrow-up-right-from-square");
            const button = new ElementBuilder("button")
                .tooltip("Inspect Way", "left")
                .event("click", () => {
                POPUP_DIALOG.close();
                sidebar.show(id);
            })
                .children(icon)
                .build();
            // main
            const list = new ElementBuilder("ul");
            for (const [tag, warnings] of way.warnings) {
                for (const warning of warnings) {
                    const listItem = new ElementBuilder("li")
                        .text(`${tag}: ${warning.message}`)
                        .build();
                    list.children(listItem);
                }
            }
            // append children
            const container = createCustomElement(PopupContainer)
                .appendToHeader(heading, button)
                .appendToMain(list.build());
            containers.push(container);
        }
        // display warnings if present
        if (containers.length === 0)
            return [emptyText];
        else
            return containers;
    }
}
export const WARNINGS_POPUP = new WarningsPopup();
