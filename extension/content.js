// content.js
// Lightweight bridge for auto-injection
// Only runs on enabled domains (dynamically registered)

'use strict';

(function () {
    // This script only runs on enabled domains, so directly request injection
    console.log('[Content] Running on enabled domain, requesting auto-injection');

    chrome.runtime.sendMessage(
        { action: 'injectScriptAuto' },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Content] Error requesting injection:', chrome.runtime.lastError);
                return;
            }

            if (response && response.success) {
                console.log('[Content] Auto-injection successful');
            } else {
                console.error('[Content] Auto-injection failed:', response?.error);
            }
        }
    );
})();
