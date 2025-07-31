# Frontend Logging System

This project includes a centralized logging system that respects the `REACT_APP_PRODUCTION_LOGS` environment variable.

## Configuration

### Environment Variable

Set the `REACT_APP_PRODUCTION_LOGS` variable in your `.env` file:

```env
# Disable console logs in production (recommended for production)
REACT_APP_PRODUCTION_LOGS=true

# Enable console logs (useful for development)
REACT_APP_PRODUCTION_LOGS=false
```

## Usage

### Import the Logger

```javascript
import Logger from './utils/logger';
```

### Available Methods

The Logger class provides the following methods that mirror the console API:

```javascript
// Basic logging
Logger.log('This is a log message');
Logger.error('This is an error message');
Logger.warn('This is a warning message');
Logger.info('This is an info message');
Logger.debug('This is a debug message');

// Grouping
Logger.group('Group Label');
Logger.log('Message inside group');
Logger.groupEnd();

// Tables
Logger.table(data);

// Timing
Logger.time('operation');
// ... some operation
Logger.timeEnd('operation');
```

### Utility Methods

```javascript
// Check if logging is enabled
if (Logger.isEnabled()) {
  // Do something only when logging is enabled
}

// Get current environment settings
const settings = Logger.getEnvironmentSetting();
console.log(settings);
// Output: {
//   REACT_APP_PRODUCTION_LOGS: 'true',
//   isProductionLogsEnabled: true,
//   logsDisabled: true
// }
```

## Behavior

- **When `REACT_APP_PRODUCTION_LOGS=true`**: All console logs are suppressed
- **When `REACT_APP_PRODUCTION_LOGS=false`**: Console logs are displayed normally
- **When `REACT_APP_PRODUCTION_LOGS` is not set**: Console logs are displayed (default behavior)

## Migration Guide

### Replace console.log with Logger.log

```javascript
// Before
console.log('User logged in:', user);

// After
import Logger from './utils/logger';
Logger.log('User logged in:', user);
```

### Replace console.error with Logger.error

```javascript
// Before
console.error('API Error:', error);

// After
import Logger from './utils/logger';
Logger.error('API Error:', error);
```

## Best Practices

1. **Use Logger instead of console directly** in all components
2. **Set `REACT_APP_PRODUCTION_LOGS=true`** in production environments
3. **Set `REACT_APP_PRODUCTION_LOGS=false`** during development for debugging
4. **Use appropriate log levels** (log, error, warn, info, debug)
5. **Include context** in log messages for better debugging

## Example Implementation

```javascript
import React, { useState, useEffect } from 'react';
import Logger from './utils/logger';

const MyComponent = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    Logger.info('MyComponent mounted');
    
    fetchData()
      .then(result => {
        Logger.log('Data fetched successfully:', result);
        setData(result);
      })
      .catch(error => {
        Logger.error('Failed to fetch data:', error);
      });
  }, []);

  return <div>My Component</div>;
};
``` 