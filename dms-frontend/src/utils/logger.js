// Logger utility that respects REACT_APP_PRODUCTION_LOGS environment variable
const isProductionLogsEnabled = process.env.REACT_APP_PRODUCTION_LOGS === 'true';

class Logger {
  static log(...args) {
    if (!isProductionLogsEnabled) {
      console.log(...args);
    }
  }

  static error(...args) {
    if (!isProductionLogsEnabled) {
      console.error(...args);
    }
  }

  static warn(...args) {
    if (!isProductionLogsEnabled) {
      console.warn(...args);
    }
  }

  static info(...args) {
    if (!isProductionLogsEnabled) {
      console.info(...args);
    }
  }

  static debug(...args) {
    if (!isProductionLogsEnabled) {
      console.debug(...args);
    }
  }

  static group(...args) {
    if (!isProductionLogsEnabled) {
      console.group(...args);
    }
  }

  static groupEnd() {
    if (!isProductionLogsEnabled) {
      console.groupEnd();
    }
  }

  static table(...args) {
    if (!isProductionLogsEnabled) {
      console.table(...args);
    }
  }

  static time(label) {
    if (!isProductionLogsEnabled) {
      console.time(label);
    }
  }

  static timeEnd(label) {
    if (!isProductionLogsEnabled) {
      console.timeEnd(label);
    }
  }

  // Method to check if logging is enabled
  static isEnabled() {
    return !isProductionLogsEnabled;
  }

  // Method to get the current environment setting
  static getEnvironmentSetting() {
    return {
      REACT_APP_PRODUCTION_LOGS: process.env.REACT_APP_PRODUCTION_LOGS,
      isProductionLogsEnabled,
      logsDisabled: isProductionLogsEnabled
    };
  }
}

export default Logger; 