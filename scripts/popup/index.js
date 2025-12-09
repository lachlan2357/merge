import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import { createCustomElement, getElement } from "../supplement/elements.js";
/** The {@link HTMLDialogElement} to render the popup in. */ export const POPUP_DIALOG = getElement("popup", HTMLDialogElement);
/** Define a popup window to be displayed. */ export class Popup {
    /**
	 * All children of the popup.
	 *
	 * This is generally calculated through {@link build()} at a later stage.
	 */ children = new Array();
    /**
	 * Display this popup window in the {@link POPUP_DIALOG}.
	 *
	 * @param onClose An optional event to run when the {@link HTMLDialogElement} closes.
	 */ display(onClose) {
        // purge all existing children
        while(POPUP_DIALOG.lastChild !== null)POPUP_DIALOG.lastChild.remove();
        // add window popup decorations
        const heading = new ElementBuilder("h2").text(this.title).build();
        const closeIcon = createCustomElement(FontAwesomeIcon).setIcon("xmark");
        const closeButton = new ElementBuilder("button").id("popup-close").addClasses("close-button").children(closeIcon).event("click", ()=>Popup.close()).tooltip("Close", "bottom").build();
        const icons = new ElementBuilder("div").addClasses("title-bar-buttons").children(closeButton).build();
        const header = new ElementBuilder("header").addClasses("title-bar").children(heading, icons).build();
        // rebuild and append children
        this.children = this.build();
        const main = new ElementBuilder("main").children(...this.children).build();
        // show popup
        POPUP_DIALOG.append(header, main);
        POPUP_DIALOG.showModal();
        POPUP_DIALOG.scrollTop = 0;
        // add event listeners
        if (onClose !== undefined) POPUP_DIALOG.addEventListener("close", onClose, {
            once: true
        });
    }
    /** Close the popup dialog. */ static close() {
        if (POPUP_DIALOG.open) POPUP_DIALOG.close();
    }
}
