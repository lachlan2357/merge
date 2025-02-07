import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";
export class HelpPopup extends Popup {
    title = "Help";
    build() {
        const help = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
        return [help];
    }
}
export const HELP_POPUP = new HelpPopup();
