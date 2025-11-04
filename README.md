# Solid MCP Server

A Model Context Protocol (MCP) server for Claude that uses the Solid Protocol to read files.


## Authenticating against Solid

### App Registration

One tool uses simple client credentials. This is useful for a developer interacting with their own Pod. This method is not part of the Solid standard.

#### Requirements

1. Go to https://start.inrupt.com/
2. Sign up: Create an account and a Pod
3. Register an application at https://login.inrupt.com/registration.html
4. Retrieve the client credentials and configure your `.env.local`
https://login.inrupt.com/

### Solid OIDC


