import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";
/** Popup definition for the help screen. */ class HelpPopup extends Popup {
    title = "Help";
    build() {
        const help = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
        return [
            help
        ];
    }
}
/** Instance of {@link HelpPopup}. */ export const HELP_POPUP = new HelpPopup();
