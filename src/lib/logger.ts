export const logger = {
  error: (message: string, context?: any) => {
    // Log safe message to dev console
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEV ERROR] ${message}`, context || '');
    }
    // Remote logging to backend table/sheet
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'error', message, context: String(context) }),
      }).catch(() => {}); // silent fail
    } catch (e) {}
  },
  info: (message: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[DEV] ${message}`, context || '');
    }
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'info', message, context: String(context) }),
      }).catch(() => {});
    } catch (e) {}
  }
};

