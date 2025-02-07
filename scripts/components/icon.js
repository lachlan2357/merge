var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { CustomHTMLElement } from "./index.js";
/**
 * Icon element providing an interface to a FontAwesomeIcon.
 */
let FontAwesomeIcon = (() => {
    let _classDecorators = [CustomHTMLElement.registerCustomElement("fa-icon")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = CustomHTMLElement;
    var FontAwesomeIcon = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FontAwesomeIcon = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static observedAttributes = ["family", "icon", "animation"];
        /**
         * Underlying {@link HTMLElement} which FontAwesome uses to display icons.
         */
        icon = document.createElement("i");
        connectedCallback() {
            const shadow = this.attachShadow({ mode: "closed" });
            // set default family if none is specified
            if (this.getAttribute("family") === null)
                this.setFamily("solid");
            // required stylesheets
            const fontawesomeCss = document.createElement("link");
            fontawesomeCss.href = "/merge/fontawesome/css/all.min.css";
            fontawesomeCss.rel = "stylesheet";
            shadow.append(fontawesomeCss, this.icon);
        }
        attributeChangedCallback(attribute, oldValue, newValue) {
            switch (attribute) {
                case "family":
                case "icon":
                case "animation": {
                    if (oldValue !== null)
                        this.icon.classList.remove(`fa-${oldValue}`);
                    if (newValue !== null)
                        this.icon.classList.add(`fa-${newValue}`);
                    break;
                }
                default:
                    return super.attributeChangedCallback(attribute, oldValue, newValue);
            }
        }
        setFamily(family) {
            this.setAttribute("family", family);
            return this;
        }
        /**
         * Set the icon for this container.
         *
         * {@link icon} needs to be a valid FontAwesome icon. See https://fontawesome.com/icons/ for
         * available icons.
         *
         * @param icon The name of the icon.
         * @returns This object for method chaining.
         */
        setIcon(icon) {
            this.setAttribute("icon", icon);
            return this;
        }
        /**
         * Set the animation for this container.
         *
         * {@link animation} needs to be a valid FontAwesome animation. See
         * https://docs.fontawesome.com/web/style/animate for available animations.
         *
         * @param animation The name of the animation.
         * @returns This object for method chaining.
         */
        setAnimation(animation) {
            if (animation === null)
                this.removeAttribute("animation");
            else
                this.setAttribute("animation", animation ?? "");
            return this;
        }
        static {
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return FontAwesomeIcon = _classThis;
})();
export { FontAwesomeIcon };
