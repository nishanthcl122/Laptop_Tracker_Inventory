// Toast notification dispatcher for non-intrusive enterprise alerts
class ToastManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  show(message, type = 'info', duration = 3500) {
    const id = Math.random().toString(36).substring(2, 9);
    this.listeners.forEach((listener) => listener({ id, message, type, duration }));
  }

  warn(message, duration = 3500) {
    this.show(message, 'warning', duration);
  }

  error(message, duration = 4000) {
    this.show(message, 'error', duration);
  }

  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }
}

export const toast = new ToastManager();
