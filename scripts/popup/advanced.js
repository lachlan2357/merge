import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";
export class AdvancedPopup extends Popup {
    title = "Advanced";
    build() {
        const advanced = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
        return [advanced];
    }
}
export const ADVANCED_POPUP = new AdvancedPopup();
