import { LinkChip } from "../components/link-chip.js";
import { ElementBuilder } from "../elements.js";
import { createCustomElement } from "../supplement/elements.js";
import { Popup } from "./index.js";
/** Popup definition for the about screen. */ class AboutPopup extends Popup {
    title = "About";
    build() {
        const description = new ElementBuilder("p").text("Welcome to Merge! This project is still in it's early stages so bugs are missing features are to be expected. If you find any issues that aren't already known, please submit a report to the Github page.").build();
        const chip = createCustomElement(LinkChip).setUrl("https://www.github.com/lachlan2357/merge").setLabel("GitHub").setIcon("brands", "github");
        return [
            description,
            chip
        ];
    }
}
/** Instance of {@link AboutPopup}. */ export const ABOUT_POPUP = new AboutPopup();
