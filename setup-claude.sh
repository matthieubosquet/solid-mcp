#!/bin/bash

# Setup script for Solid MCP Server with Claude Desktop

set -e

echo "🚀 Setting up Solid MCP Server for Claude Desktop..."

# Build the project
echo "📦 Building the project..."
npm run build

# Get the absolute path to the built server
SERVER_PATH="$(pwd)/dist/index.js"

# Determine the Claude config directory based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash/Cygwin)
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    exit 1
fi

CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

echo "📁 Claude config directory: $CLAUDE_CONFIG_DIR"
echo "📄 Claude config file: $CLAUDE_CONFIG_FILE"

# Create Claude config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Create or update the Claude configuration
if [[ -f "$CLAUDE_CONFIG_FILE" ]]; then
    echo "⚠️  Claude configuration file already exists."
    echo "📋 Current configuration:"
    cat "$CLAUDE_CONFIG_FILE"
    echo ""
    read -p "Do you want to backup and replace it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        echo "💾 Backup created: $CLAUDE_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    else
        echo "❌ Setup cancelled. You can manually add the following to your Claude configuration:"
        echo ""
        cat << EOF
{
  "mcpServers": {
    "solid-mcp": {
      "command": "node",
      "args": ["$SERVER_PATH"],
      "env": {}
    }
  }
}
EOF
        exit 0
    fi
fi

# Write the configuration
cat << EOF > "$CLAUDE_CONFIG_FILE"
{
  "mcpServers": {
    "solid-mcp": {
      "command": "node",
      "args": ["$SERVER_PATH"],
      "env": {}
    }
  }
}
EOF

echo "✅ Claude Desktop configuration updated!"
echo ""
echo "🔄 Please restart Claude Desktop to load the new MCP server."
echo ""
echo "🎉 Setup complete! You can now use the following tools in Claude:"
echo "   • read_file - Read file contents"
echo "   • write_file - Write content to files"
echo "   • list_directory - List directory contents"
echo "   • calculate - Perform mathematical calculations"
echo ""
echo "💡 Try asking Claude: 'List the files in the current directory' or 'Calculate 15 * 23 + 7'"
