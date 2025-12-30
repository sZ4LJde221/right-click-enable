// popup.js
// Popup UI logic for domain management

'use strict';

let currentDomain = '';
let currentTabId = null;
let isDomainEnabled = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
        showStatus('タブ情報を取得できませんでした', 'error');
        return;
    }

    currentTabId = tab.id;

    // Extract domain from URL
    try {
        const url = new URL(tab.url);
        currentDomain = url.hostname;
        document.getElementById('currentDomain').textContent = currentDomain;
    } catch (error) {
        document.getElementById('currentDomain').textContent = '無効なURL';
        document.getElementById('domainStatus').textContent = 'エラー';
        disableButtons();
        return;
    }

    // Check if domain is enabled
    chrome.runtime.sendMessage(
        { action: 'checkDomain', domain: currentDomain },
        (response) => {
            isDomainEnabled = response && response.enabled;
            updateUI();
        }
    );
});

// Update UI based on domain status
function updateUI() {
    const statusEl = document.getElementById('domainStatus');
    const enableBtn = document.getElementById('enableDomain');
    const disableBtn = document.getElementById('disableDomain');

    if (isDomainEnabled) {
        statusEl.textContent = '✅ 有効';
        statusEl.style.color = '#28a745';
        enableBtn.style.display = 'none';
        disableBtn.style.display = 'block';
    } else {
        statusEl.textContent = '❌ 無効';
        statusEl.style.color = '#dc3545';
        enableBtn.style.display = 'block';
        disableBtn.style.display = 'none';
    }
}

// Enable for domain (auto-inject on future visits)
document.getElementById('enableDomain').addEventListener('click', async () => {
    if (!currentDomain) return;

    try {
        // Enable the domain
        const enableResponse = await chrome.runtime.sendMessage({
            action: 'enableDomain',
            domain: currentDomain
        });

        if (!enableResponse || !enableResponse.success) {
            showStatus('ドメイン登録に失敗しました', 'error');
            return;
        }

        // Inject into current tab
        const injectResponse = await chrome.runtime.sendMessage({
            action: 'injectScript',
            tabId: currentTabId
        });

        if (injectResponse && injectResponse.success) {
            isDomainEnabled = true;
            updateUI();
            showStatus('有効化しました！', 'success');
        } else {
            showStatus('注入に失敗しました', 'error');
        }
    } catch (error) {
        showStatus('エラー: ' + error.message, 'error');
    }
});

// Disable for domain
document.getElementById('disableDomain').addEventListener('click', async () => {
    if (!currentDomain) return;

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'disableDomain',
            domain: currentDomain
        });

        if (response && response.success) {
            isDomainEnabled = false;
            updateUI();
            showStatus('無効化しました', 'success');
        } else {
            showStatus('無効化に失敗しました', 'error');
        }
    } catch (error) {
        showStatus('エラー: ' + error.message, 'error');
    }
});

// Close popup
document.getElementById('close').addEventListener('click', () => {
    window.close();
});

// Helper function to show status messages
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
}

// Disable buttons when domain is invalid
function disableButtons() {
    document.getElementById('enableDomain').disabled = true;
    document.getElementById('disableDomain').disabled = true;
}
