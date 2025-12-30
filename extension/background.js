// background.js
// Background service worker for managing injection state and domain settings

'use strict';

// Track which tabs have been injected to prevent re-injection
const injectedTabs = new Set();

// Initialize storage on install and register existing enabled domains
chrome.runtime.onInstalled.addListener(async () => {
    const result = await chrome.storage.sync.get(['enabledDomains']);
    if (!result.enabledDomains) {
        await chrome.storage.sync.set({ enabledDomains: {} });
    } else {
        // Register content scripts for all enabled domains
        for (const [domain, enabled] of Object.entries(result.enabledDomains)) {
            if (enabled) {
                await registerContentScriptForDomain(domain);
            }
        }
    }
});

// Re-register content scripts when service worker starts
chrome.runtime.onStartup.addListener(async () => {
    const result = await chrome.storage.sync.get(['enabledDomains']);
    if (result.enabledDomains) {
        // Clear existing registrations to avoid duplicates
        try {
            const scripts = await chrome.scripting.getRegisteredContentScripts();
            const ids = scripts.map(s => s.id);
            if (ids.length > 0) {
                await chrome.scripting.unregisterContentScripts({ ids });
            }
        } catch (error) {
            console.log('[Background] No existing scripts to clear');
        }

        // Re-register all enabled domains
        for (const [domain, enabled] of Object.entries(result.enabledDomains)) {
            if (enabled) {
                await registerContentScriptForDomain(domain);
            }
        }
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'injectScript') {
        // Manual injection from popup (tabId provided)
        injectMainScript(message.tabId)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }

    if (message.action === 'injectScriptAuto') {
        // Auto-injection from content script (get tabId from sender)
        const tabId = sender.tab?.id;
        if (!tabId) {
            sendResponse({ success: false, error: 'No tab ID available' });
            return false;
        }
        injectMainScript(tabId)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.action === 'enableDomain') {
        enableDomain(message.domain)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.action === 'disableDomain') {
        disableDomain(message.domain)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.action === 'isInjected') {
        sendResponse({ injected: injectedTabs.has(message.tabId) });
        return false;
    }
});

// Main injection function using chrome.scripting API
async function injectMainScript(tabId) {
    // Check if already injected
    if (injectedTabs.has(tabId)) {
        console.log(`[Background] Tab ${tabId} already injected, skipping`);
        return;
    }

    try {
        // Inject into MAIN world (critical requirement)
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['inject/main.js'],
            world: 'MAIN', // Execute in page context, not isolated world
            injectImmediately: true
        });

        // Mark tab as injected
        injectedTabs.add(tabId);
        console.log(`[Background] Successfully injected into tab ${tabId}`);
    } catch (error) {
        console.error(`[Background] Injection failed for tab ${tabId}:`, error);
        throw error;
    }
}

// Register content script for a specific domain
async function registerContentScriptForDomain(domain) {
    const scriptId = `cs-${domain}`;
    try {
        await chrome.scripting.registerContentScripts([{
            id: scriptId,
            matches: [`*://${domain}/*`],
            js: ['content.js'],
            runAt: 'document_start',
            world: 'ISOLATED'
        }]);
        console.log(`[Background] Registered content script for ${domain}`);
    } catch (error) {
        // Ignore error if script already exists
        if (!error.message.includes('already exists')) {
            console.error(`[Background] Failed to register for ${domain}:`, error);
        }
    }
}

// Unregister content script for a specific domain
async function unregisterContentScriptForDomain(domain) {
    const scriptId = `cs-${domain}`;
    try {
        await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
        console.log(`[Background] Unregistered content script for ${domain}`);
    } catch (error) {
        console.error(`[Background] Failed to unregister for ${domain}:`, error);
    }
}

// Enable domain for auto-injection
async function enableDomain(domain) {
    return new Promise(async (resolve, reject) => {
        chrome.storage.sync.get(['enabledDomains'], async (result) => {
            const enabledDomains = result.enabledDomains || {};
            enabledDomains[domain] = true;

            chrome.storage.sync.set({ enabledDomains }, async () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    console.log(`[Background] Enabled domain: ${domain}`);
                    // Register content script for this domain
                    await registerContentScriptForDomain(domain);
                    resolve();
                }
            });
        });
    });
}

// Disable domain
async function disableDomain(domain) {
    return new Promise(async (resolve, reject) => {
        chrome.storage.sync.get(['enabledDomains'], async (result) => {
            const enabledDomains = result.enabledDomains || {};
            delete enabledDomains[domain];

            chrome.storage.sync.set({ enabledDomains }, async () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    console.log(`[Background] Disabled domain: ${domain}`);
                    // Unregister content script for this domain
                    await unregisterContentScriptForDomain(domain);
                    resolve();
                }
            });
        });
    });
}

// Clean up injected tabs when they are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
});

// Clean up injected tabs when they navigate away
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        injectedTabs.delete(tabId);
    }
});
