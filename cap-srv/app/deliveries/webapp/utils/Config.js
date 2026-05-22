// app/deliveries/webapp/utils/Config.js
sap.ui.define([], function () {
    "use strict";
    return {
        getApiKey: function () {
            return window.GOOGLE_MAPS_API_KEY || "";
        }
    };
});
