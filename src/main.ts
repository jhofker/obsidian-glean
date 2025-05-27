import { Editor, Notice, Plugin, EditorSuggest, TFile, EditorPosition, EditorSuggestTriggerInfo, EditorSuggestContext } from 'obsidian';
import { Glean } from '@gleanwork/api-client';
import { GleanSettings, GleanSettingTab, DEFAULT_SETTINGS } from './settings';

export default class GleanPlugin extends Plugin {
	settings: GleanSettings;
	private gleanClient: Glean | null = null;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new GleanSettingTab(this.app, this));

		// Register slash command for /glean
		this.registerEditorSuggest(new GleanSlashCommand(this.app, this));

		console.log('Glean plugin loaded');
	}

	onunload() {
		console.log('Glean plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Reinitialize client when settings change
		this.initializeGleanClient();
	}

	private initializeGleanClient(): void {
		if (!this.settings.apiKey || !this.settings.instanceName) {
			this.gleanClient = null;
			return;
		}

		try {
			this.gleanClient = new Glean({
				apiToken: this.settings.apiKey,
				instance: this.settings.instanceName,
			});
		} catch (error) {
			console.error('Failed to initialize Glean client:', error);
			this.gleanClient = null;
		}
	}

	async testGleanConnection(): Promise<boolean> {
		if (!this.settings.apiKey || !this.settings.instanceName) {
			return false;
		}

		try {
			// Create a temporary client for testing
			const testClient = new Glean({
				apiToken: this.settings.apiKey,
				instance: this.settings.instanceName,
			});

			// Try a simple test query to verify the connection works
			const testResponse = await testClient.client.chat.create({
				messages: [
					{
						fragments: [
							{
								text: "Hello, this is a connection test.",
							},
						],
					},
				],
				timeoutMillis: 10000, // 10 second timeout for test
			});

			// If we get here without an error, the connection works
			console.log('Glean connection test successful:', testResponse);
			return true;
		} catch (error) {
			console.error('Glean connection test failed:', error);
			return false;
		}
	}

	async queryGlean(query: string): Promise<string> {
		if (!this.gleanClient) {
			this.initializeGleanClient();
			if (!this.gleanClient) {
				throw new Error('Glean client not configured. Please check your settings.');
			}
		}

		try {
			console.log('Querying Glean:', query);
			
			// Make the actual Chat API call
			const response = await this.gleanClient.client.chat.create({
				messages: [
					{
						fragments: [
							{
								text: query,
							},
						],
					},
				],
				timeoutMillis: this.settings.timeout,
			});

			// Process the response and format it
			return this.formatGleanResponse(response, query);
			
		} catch (error) {
			console.error('Glean query failed:', error);
			throw new Error(`Failed to query Glean: ${error.message}`);
		}
	}

	private formatGleanResponse(response: any, originalQuery: string): string {
		try {
			// Extract the AI response from Glean's response structure
			const messages = response.messages || [];
			const aiMessage = messages.find((msg: any) => msg.author === 'GLEAN_AI');
			
			if (!aiMessage || !aiMessage.fragments) {
				return `> [!warning] Glean Response
> No response received from Glean for: "${originalQuery}"`;
			}

			// Combine all text fragments
			const responseText = aiMessage.fragments
				.map((fragment: any) => fragment.text || '')
				.join(' ')
				.trim();

			if (!responseText) {
				return `> [!warning] Glean Response
> Empty response received from Glean for: "${originalQuery}"`;
			}

			// Format the response in a callout block
			let formattedResponse = `> [!info] Glean Response\n`;
			
			// Split response into lines and format each line with callout prefix
			const lines = responseText.split('\n');
			lines.forEach((line: string) => {
				formattedResponse += `> ${line}\n`;
			});

			// Add sources if available (this would need to be extracted from the response)
			// For now, we'll add a placeholder since the exact structure may vary
			formattedResponse += `>\n> **Query:** "${originalQuery}"\n`;
			
			// Add timestamp
			const timestamp = new Date().toLocaleString();
			formattedResponse += `> **Generated:** ${timestamp}`;

			return formattedResponse;

		} catch (error) {
			console.error('Error formatting Glean response:', error);
			return `> [!error] Glean Response Error
> Failed to format response for: "${originalQuery}"
> Error: ${error.message}`;
		}
	}
}

interface GleanSuggestion {
	query: string;
}

class GleanSlashCommand extends EditorSuggest<GleanSuggestion> {
	plugin: GleanPlugin;

	constructor(app: any, plugin: GleanPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const match = line.match(/\/glean\s+(.*)$/);
		
		if (match) {
			return {
				start: { line: cursor.line, ch: line.indexOf('/glean') },
				end: cursor,
				query: match[1] || ''
			};
		}
		
		return null;
	}

	getSuggestions(context: EditorSuggestContext): GleanSuggestion[] {
		const query = context.query.trim();
		
		if (query.length === 0) {
			return [{ query: 'Type your question for Glean...' }];
		}
		
		return [{ query }];
	}

	renderSuggestion(suggestion: GleanSuggestion, el: HTMLElement): void {
		el.createEl('div', { text: `Ask Glean: ${suggestion.query}` });
	}

	async selectSuggestion(suggestion: GleanSuggestion, evt: MouseEvent | KeyboardEvent): Promise<void> {
		if (suggestion.query === 'Type your question for Glean...') {
			return;
		}

		const editor = this.context?.editor;
		if (!editor || !this.context) return;

		try {
			// Replace the /glean command with a loading message
			const start = this.context.start;
			const end = this.context.end;
			
			editor.replaceRange('> [!info] Glean is thinking...', start, end);
			
			// Query Glean
			const response = await this.plugin.queryGlean(suggestion.query);
			
			// Replace loading message with response
			const currentLine = editor.getLine(start.line);
			const loadingStart = { line: start.line, ch: 0 };
			const loadingEnd = { line: start.line, ch: currentLine.length };
			
			editor.replaceRange(response, loadingStart, loadingEnd);
			
		} catch (error) {
			console.error('Failed to query Glean:', error);
			new Notice(`Glean query failed: ${error.message}`);
			
			// Replace with error message
			if (this.context) {
				const start = this.context.start;
				const end = this.context.end;
				editor.replaceRange(`> [!error] Glean Error\n> ${error.message}`, start, end);
			}
		}
	}
}
