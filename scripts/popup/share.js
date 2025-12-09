import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import * as external from "../external.js";
import { State } from "../state/index.js";
import { createCustomElement } from "../supplement/elements.js";
import { Popup } from "./index.js";
/** Popup definition for the share screen. */ class SharePopup extends Popup {
    title = "Share";
    build() {
        const shareText = `${window.location.origin}${window.location.pathname}#${State.currentRelationId.get()}`;
        const copyIcon = createCustomElement(FontAwesomeIcon).setIcon("copy");
        const copyButton = new ElementBuilder("button").id("copy-button").addClasses("copy").tooltip("Copy", "left").event("click", ()=>{
            navigator.clipboard.writeText(shareText).then(()=>{
                copyIcon.setIcon("check");
                copyButton.tooltip("Copied", "left");
                setTimeout(()=>{
                    copyIcon.setIcon("copy");
                    copyButton.tooltip("Copy", "left");
                }, 2000);
            }).catch((e)=>console.error(e));
        }).children(copyIcon);
        const share = new ElementBuilder("span").text(shareText).build();
        const container = new ElementBuilder("div").id("copy-container").children(share, copyButton.build()).build();
        const iDIcon = createCustomElement(FontAwesomeIcon).setIcon("map");
        const iDButton = new ElementBuilder("button").id("osm").addClasses("open-with").tooltip("Open in iD", "top").event("click", ()=>external.relation.iD()).children(iDIcon).build();
        const josmIcon = createCustomElement(FontAwesomeIcon).setIcon("desktop");
        const josmButton = new ElementBuilder("button").id("josm").addClasses("open-with").tooltip("Open in JOSM", "top").event("click", ()=>external.relation.josm()).children(josmIcon).build();
        const openWithContainer = new ElementBuilder("div").id("open-with-container").children(iDButton, josmButton).build();
        return [
            container,
            openWithContainer
        ];
    }
}
/** Instance of {@link SharePopup}. */ export const SHARE_POPUP = new SharePopup();
