# Test Architecture

## Overview

This document explains the testing architecture for the Solid MCP Server, specifically how we test protected methods while maintaining proper encapsulation.

## Class Hierarchy

```
SolidMCPServer (src/index.ts)
    ↑ extends
TestSolidMCPServer (test/TestSolidMCPServer.js)
    ↑ used by
solid-auth-unit.test.js (test/solid-auth-unit.test.js)
```

## SolidMCPServer Class

**Location:** `src/index.ts`

The main MCP server class with the following access levels:

### Protected Methods (accessible to subclasses)
- `authenticateWithSolid()` - Handles Solid Pod authentication using client credentials
- `fetchWebIdProfile(webId)` - Fetches and formats WebID profile data
- `setupToolHandlers()` - Sets up MCP protocol tool handlers
- `setupErrorHandling()` - Configures error handling and shutdown hooks

### Protected Properties
- `session: Session` - The Inrupt Solid authentication session

### Private Properties
- `server: Server` - The MCP protocol server instance

### Public Methods
- `run()` - Starts the MCP server on stdio

## TestSolidMCPServer Class

**Location:** `test/TestSolidMCPServer.js`

A test wrapper that extends `SolidMCPServer` to expose protected methods for testing purposes.

### Purpose
- Provides public test methods that call protected methods
- Maintains clean separation between production and test code
- Allows comprehensive unit testing without exposing internals in production

### Public Test Methods
```javascript
async testAuthenticateWithSolid()
  → Calls protected authenticateWithSolid()
  → Returns { success, webId, isLoggedIn }

async testFetchWebIdProfile(webId)
  → Calls protected fetchWebIdProfile(webId)
  → Parses and returns structured profile data

async testLogout()
  → Calls session.logout()

getSessionInfo()
  → Returns { isLoggedIn, webId }
```

## Unit Tests

**Location:** `test/solid-auth-unit.test.js`

Uses Node.js built-in test runner (`node:test`) to test the Solid authentication functionality.

### Test Structure
```javascript
describe('SolidMCPServer Authentication Tests', () => {
  let server; // TestSolidMCPServer instance
  
  before() { /* setup */ }
  after() { /* cleanup */ }
  
  test('should authenticate using client credentials')
  test('should fetch WebID profile information')
  test('should handle session logout')
  test('should re-authenticate after logout')
})
```

### Test Coverage
- ✅ Client credentials authentication
- ✅ WebID retrieval from authenticated session
- ✅ Profile data fetching and parsing
- ✅ Session state management
- ✅ Logout functionality
- ✅ Re-authentication capability

## Benefits of This Architecture

### 1. **Proper Encapsulation**
- Production code doesn't expose test-only methods
- Protected methods are only accessible to subclasses
- Clean API surface for the main `SolidMCPServer` class

### 2. **Testability**
- All core authentication logic is thoroughly testable
- Test class provides structured access to protected methods
- Easy to add new test methods without modifying production code

### 3. **Maintainability**
- Clear separation of concerns
- Test helper code isolated in `test/` directory
- Changes to test interface don't affect production code

### 4. **Type Safety**
- TypeScript in production code ensures type correctness
- Test helper provides consistent interface
- Structured return types for test validation

## Running Tests

```bash
# Run unit tests with Node's test runner
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests (default: unit tests)
npm test
```

## Example Usage

```javascript
import { TestSolidMCPServer } from './TestSolidMCPServer.js';

// Create test instance
const server = new TestSolidMCPServer();

// Test authentication
const authResult = await server.testAuthenticateWithSolid();
console.log(authResult.webId); // https://id.inrupt.com/username

// Test profile fetching
const profile = await server.testFetchWebIdProfile(authResult.webId);
console.log(profile.name); // User's name

// Clean up
await server.testLogout();
```

## Design Principles

1. **Don't expose test methods in production** - Use inheritance to extend functionality for testing
2. **Use Node's built-in test runner** - No external test framework dependencies
3. **Test protected methods, not private** - Protected allows subclass access for testing
4. **Keep test helpers in test directory** - Clear separation from production code
5. **Use assertions for validation** - Clear pass/fail criteria with meaningful messages
