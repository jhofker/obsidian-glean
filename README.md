# Obsidian Glean Plugin

An Obsidian plugin that integrates with Glean's enterprise AI platform, allowing you to query your company's knowledge base directly from your notes using natural language.

## Features

- 🔍 **Natural Language Queries**: Ask questions in plain English using the `/glean` slash command
- 🏢 **Enterprise Integration**: Connects to your company's Glean instance with proper authentication
- 📝 **Inline Responses**: Get AI-powered answers directly in your notes as formatted callouts
- 🔒 **Secure**: Uses your Glean API credentials with proper permission handling
- ⚡ **Real-time**: Immediate responses with loading indicators

## Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/your-username/obsidian-glean/releases)
2. Extract the files to your Obsidian plugins folder:
   - Windows: `%APPDATA%\Obsidian\plugins\obsidian-glean\`
   - macOS: `~/Library/Application Support/obsidian/plugins/obsidian-glean/`
   - Linux: `~/.config/obsidian/plugins/obsidian-glean/`
3. Enable the plugin in Obsidian Settings → Community Plugins

### Development Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Copy the `dist` folder contents to your Obsidian plugins directory
5. Enable the plugin in Obsidian

## Setup

### 1. Get Your Glean Credentials

You'll need:
- **Glean Instance Name**: Your company's Glean domain (e.g., "yourcompany" for yourcompany.glean.com)
- **API Key**: A Glean API token with `CHAT` scope permissions

To get an API key:
1. Go to your Glean admin console
2. Navigate to API settings
3. Generate a new token with `CHAT` scope
4. Copy the token for use in the plugin

### 2. Configure the Plugin

1. Open Obsidian Settings
2. Go to Community Plugins → Glean
3. Enter your Glean Instance Name and API Key
4. Click "Test Connection" to verify your setup
5. Save the settings

## Usage

### Basic Query

Type `/glean` followed by your question in any note:

```
/glean What happened in our team meeting yesterday?
```

Press Enter or select the suggestion to execute the query.

### Example Queries

- `/glean Give me a summary of what happened last week`
- `/glean Summarize what I did this week`
- `/glean What's the status of project xyz?`
- `/glean What issues did my team encounter this week?`
- `/glean What team owns service ABC?`
- `/glean Show me the latest updates on our product roadmap`

### Response Format

Responses appear as formatted callouts in your notes:

```markdown
> [!info] Glean Response
> Based on your team meeting yesterday, here are the key points discussed:
> 
> - Project timeline updates for Q1 deliverables
> - Budget allocation discussions for the new initiative
> - New team member onboarding process improvements
> 
> **Query:** "What happened in our team meeting yesterday?"
> **Generated:** 1/15/2024, 2:30:15 PM
```

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Glean Instance Name** | Your company's Glean domain name | (empty) |
| **API Key** | Your Glean API token with CHAT scope | (empty) |
| **Request Timeout** | Timeout for API requests in milliseconds | 30000 |

## Troubleshooting

### Connection Issues

If you see "Connection failed" errors:

1. Verify your instance name is correct (just the domain part, not the full URL)
2. Check that your API key has the correct `CHAT` scope permissions
3. Ensure your network allows connections to your Glean instance
4. Try the "Test Connection" button in settings

### No Response or Empty Response

If queries return empty responses:

1. Check that your Glean instance has content indexed
2. Verify you have permission to access the relevant data sources
3. Try simpler, more general queries first
4. Check the browser console for detailed error messages

### Plugin Not Loading

1. Ensure you've enabled the plugin in Community Plugins settings
2. Check that all files are in the correct plugin directory
3. Restart Obsidian after installation
4. Check the console for any error messages

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build for development (with file watching)
npm run dev

# Build for production
npm run build

# Install to your Obsidian vault (set OBSIDIAN_VAULT env var)
npm run install-plugin
```

### Project Structure

```
src/
├── main.ts          # Main plugin class and slash command implementation
├── settings.ts      # Settings interface and configuration management
styles.css           # Plugin styling
manifest.json        # Plugin manifest
package.json         # Dependencies and build scripts
```

## Privacy and Security

- Your API credentials are stored locally in Obsidian's settings
- All queries are sent directly to your company's Glean instance
- No data is sent to third parties
- Responses respect your Glean permissions and data access rights

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/obsidian-glean/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-username/obsidian-glean/discussions)
- 📖 **Documentation**: [Glean Developer Portal](https://developers.glean.com/)

## Changelog

### v1.0.0
- Initial release
- Basic `/glean` slash command functionality
- Glean Chat API integration
- Settings interface with connection testing
- Formatted callout responses 