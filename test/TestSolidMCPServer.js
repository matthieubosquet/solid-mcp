import { SolidMCPServer } from '../dist/index.js';

/**
 * Test wrapper class that extends SolidMCPServer to expose protected methods for testing
 */
export class TestSolidMCPServer extends SolidMCPServer {
  constructor() {
    super();
  }

  /**
   * Test method to authenticate with Solid Pod
   * Exposes the protected authenticateWithSolid() method
   */
  async testAuthenticateWithSolid() {
    await this.authenticateWithSolid();
    return {
      success: this.session.info.isLoggedIn,
      webId: this.session.info.webId,
      isLoggedIn: this.session.info.isLoggedIn
    };
  }

  /**
   * Test method to fetch WebID profile
   * Exposes the protected fetchWebIdProfile() method
   */
  async testFetchWebIdProfile(webId) {
    const profileInfo = await this.fetchWebIdProfile(webId);
    
    // Parse the formatted string to extract structured data
    const webIdMatch = profileInfo.match(/WebID Retrieved from Session: (https?:\/\/[^\s]+)/);
    const nameMatch = profileInfo.match(/Name: (.+)/);
    const emailMatch = profileInfo.match(/Email: (.+)/);
    const homepageMatch = profileInfo.match(/Homepage: (.+)/);
    const friendsMatch = profileInfo.match(/Friends\/Connections: (\d+)/);
    
    return {
      webId: webIdMatch?.[1] || webId,
      name: nameMatch?.[1] || 'Name not available',
      email: emailMatch?.[1] || 'Email not available', 
      homepage: homepageMatch?.[1] || 'Homepage not available',
      friendsCount: parseInt(friendsMatch?.[1] || '0'),
      sessionInfo: {
        isLoggedIn: this.session.info.isLoggedIn,
        sessionWebId: this.session.info.webId
      }
    };
  }

  /**
   * Test method to logout
   * Exposes the session logout functionality
   */
  async testLogout() {
    await this.session.logout();
  }

  /**
   * Get current session information
   */
  getSessionInfo() {
    return {
      isLoggedIn: this.session.info.isLoggedIn,
      webId: this.session.info.webId
    };
  }

  /**
   * Clean up resources (remove event listeners, etc.)
   */
  testCleanup() {
    this.cleanup();
  }
}
