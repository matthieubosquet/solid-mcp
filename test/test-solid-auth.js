#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Solid MCP Server Authentication...\n');

const serverPath = join(__dirname, 'dist', 'index.js');

// Test the read_file tool which should authenticate and fetch WebID
async function testSolidAuthentication() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env } // Inherit environment variables including .env.local
    });

    let stdout = '';
    let stderr = '';
    let testCompleted = false;

    // Collect server output
    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    server.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('📋 Server log:', data.toString().trim());
    });

    server.on('error', (error) => {
      if (!testCompleted) {
        testCompleted = true;
        reject(new Error(`Server failed to start: ${error.message}`));
      }
    });

    // Wait for server to start, then send test requests
    setTimeout(async () => {
      try {
        console.log('🚀 Server started, sending test requests...\n');

        // 1. Initialize the MCP connection
        const initRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          }
        };

        server.stdin.write(JSON.stringify(initRequest) + '\n');
        console.log('📤 Sent initialization request');

        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Test the read_file tool (Solid authentication)
        const readFileRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'read_file',
            arguments: {} // No arguments needed - WebID comes from session
          }
        };

        server.stdin.write(JSON.stringify(readFileRequest) + '\n');
        console.log('📤 Sent read_file request (Solid authentication test)');

        // Wait for response and then analyze results
        setTimeout(() => {
          if (!testCompleted) {
            testCompleted = true;
            server.kill();
            
            console.log('\n📊 Test Results:');
            console.log('================');
            
            // Analyze the responses
            const responses = stdout.split('\n').filter(line => line.trim());
            let initSuccess = false;
            let authSuccess = false;
            let webIdFound = false;
            let profileDataFound = false;

            responses.forEach((response, index) => {
              try {
                const parsed = JSON.parse(response);
                console.log(`\n📋 Response ${index + 1}:`, JSON.stringify(parsed, null, 2));
                
                if (parsed.id === 1 && parsed.result) {
                  initSuccess = true;
                  console.log('✅ Initialization successful');
                }
                
                if (parsed.id === 2) {
                  if (parsed.result && parsed.result.content) {
                    const content = parsed.result.content[0]?.text || '';
                    
                    if (content.includes('Successfully authenticated with Solid Pod')) {
                      authSuccess = true;
                      console.log('✅ Solid authentication successful');
                    }
                    
                    if (content.includes('WebID Retrieved from Session:')) {
                      webIdFound = true;
                      console.log('✅ WebID retrieved from session');
                      
                      // Extract and display the WebID
                      const webIdMatch = content.match(/WebID Retrieved from Session: (https?:\/\/[^\s]+)/);
                      if (webIdMatch) {
                        console.log(`🆔 WebID: ${webIdMatch[1]}`);
                      }
                    }
                    
                    if (content.includes('Profile Information:') && content.includes('Name:')) {
                      profileDataFound = true;
                      console.log('✅ Profile data retrieved');
                    }
                  } else if (parsed.error) {
                    console.log('❌ Error in read_file:', parsed.error.message);
                  }
                }
              } catch (e) {
                // Not JSON, might be server log
              }
            });

            // Final test summary
            console.log('\n🎯 Test Summary:');
            console.log('================');
            console.log(`MCP Initialization: ${initSuccess ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`Solid Authentication: ${authSuccess ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`WebID Retrieval: ${webIdFound ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`Profile Data: ${profileDataFound ? '✅ PASS' : '❌ FAIL'}`);

            const allTestsPassed = initSuccess && authSuccess && webIdFound && profileDataFound;
            
            if (allTestsPassed) {
              console.log('\n🎉 ALL TESTS PASSED! Your Solid MCP server is working correctly.');
              resolve(true);
            } else {
              console.log('\n⚠️  Some tests failed. Check your .env.local configuration.');
              console.log('\nRequired environment variables:');
              console.log('- SOLID_CLIENT_ID');
              console.log('- SOLID_CLIENT_SECRET');
              console.log('- SOLID_OIDC_ISSUER (optional, defaults to https://login.inrupt.com/)');
              resolve(false);
            }
          }
        }, 5000); // Wait 5 seconds for all responses

      } catch (error) {
        if (!testCompleted) {
          testCompleted = true;
          server.kill();
          reject(error);
        }
      }
    }, 1000); // Wait 1 second for server to start
  });
}

// Run the test
try {
  const success = await testSolidAuthentication();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
