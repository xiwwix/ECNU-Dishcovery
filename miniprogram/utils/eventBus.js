// utils/eventBus.js（兼容写法）
function EventBus() {
  this.events = {};
}

EventBus.prototype.on = function(event, listener) {
  if (!this.events[event]) this.events[event] = [];
  this.events[event].push(listener);
};

EventBus.prototype.emit = function(event) {
  var args = Array.prototype.slice.call(arguments, 1);
  var listeners = this.events[event] || [];
  listeners.slice().forEach(function(listener) {
    listener.apply(null, args);
  });
};

EventBus.prototype.off = function(event, listener) {
  var listeners = this.events[event];
  if (listeners) {
    var index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
};

const eventBus = new EventBus();
module.exports = eventBus;
