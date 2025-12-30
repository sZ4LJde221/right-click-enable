// options.js
// Options page logic for domain management

'use strict';

// Load and display domains on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDomains();
});

// Load domains from storage and render
function loadDomains() {
    chrome.storage.sync.get(['enabledDomains'], (result) => {
        const enabledDomains = result.enabledDomains || {};
        renderDomains(enabledDomains);
    });
}

// Render domain list
function renderDomains(enabledDomains) {
    const domainList = document.getElementById('domainList');
    const domains = Object.keys(enabledDomains);

    if (domains.length === 0) {
        domainList.innerHTML = '<div class="empty-state">登録されているドメインはありません</div>';
        return;
    }

    domainList.innerHTML = '';

    domains.forEach(domain => {
        const isEnabled = enabledDomains[domain];
        const domainItem = createDomainItem(domain, isEnabled);
        domainList.appendChild(domainItem);
    });
}

// Create domain item element
function createDomainItem(domain, isEnabled) {
    const item = document.createElement('div');
    item.className = 'domain-item';

    // Domain name
    const nameEl = document.createElement('div');
    nameEl.className = 'domain-name';
    nameEl.textContent = domain;

    // Controls container
    const controls = document.createElement('div');
    controls.className = 'domain-controls';

    // Toggle switch
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = isEnabled;
    toggleInput.addEventListener('change', () => toggleDomain(domain, toggleInput.checked));

    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'toggle-slider';

    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSlider);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deleteDomain(domain));

    controls.appendChild(toggleLabel);
    controls.appendChild(deleteBtn);

    item.appendChild(nameEl);
    item.appendChild(controls);

    return item;
}

// Toggle domain enabled/disabled
function toggleDomain(domain, enabled) {
    chrome.storage.sync.get(['enabledDomains'], (result) => {
        const enabledDomains = result.enabledDomains || {};
        enabledDomains[domain] = enabled;

        chrome.storage.sync.set({ enabledDomains }, () => {
            if (chrome.runtime.lastError) {
                showStatus('更新に失敗しました', 'error');
            } else {
                showStatus(`${domain} を${enabled ? '有効' : '無効'}にしました`, 'success');
            }
        });
    });
}

// Delete domain from list
function deleteDomain(domain) {
    if (!confirm(`${domain} を削除しますか？`)) {
        return;
    }

    chrome.storage.sync.get(['enabledDomains'], (result) => {
        const enabledDomains = result.enabledDomains || {};
        delete enabledDomains[domain];

        chrome.storage.sync.set({ enabledDomains }, () => {
            if (chrome.runtime.lastError) {
                showStatus('削除に失敗しました', 'error');
            } else {
                showStatus(`${domain} を削除しました`, 'success');
                loadDomains(); // Reload list
            }
        });
    });
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}
