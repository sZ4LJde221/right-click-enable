(function() {
    const style = document.createElement("style");
    style.innerHTML = "* { user-select: auto !important; -webkit-user-select: auto !important; }";
    document.head.appendChild(style);

    const forbiddenEvents = ["selectstart", "copy", "contextmenu", "dragstart", "mousedown"];

    forbiddenEvents.forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            e.stopImmediatePropagation();
        }, true); 
    });

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (!forbiddenEvents.includes(type)) {
            originalAddEventListener.call(this, type, listener, options);
        }
    };
})();