// utils/eventBus.js
class EventBus {
  constructor() {
    this.events = {};
  }

  // 监听事件
  on(event, listener) {
    (this.events[event] || (this.events[event] = [])).push(listener);
  }

  // 触发事件
  emit(event, ...args) {
    (this.events[event] || []).slice().forEach(listener => listener(...args));
  }

  // 移除事件监听
  off(event, listener) {
    if (this.events[event]) {
      const index = this.events[event].indexOf(listener);
      if (index > -1) {
        this.events[event].splice(index, 1);
      }
    }
  }
}

const eventBus = new EventBus();
export default eventBus;
