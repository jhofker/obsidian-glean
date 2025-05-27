import { App, PluginSettingTab, Setting } from 'obsidian';
import GleanPlugin from './main';

export interface GleanSettings {
	apiKey: string;
	instanceName: string;
	timeout: number;
}

export const DEFAULT_SETTINGS: GleanSettings = {
	apiKey: '',
	instanceName: '',
	timeout: 30000, // 30 seconds
};

export class GleanSettingTab extends PluginSettingTab {
	plugin: GleanPlugin;

	constructor(app: App, plugin: GleanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Glean Plugin Settings' });

		containerEl.createEl('p', {
			text: 'Configure your Glean instance connection. You can find your API key in your Glean admin console.',
		});

		new Setting(containerEl)
			.setName('Glean Instance Name')
			.setDesc('Your Glean instance name (e.g., "yourcompany" for yourcompany.glean.com)')
			.addText(text => text
				.setPlaceholder('yourcompany')
				.setValue(this.plugin.settings.instanceName)
				.onChange(async (value) => {
					this.plugin.settings.instanceName = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your Glean API key with CHAT scope permissions')
			.addText(text => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('Enter your Glean API key')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Request Timeout')
			.setDesc('Timeout for Glean API requests in milliseconds (default: 30000)')
			.addText(text => text
				.setPlaceholder('30000')
				.setValue(this.plugin.settings.timeout.toString())
				.onChange(async (value) => {
					const timeout = parseInt(value);
					if (!isNaN(timeout) && timeout > 0) {
						this.plugin.settings.timeout = timeout;
						await this.plugin.saveSettings();
					}
				}));

		// Add validation status
		this.addValidationStatus(containerEl);
	}

	private addValidationStatus(containerEl: HTMLElement): void {
		const statusEl = containerEl.createEl('div', { cls: 'glean-settings-status' });
		
		const validateButton = new Setting(statusEl)
			.setName('Test Connection')
			.setDesc('Validate your Glean configuration')
			.addButton(button => button
				.setButtonText('Test')
				.setCta()
				.onClick(async () => {
					await this.validateSettings(statusEl);
				}));
	}

	private async validateSettings(statusEl: HTMLElement): Promise<void> {
		const { apiKey, instanceName } = this.plugin.settings;
		
		// Clear previous status
		const existingStatus = statusEl.querySelector('.validation-result');
		if (existingStatus) {
			existingStatus.remove();
		}

		if (!apiKey || !instanceName) {
			this.showValidationResult(statusEl, 'error', 'Please provide both API key and instance name');
			return;
		}

		try {
			this.showValidationResult(statusEl, 'loading', 'Testing connection...');
			
			// Test the connection using the plugin's method
			const isValid = await this.plugin.testGleanConnection();
			
			if (isValid) {
				this.showValidationResult(statusEl, 'success', 'Connection successful!');
			} else {
				this.showValidationResult(statusEl, 'error', 'Connection failed. Please check your credentials.');
			}
		} catch (error) {
			console.error('Glean connection test failed:', error);
			this.showValidationResult(statusEl, 'error', `Connection failed: ${error.message}`);
		}
	}

	private showValidationResult(containerEl: HTMLElement, type: 'success' | 'error' | 'loading', message: string): void {
		const resultEl = containerEl.createEl('div', { 
			cls: `validation-result validation-${type}`,
			text: message 
		});
		
		// Auto-remove success/error messages after 5 seconds
		if (type !== 'loading') {
			setTimeout(() => {
				resultEl.remove();
			}, 5000);
		}
	}
}
