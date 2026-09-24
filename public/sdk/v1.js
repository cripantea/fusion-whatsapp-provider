/*!
 * FusionWA SDK v1
 * The embedded document runs on FusionWA so Meta sees one known JSSDK host.
 */
(function (window, document) {
  "use strict";

  function resolveApiBase() {
    var current = document.currentScript;
    if (current && current.src) {
      try { return new URL(current.src).origin; } catch (error) { /* fallback below */ }
    }
    var scripts = document.getElementsByTagName("script");
    for (var index = 0; index < scripts.length; index += 1) {
      if (scripts[index].src && scripts[index].src.indexOf("/sdk/v1.js") !== -1) {
        try { return new URL(scripts[index].src).origin; } catch (error) { /* ignore */ }
      }
    }
    return "";
  }

  var API_BASE = resolveApiBase();

  function FusionWaWidget(options) {
    this.container = document.getElementById(options.containerId);
    if (!this.container) throw new Error('FusionWA.init: containerId "' + options.containerId + '" not found');

    var iframe = document.createElement("iframe");
    iframe.title = "Collegamento WhatsApp con FusionWA";
    iframe.src = API_BASE + "/embed/widget#" + new URLSearchParams({
      apiKey: options.apiKey,
      customerId: options.customerId,
    }).toString();
    iframe.setAttribute("scrolling", "no");
    iframe.style.cssText = "display:block;width:100%;height:56px;border:0;overflow:hidden;background:transparent;";
    this.container.innerHTML = "";
    this.container.appendChild(iframe);
    this.iframe = iframe;

    this.handleMessage = function (event) {
      if (event.origin !== API_BASE || event.source !== iframe.contentWindow) return;
      if (!event.data || event.data.type !== "FUSIONWA_WIDGET") return;
      if (event.data.event === "RESIZE" && Number.isFinite(event.data.height)) {
        iframe.style.height = Math.max(40, Math.min(320, event.data.height)) + "px";
      }
    };
    window.addEventListener("message", this.handleMessage);
  }

  FusionWaWidget.prototype.refresh = function () {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: "FUSIONWA_WIDGET", event: "REFRESH" }, API_BASE);
    }
  };

  FusionWaWidget.prototype.destroy = function () {
    window.removeEventListener("message", this.handleMessage);
    if (this.iframe) this.iframe.remove();
  };

  window.FusionWA = {
    init: function (options) {
      if (!options || !options.apiKey || !options.customerId || !options.containerId) {
        throw new Error("FusionWA.init requires { apiKey, customerId, containerId }");
      }
      return new FusionWaWidget(options);
    },
  };
})(window, document);
