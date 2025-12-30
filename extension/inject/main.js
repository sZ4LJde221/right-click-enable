// inject/main.js
// Main World injection script - disables copy/selection/right-click restrictions
// This script runs in the MAIN world context to override EventTarget.prototype

(function () {
    'use strict';

    // Prevent multiple injections
    if (window.__JS_RIGHTCLICK_ENABLED__) {
        console.log('[JS Right-Click] Already injected, skipping');
        return;
    }

    // Set global flag to prevent re-injection
    window.__JS_RIGHTCLICK_ENABLED__ = true;

    console.log('[JS Right-Click] Injecting into Main World');

    // 1. Force user-select to be enabled via CSS
    const style = document.createElement('style');
    style.innerHTML = '* { user-select: auto !important; -webkit-user-select: auto !important; }';
    document.head.appendChild(style);

    // 2. Define forbidden events that websites use to block interactions
    const forbiddenEvents = ['selectstart', 'copy', 'contextmenu', 'dragstart', 'mousedown'];

    // 3. Capture and stop forbidden events before they reach the page
    forbiddenEvents.forEach(eventType => {
        document.addEventListener(eventType, function (e) {
            e.stopImmediatePropagation();
        }, true); // Use capture phase
    });

    // 4. Override addEventListener to prevent websites from adding new forbidden event listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (!forbiddenEvents.includes(type)) {
            originalAddEventListener.call(this, type, listener, options);
        }
        // Silently ignore forbidden event listener registrations
    };

    console.log('[JS Right-Click] Successfully injected - restrictions disabled');
})();
