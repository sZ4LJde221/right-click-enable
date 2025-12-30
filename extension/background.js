// background.js
// Background service worker for managing injection state and domain settings

'use strict';

// Track which tabs have been injected to prevent re-injection
const injectedTabs = new Set();

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['enabledDomains'], (result) => {
        if (!result.enabledDomains) {
            chrome.storage.sync.set({ enabledDomains: {} });
        }
    });
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

    if (message.action === 'checkDomain') {
        checkDomainEnabled(message.domain)
            .then((enabled) => sendResponse({ enabled }))
            .catch(() => sendResponse({ enabled: false }));
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

// Check if domain is enabled for auto-injection
async function checkDomainEnabled(domain) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['enabledDomains'], (result) => {
            const enabledDomains = result.enabledDomains || {};
            resolve(enabledDomains[domain] === true);
        });
    });
}

// Enable domain for auto-injection
async function enableDomain(domain) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['enabledDomains'], (result) => {
            const enabledDomains = result.enabledDomains || {};
            enabledDomains[domain] = true;

            chrome.storage.sync.set({ enabledDomains }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    console.log(`[Background] Enabled domain: ${domain}`);
                    resolve();
                }
            });
        });
    });
}

// Disable domain
async function disableDomain(domain) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['enabledDomains'], (result) => {
            const enabledDomains = result.enabledDomains || {};
            delete enabledDomains[domain];

            chrome.storage.sync.set({ enabledDomains }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    console.log(`[Background] Disabled domain: ${domain}`);
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
