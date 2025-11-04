# Solid MCP Server

A Model Context Protocol (MCP) server for Claude that uses the Solid Protocol to read files.


## App Registration

For the sake of this experiment, the MCP Server uses Client Credentials to authenticate its Solid Requests.

### Requirements

1. Go to https://start.inrupt.com/
2. Sign up: Create an account and a Pod
3. Register an application at https://login.inrupt.com/registration.html
4. Retrieve the client credentials and configure your `.env.local`
https://login.inrupt.com/


## Features

This MCP server provides the following tools:

- **Solid Protocol Integration**:
  - `read_file`: Authenticate with Solid Pod and retrieve your WebID profile information from the session
  - `write_file`: Write content to a file (local file system)
  - `list_directory`: List the contents of a directory (local file system)

- **Mathematical Operations**:
  - `calculate`: Perform mathematical calculations with basic arithmetic operations

## Prerequisites

- Node.js 18.0 or higher
- Claude Desktop application
- Solid Pod account (get one at https://start.inrupt.com/)
- Registered Solid application with client credentials

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd solid-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure your Solid credentials:
```bash
cp env.example .env.local
# Edit .env.local with your Solid Pod credentials
```

4. Build the project:
```bash
npm run build
```

## Configuration

### Claude Desktop Configuration

To use this MCP server with Claude Desktop, you need to add it to your Claude configuration file.

#### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "solid-mcp": {
      "command": "node",
      "args": ["/path/to/solid-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

#### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json` with the same content, adjusting the path as needed.

#### Linux
Edit `~/.config/Claude/claude_desktop_config.json` with the same content, adjusting the path as needed.

**Important**: Replace `/path/to/solid-mcp/dist/index.js` with the actual absolute path to your built server file.

### Example Configuration File

A sample configuration file is provided as `claude_desktop_config.json` in this repository. Update the path in this file to match your installation location.

## Usage

1. Build the server:
```bash
npm run build
```

2. Add the server to your Claude Desktop configuration (see Configuration section above)

3. Restart Claude Desktop

4. The server tools will now be available in Claude Desktop. You can use commands like:
   - "Authenticate with my Solid Pod and show my WebID profile"
   - "List the files in the current directory"
   - "Calculate 15 * 23 + 7"
   - "Write 'Hello World' to a file called greeting.txt"

## Development

### Running in Development Mode

For development, you can run the server directly with TypeScript:

```bash
npm run dev
```

Or watch for changes:

```bash
npm run watch
```

### Available Scripts

- `npm run build`: Build the TypeScript code to JavaScript
- `npm run start`: Run the built server
- `npm run dev`: Run the server in development mode with tsx
- `npm run watch`: Run the server in watch mode (restarts on file changes)
- `npm test`: Run unit tests for Solid authentication functions
- `npm run test:unit`: Run focused unit tests for private functions
- `npm run test:integration`: Run full MCP server integration tests

## Security Considerations

- **Solid Authentication**: Uses client credentials flow for secure authentication with Solid Pods
- **Environment Variables**: Sensitive credentials are stored in `.env.local` (not committed to version control)
- **File Operations**: Local file operations are restricted to the file system accessible by the Node.js process
- **Mathematical Calculations**: Only support basic arithmetic operations (+, -, *, /, parentheses)
- **Path Resolution**: All file paths are resolved to absolute paths to prevent directory traversal attacks

## Troubleshooting

### Server Not Appearing in Claude

1. Ensure the path in your Claude configuration is correct and absolute
2. Verify that the server builds successfully (`npm run build`)
3. Check that Node.js is in your PATH
4. Restart Claude Desktop after making configuration changes

### Permission Errors

If you encounter permission errors when reading/writing files:
1. Ensure Claude Desktop has the necessary file system permissions
2. Check that the files/directories you're trying to access have appropriate permissions
3. On macOS, you may need to grant Claude Desktop "Full Disk Access" in System Preferences > Security & Privacy

## License

MIT License - see LICENSE file for details.
