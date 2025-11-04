# Test Suite

This directory contains tests for the Solid MCP Server.

## Test Files

### `solid-auth-unit.test.js`
**Unit tests** for the core Solid authentication functions using Node's test runner:
- Tests `authenticateWithSolid()` - Client credentials authentication
- Tests `fetchWebIdProfile()` - WebID profile data retrieval
- Tests session logout and re-authentication flows

Uses `TestSolidMCPServer` class which extends `SolidMCPServer` to expose protected methods for testing.

**Run with:**
```bash
npm run test:unit
```

### `TestSolidMCPServer.js`
**Test helper class** that extends `SolidMCPServer` to expose protected methods:
- Provides public wrapper methods for testing protected functionality
- Maintains proper encapsulation in production code
- Allows comprehensive testing without polluting the main class API

### `test-solid-auth.js`
**Integration test** for the complete MCP server:
- Tests full MCP protocol initialization
- Tests end-to-end `read_file` tool functionality
- Verifies complete authentication flow through MCP interface

**Run with:**
```bash
npm run test:integration
```

## Test Commands

```bash
# Run unit tests (focused on private functions)
npm run test:unit

# Run integration tests (full MCP server test)
npm run test:integration

# Run default test suite (unit tests)
npm test
```

## Prerequisites

Make sure you have configured your `.env.local` file with valid Solid Pod credentials:

```bash
cp env.example .env.local
# Edit .env.local with your credentials from https://login.inrupt.com/registration.html
```

Required environment variables:
- `SOLID_CLIENT_ID` - Your registered application's client ID
- `SOLID_CLIENT_SECRET` - Your registered application's client secret  
- `SOLID_OIDC_ISSUER` - Your OIDC issuer (defaults to https://login.inrupt.com/)

## Test Output

Both tests will show:
- ✅ **PASS** indicators for successful tests
- ❌ **FAIL** indicators for failed tests
- 🆔 **WebID** retrieved from your authenticated session
- 📋 **Profile data** extracted from your Solid Pod

The unit tests focus specifically on the authentication and profile fetching logic, while the integration tests verify the complete MCP server functionality.
