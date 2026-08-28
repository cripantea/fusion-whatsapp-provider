/*!
 * FusionWA SDK v1
 * Embeddable widget for third-party software to let their end customers
 * activate and connect WhatsApp through the FusionWA platform.
 * Usage: FusionWA.init({ apiKey, customerId, containerId })
 */
(function (window, document) {
  "use strict";

  var API_KEY_HEADER = "X-FusionWA-API-Key";
  var GRAPH_SDK_VERSION = "v21.0";
  var FACEBOOK_SCOPE = "whatsapp_business_management,whatsapp_business_messaging";
  var FACEBOOK_MESSAGE_ORIGIN = "https://www.facebook.com";

  // Deriva l'origin dell'API dal <script src> con cui questo file è stato caricato:
  // evita di dover hardcodare il dominio della piattaforma dentro il widget.
  function resolveApiBase() {
    var current = document.currentScript;
    if (current && current.src) {
      try {
        return new URL(current.src).origin;
      } catch (e) {
        // ignore, fallback below
      }
    }
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("/sdk/v1.js") !== -1) {
        try {
          return new URL(scripts[i].src).origin;
        } catch (e) {
          // ignore
        }
      }
    }
    return "";
  }

  var API_BASE = resolveApiBase();

  var STRINGS = {
    loading: "Caricamento…",
    activate: "Attiva WhatsApp",
    activating: "Attivazione…",
    connect: "Connetti WhatsApp",
    connecting: "Connessione…",
    connected: "WhatsApp Collegato",
    error: "Si è verificato un errore. Riprova.",
  };

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          node.setAttribute(key, attrs[key]);
        }
      }
    }
    if (text) node.textContent = text;
    return node;
  }

  function applyBaseStyles(container) {
    container.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }

  function renderButton(container, label, onClick, disabled) {
    container.innerHTML = "";
    var button = el("button", { type: "button" }, label);
    button.style.cssText =
      "background:#25D366;color:#fff;border:none;border-radius:6px;padding:10px 16px;" +
      "font-size:14px;font-weight:600;cursor:pointer;";
    if (disabled) {
      button.disabled = true;
      button.style.opacity = "0.6";
      button.style.cursor = "default";
    } else {
      button.addEventListener("click", onClick);
    }
    container.appendChild(button);
    return button;
  }

  function renderError(container, message) {
    var p = el("p", null, message);
    p.style.cssText = "color:#dc2626;font-size:13px;margin-top:8px;";
    container.appendChild(p);
  }

  function renderConnected(container, phoneNumber) {
    container.innerHTML = "";
    var wrapper = el("div");
    wrapper.style.cssText =
      "display:flex;align-items:center;gap:8px;color:#16a34a;font-size:14px;font-weight:600;";
    wrapper.appendChild(el("span", null, "✓ " + STRINGS.connected));
    if (phoneNumber) {
      var phone = el("span", null, "(" + phoneNumber + ")");
      phone.style.cssText = "color:#6b7280;font-weight:400;";
      wrapper.appendChild(phone);
    }
    container.appendChild(wrapper);
  }

  function fetchJson(path, options) {
    return fetch(API_BASE + path, options).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  function loadFacebookSdk(callback) {
    if (window.FB) {
      callback();
      return;
    }
    window.fbAsyncInit = callback;
    var script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }

  function FusionWaWidget(options) {
    this.apiKey = options.apiKey;
    this.customerId = options.customerId;
    this.container = document.getElementById(options.containerId);
    if (!this.container) {
      throw new Error("FusionWA.init: containerId \"" + options.containerId + "\" not found");
    }
    applyBaseStyles(this.container);
  }

  FusionWaWidget.prototype.authHeaders = function (extra) {
    var headers = extra || {};
    headers[API_KEY_HEADER] = this.apiKey;
    return headers;
  };

  FusionWaWidget.prototype.refresh = function () {
    var self = this;
    this.container.innerHTML = "";
    this.container.appendChild(el("span", null, STRINGS.loading));

    fetchJson(
      "/api/v1/widget/status?customerId=" + encodeURIComponent(this.customerId),
      { headers: this.authHeaders() }
    )
      .then(function (result) {
        if (!result.ok) {
          renderButton(self.container, STRINGS.error, null, true);
          return;
        }
        self.render(result.data);
      })
      .catch(function () {
        renderButton(self.container, STRINGS.error, null, true);
      });
  };

  FusionWaWidget.prototype.render = function (data) {
    var self = this;

    if (data.status === "CONNECTED") {
      renderConnected(self.container, data.phoneNumber);
      return;
    }

    if (data.status === "SUBSCRIBED_UNCONNECTED") {
      renderButton(self.container, STRINGS.connect, function () {
        self.startEmbeddedSignup(data.facebookAppId, data.facebookConfigId);
      });
      return;
    }

    // NOT_SUBSCRIBED (default)
    renderButton(self.container, STRINGS.activate, function () {
      self.activate();
    });
  };

  FusionWaWidget.prototype.activate = function () {
    var self = this;
    renderButton(self.container, STRINGS.activating, null, true);

    fetchJson("/api/v1/widget/activate", {
      method: "POST",
      headers: self.authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ customerId: self.customerId }),
    })
      .then(function (result) {
        if (!result.ok) {
          renderButton(self.container, STRINGS.activate, function () {
            self.activate();
          });
          renderError(self.container, STRINGS.error);
          return;
        }
        self.refresh();
      })
      .catch(function () {
        renderButton(self.container, STRINGS.activate, function () {
          self.activate();
        });
        renderError(self.container, STRINGS.error);
      });
  };

  FusionWaWidget.prototype.startEmbeddedSignup = function (facebookAppId, facebookConfigId) {
    var self = this;

    if (!facebookAppId || !facebookConfigId) {
      renderError(self.container, STRINGS.error);
      return;
    }

    renderButton(self.container, STRINGS.connecting, null, true);

    var signupData = {};
    function handleMessage(event) {
      if (event.origin !== FACEBOOK_MESSAGE_ORIGIN) return;
      var payload;
      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch (e) {
        return;
      }
      if (payload && payload.type === "WA_EMBEDDED_SIGNUP" && payload.event === "FINISH") {
        signupData.wabaId = payload.data && payload.data.waba_id;
        signupData.phoneNumberId = payload.data && payload.data.phone_number_id;
      }
    }
    window.addEventListener("message", handleMessage);

    loadFacebookSdk(function () {
      window.FB.init({
        appId: facebookAppId,
        autoLogAppEvents: true,
        xfbml: true,
        version: GRAPH_SDK_VERSION,
      });

      window.FB.login(
        function (response) {
          window.removeEventListener("message", handleMessage);

          var code = response.authResponse && response.authResponse.code;
          if (!code) {
            self.render({ status: "SUBSCRIBED_UNCONNECTED", facebookAppId: facebookAppId, facebookConfigId: facebookConfigId });
            return;
          }

          fetchJson("/api/auth/facebook/callback", {
            method: "POST",
            headers: self.authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              code: code,
              wabaId: signupData.wabaId,
              phoneNumberId: signupData.phoneNumberId,
              externalCustomerId: self.customerId,
            }),
          })
            .then(function (result) {
              if (!result.ok) {
                renderError(self.container, STRINGS.error);
                self.render({ status: "SUBSCRIBED_UNCONNECTED", facebookAppId: facebookAppId, facebookConfigId: facebookConfigId });
                return;
              }
              self.refresh();
            })
            .catch(function () {
              renderError(self.container, STRINGS.error);
              self.render({ status: "SUBSCRIBED_UNCONNECTED", facebookAppId: facebookAppId, facebookConfigId: facebookConfigId });
            });
        },
        {
          config_id: facebookConfigId,
          response_type: "code",
          override_default_response_type: true,
          scope: FACEBOOK_SCOPE,
          extras: { sessionInfoVersion: "3" },
        }
      );
    });
  };

  window.FusionWA = {
    init: function (options) {
      if (!options || !options.apiKey || !options.customerId || !options.containerId) {
        throw new Error("FusionWA.init requires { apiKey, customerId, containerId }");
      }
      var widget = new FusionWaWidget(options);
      widget.refresh();
      return widget;
    },
  };
})(window, document);
