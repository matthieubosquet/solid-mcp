#!/usr/bin/env node

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { config } from 'dotenv';
import { TestSolidMCPServer } from './TestSolidMCPServer.js';

// Load environment variables
config({ path: '.env.local' });

describe('SolidMCPServer Authentication Tests', () => {
  let server;

  before(async () => {
    // Verify environment variables are set
    assert.ok(process.env.SOLID_CLIENT_ID, 'SOLID_CLIENT_ID must be set in .env.local');
    assert.ok(process.env.SOLID_CLIENT_SECRET, 'SOLID_CLIENT_SECRET must be set in .env.local');
    
    console.log('🔧 Environment check passed');
    console.log(`   Client ID: ${process.env.SOLID_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Client Secret: ${process.env.SOLID_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   OIDC Issuer: ${process.env.SOLID_OIDC_ISSUER || 'https://login.inrupt.com/ (default)'}`);
    
    // Create test server instance that extends SolidMCPServer
    server = new TestSolidMCPServer();
  });

  after(async () => {
    // Clean up - logout if logged in and remove event listeners
    if (server) {
      try {
        await server.testLogout();
        console.log('🔓 Test cleanup: Session logged out');
      } catch (error) {
        console.log('⚠️  Test cleanup warning:', error.message);
      }
      
      // Clean up event listeners to allow process to exit
      server.testCleanup();
      console.log('🧹 Test cleanup: Event listeners removed');
    }
  });

  test('should authenticate using client credentials', async () => {
    console.log('\n📋 Testing authenticateWithSolid() method...');
    
    // Test authentication
    const authResult = await server.testAuthenticateWithSolid();
    
    // Assertions
    assert.strictEqual(authResult.success, true, 'Authentication should succeed');
    assert.strictEqual(authResult.isLoggedIn, true, 'Session should be logged in');
    assert.ok(authResult.webId, 'WebID should be retrieved from session');
    assert.ok(authResult.webId.startsWith('https://'), 'WebID should be a valid HTTPS URL');
    
    console.log('✅ Authentication successful');
    console.log(`   WebID: ${authResult.webId}`);
    console.log(`   Logged in: ${authResult.isLoggedIn}`);
    
    // Verify session info is consistent
    const sessionInfo = server.getSessionInfo();
    assert.strictEqual(sessionInfo.isLoggedIn, true, 'Session info should show logged in');
    assert.strictEqual(sessionInfo.webId, authResult.webId, 'Session WebID should match auth result');
  });

  test('should fetch WebID profile information', async () => {
    console.log('\n📋 Testing fetchWebIdProfile() method...');
    
    // Get the WebID from the session (should be authenticated from previous test)
    const sessionInfo = server.getSessionInfo();
    assert.ok(sessionInfo.webId, 'Session should have a WebID (authentication required)');
    
    console.log(`🔍 Fetching profile for WebID: ${sessionInfo.webId}`);
    
    // Test profile fetching
    const profileData = await server.testFetchWebIdProfile(sessionInfo.webId);
    
    // Assertions
    assert.ok(profileData, 'Profile data should be returned');
    assert.strictEqual(profileData.webId, sessionInfo.webId, 'Profile WebID should match session WebID');
    assert.ok(typeof profileData.name === 'string', 'Name should be a string');
    assert.ok(typeof profileData.email === 'string', 'Email should be a string');
    assert.ok(typeof profileData.homepage === 'string', 'Homepage should be a string');
    assert.ok(typeof profileData.friendsCount === 'number', 'Friends count should be a number');
    assert.ok(profileData.friendsCount >= 0, 'Friends count should be non-negative');
    
    // Session info assertions
    assert.strictEqual(profileData.sessionInfo.isLoggedIn, true, 'Session should still be logged in');
    assert.strictEqual(profileData.sessionInfo.sessionWebId, sessionInfo.webId, 'Session WebID should be consistent');
    
    console.log('✅ Profile fetching successful');
    console.log(`   Name: ${profileData.name}`);
    console.log(`   Email: ${profileData.email}`);
    console.log(`   Homepage: ${profileData.homepage}`);
    console.log(`   Friends: ${profileData.friendsCount}`);
    console.log(`   Session WebID matches: ${profileData.sessionInfo.sessionWebId === profileData.webId}`);
  });

  test('should handle session logout', async () => {
    console.log('\n📋 Testing session logout...');
    
    // Verify we're logged in before logout
    let sessionInfo = server.getSessionInfo();
    assert.strictEqual(sessionInfo.isLoggedIn, true, 'Should be logged in before logout');
    
    // Test logout
    await server.testLogout();
    
    // Verify logout - Note: WebID may persist after logout in some Solid implementations
    sessionInfo = server.getSessionInfo();
    assert.strictEqual(sessionInfo.isLoggedIn, false, 'Should be logged out after logout');
    
    console.log('✅ Logout successful');
    console.log(`   Logged in: ${sessionInfo.isLoggedIn}`);
    console.log(`   WebID: ${sessionInfo.webId || 'None'}`);
    console.log(`   Note: WebID persists after logout (this is normal for Inrupt Solid client)`);
  });

  test('should re-authenticate after logout', async () => {
    console.log('\n📋 Testing re-authentication after logout...');
    
    // Verify we're logged out
    let sessionInfo = server.getSessionInfo();
    assert.strictEqual(sessionInfo.isLoggedIn, false, 'Should be logged out initially');
    
    // Re-authenticate
    const authResult = await server.testAuthenticateWithSolid();
    
    // Verify re-authentication
    assert.strictEqual(authResult.success, true, 'Re-authentication should succeed');
    assert.strictEqual(authResult.isLoggedIn, true, 'Session should be logged in again');
    assert.ok(authResult.webId, 'WebID should be retrieved again');
    
    console.log('✅ Re-authentication successful');
    console.log(`   WebID: ${authResult.webId}`);
    
    // Verify session consistency
    sessionInfo = server.getSessionInfo();
    assert.strictEqual(sessionInfo.isLoggedIn, true, 'Session should show logged in');
    assert.strictEqual(sessionInfo.webId, authResult.webId, 'Session WebID should match');
  });
});
