sap.ui.define([], function () {
    "use strict";

    /**
     * Configuration module for Google Maps API
     * Loads API key from environment or falls back to configuration
     */
    return {
        getApiKey: function() {
            return window.GOOGLE_MAPS_API_KEY || "";
        }
    };
});
