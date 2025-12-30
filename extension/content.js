// content.js
// Lightweight bridge for auto-injection based on domain settings
// Runs in isolated world, only queries background for domain status

'use strict';

(function () {
    // Get current domain
    const domain = window.location.hostname;

    console.log('[Content] Checking domain:', domain);

    // Query background to check if this domain is enabled for auto-injection
    chrome.runtime.sendMessage(
        { action: 'checkDomain', domain: domain },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Content] Error checking domain:', chrome.runtime.lastError);
                return;
            }

            if (response && response.enabled) {
                console.log('[Content] Domain is enabled, requesting auto-injection');
                // Domain is enabled, request injection (background will get tabId from sender)
                chrome.runtime.sendMessage(
                    { action: 'injectScriptAuto' },
                    (injectResponse) => {
                        if (injectResponse && injectResponse.success) {
                            console.log('[Content] Auto-injection successful');
                        } else {
                            console.error('[Content] Auto-injection failed:', injectResponse?.error);
                        }
                    }
                );
            } else {
                console.log('[Content] Domain not enabled for auto-injection');
            }
        }
    );
})();
