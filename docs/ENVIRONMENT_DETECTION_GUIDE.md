# 🌍 Environment Detection Guide

## Overview

This guide explains how to use the centralized environment detection utilities in PelangiManager to differentiate between localhost, Replit, and production environments.

## 🚀 Quick Start

### Import the Utilities

```typescript
import { 
  getClientEnvironment, 
  getServerEnvironment, 
  getEnvironment,
  shouldShowDemoFeatures,
  shouldEnablePWA,
  getEnvironmentConfig 
} from "../../shared/utils";
```

### Basic Usage

```typescript
// Get current environment info
const env = getClientEnvironment();

if (env.isLocalhost) {
  console.log("Running on localhost");
} else if (env.isReplit) {
  console.log("Running on Replit");
} else if (env.isProduction) {
  console.log("Running in production");
}
```

## 🔧 Available Functions

### 1. `getClientEnvironment()`
Use this in React components and client-side code.

**Returns:**
```typescript
{
  isLocalhost: boolean;      // true if localhost/127.0.0.1
  isReplit: boolean;         // true if .replit.dev/.replit.app
  isProduction: boolean;     // true if NODE_ENV=production
  isDevelopment: boolean;    // true if not production
  isDocker: boolean;         // true if localhost + not Replit
  isMemoryStorage: boolean;  // false (client can't determine)
  hostname: string;          // current hostname
  environment: 'localhost' | 'replit' | 'production' | 'development'
}
```

**Example:**
```typescript
function MyComponent() {
  const env = getClientEnvironment();
  
  return (
    <div>
      {env.isLocalhost && <p>🖥️ Development Mode</p>}
      {env.isReplit && <p>☁️ Replit Environment</p>}
      {env.isProduction && <p>🚀 Production Mode</p>}
    </div>
  );
}
```

### 2. `getServerEnvironment()`
Use this in server-side code, API routes, and backend logic.

**Returns:** Same structure as client, but with accurate `isMemoryStorage` detection.

**Example:**
```typescript
// In server/routes/some-route.ts
export function someApiRoute(req: Request, res: Response) {
  const env = getServerEnvironment();
  
  if (env.isMemoryStorage) {
    console.log("Using in-memory storage");
  } else if (env.isReplit) {
    console.log("Using Replit database");
  }
  
  // ... rest of your logic
}
```

### 3. `getEnvironment()`
Universal function that works on both client and server side.

**Example:**
```typescript
// Works everywhere
const env = getEnvironment();
console.log(`Running in ${env.environment} mode`);
```

### 4. `shouldShowDemoFeatures()`
Returns `true` if demo features should be displayed.

**Example:**
```typescript
function LoginForm() {
  return (
    <div>
      {/* Always show login form */}
      <form>...</form>
      
      {/* Only show demo credentials in development */}
      {shouldShowDemoFeatures() && (
        <div className="demo-hint">
          Demo: admin / admin123
        </div>
      )}
    </div>
  );
}
```

### 5. `shouldEnablePWA()`
Returns `true` if PWA features should be enabled (disabled in Replit).

**Example:**
```typescript
// In main.tsx
if (shouldEnablePWA()) {
  registerServiceWorker();
} else {
  console.log("PWA disabled for this environment");
}
```

### 6. `getEnvironmentConfig()`
Returns comprehensive configuration for the current environment.

**Returns:**
```typescript
{
  database: {
    type: 'memory' | 'docker' | 'replit',
    url?: string,
    label: string
  },
  enablePWA: boolean,
  showDemoFeatures: boolean,
  uploadStrategy: 'cloud-storage' | 'local-filesystem',
  enableServiceWorker: boolean,
  environment: string,
  isLocalhost: boolean,
  isReplit: boolean,
  isProduction: boolean
}
```

**Example:**
```typescript
function SystemStatus() {
  const config = getEnvironmentConfig();
  
  return (
    <div>
      <h3>System Configuration</h3>
      <p>Database: {config.database.label}</p>
      <p>PWA: {config.enablePWA ? 'Enabled' : 'Disabled'}</p>
      <p>Uploads: {config.uploadStrategy}</p>
    </div>
  );
}
```

## 📍 Environment Detection Logic

### Client-Side Detection
- **Localhost**: `window.location.hostname === 'localhost' || '127.0.0.1'`
- **Replit**: `.replit.dev` or `.replit.app` domains, or `VITE_REPL_ID` env var
- **Production**: `process.env.NODE_ENV === 'production'`
- **Docker**: Localhost but not Replit

### Server-Side Detection
- **Localhost**: `HOSTNAME` env var or `NODE_ENV === 'development'`
- **Replit**: `REPL_ID`, `REPL_SLUG`, or `PRIVATE_OBJECT_DIR` env vars
- **Docker**: `DATABASE_URL` contains `localhost:5432`
- **Memory Storage**: No `DATABASE_URL` or `PRIVATE_DATABASE_URL`

## 🎯 Common Use Cases

### 1. Conditional UI Rendering
```typescript
function ConditionalFeature() {
  const env = getClientEnvironment();
  
  return (
    <div>
      {env.isLocalhost && <LocalDevTools />}
      {env.isReplit && <ReplitSpecificFeatures />}
      {env.isProduction && <ProductionAnalytics />}
    </div>
  );
}
```

### 2. Environment-Specific Configuration
```typescript
function getApiUrl() {
  const env = getClientEnvironment();
  
  if (env.isLocalhost) {
    return 'http://localhost:5000/api';
  } else if (env.isReplit) {
    return 'https://your-app.replit.dev/api';
  } else {
    return 'https://your-production-domain.com/api';
  }
}
```

### 3. Feature Flags
```typescript
function shouldEnableFeature(featureName: string) {
  const env = getClientEnvironment();
  
  switch (featureName) {
    case 'debugMode':
      return env.isLocalhost || env.isDevelopment;
    case 'analytics':
      return env.isProduction;
    case 'experimental':
      return env.isLocalhost;
    default:
      return false;
  }
}
```

### 4. Database Configuration
```typescript
function getDatabaseConfig() {
  const config = getEnvironmentConfig();
  
  switch (config.database.type) {
    case 'memory':
      return { type: 'memory', label: 'In-Memory Storage' };
    case 'docker':
      return { type: 'postgres', label: 'Local PostgreSQL' };
    case 'replit':
      return { type: 'postgres', label: 'Cloud Database' };
  }
}
```

## 🔒 Security Considerations

### Client-Side Limitations
- Client-side detection can be spoofed by users
- Don't rely on client-side detection for security decisions
- Use server-side detection for sensitive operations

### Server-Side Security
- Server-side detection is more reliable
- Environment variables are secure
- Use for database connections, API keys, etc.

## 🧪 Testing

### Test Different Environments
```typescript
// Mock environment for testing
const originalHostname = window.location.hostname;

// Test localhost
Object.defineProperty(window.location, 'hostname', {
  value: 'localhost',
  writable: true
});
console.log(getClientEnvironment().isLocalhost); // true

// Test Replit
Object.defineProperty(window.location, 'hostname', {
  value: 'my-app.replit.dev',
  writable: true
});
console.log(getClientEnvironment().isReplit); // true

// Restore
Object.defineProperty(window.location, 'hostname', {
  value: originalHostname,
  writable: true
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Environment not detected correctly**
   - Check environment variables are set
   - Verify hostname detection logic
   - Use `console.log(getEnvironment())` to debug

2. **Client/Server mismatch**
   - Client and server may detect different environments
   - Use appropriate function for your context
   - Consider using `getEnvironment()` for universal detection

3. **PWA not working on Replit**
   - PWA is intentionally disabled on Replit
   - Use `shouldEnablePWA()` to check before enabling

### Debug Commands
```typescript
// Add this to debug environment detection
console.log('Environment Debug:', {
  client: getClientEnvironment(),
  server: getServerEnvironment(),
  universal: getEnvironment(),
  config: getEnvironmentConfig()
});
```

## 📚 Examples in Codebase

### Updated Files
- `client/src/main.tsx` - PWA registration
- `client/src/components/login-form.tsx` - Demo features
- `server/lib/databaseConfig.ts` - Database selection
- `shared/utils.ts` - Centralized utilities

### New Components
- `client/src/components/environment-info.tsx` - Environment display

## 🎉 Benefits

1. **Centralized Logic**: All environment detection in one place
2. **Type Safety**: Full TypeScript support with interfaces
3. **Consistent Behavior**: Same detection logic across the app
4. **Easy Maintenance**: Update detection logic in one file
5. **Testing Friendly**: Easy to mock and test different environments
6. **Performance**: No repeated hostname checks or calculations

## 🔮 Future Enhancements

- Add support for more hosting platforms (Vercel, Netlify, etc.)
- Environment-specific feature toggles
- Configuration validation
- Environment migration helpers
- Performance monitoring per environment
