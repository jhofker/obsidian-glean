import { App, PluginSettingTab, Setting } from 'obsidian';
import { testGleanConnection, debugNetworkRequest } from './glean-client';

export interface GleanSettings {
	apiKey: string;
	instanceName: string;
	timeout: number;
	useCorsFreeMethods: boolean;
}

export const DEFAULT_SETTINGS: GleanSettings = {
	apiKey: '',
	instanceName: '',
	timeout: 30000, // 30 seconds
	useCorsFreeMethods: true, // Default to CORS-free for better compatibility
};

// Validation functions
export function validateSettings(settings: GleanSettings): { isValid: boolean; message?: string } {
	if (!settings.apiKey || !settings.instanceName) {
		return { isValid: false, message: 'Please provide both API key and instance name' };
	}
	return { isValid: true };
}

// Settings UI functions
function createInstanceNameSetting(containerEl: HTMLElement, settings: GleanSettings, onSave: () => Promise<void>): void {
	new Setting(containerEl)
		.setName('Glean Instance Name')
		.setDesc('Your Glean instance name (e.g., "yourcompany" for yourcompany.glean.com)')
		.addText(text => text
			.setPlaceholder('yourcompany')
			.setValue(settings.instanceName)
			.onChange(async (value) => {
				settings.instanceName = value.trim();
				await onSave();
			}));
}

function createApiKeySetting(containerEl: HTMLElement, settings: GleanSettings, onSave: () => Promise<void>): void {
	new Setting(containerEl)
		.setName('API Key')
		.setDesc('Your Glean API key with CHAT scope permissions')
		.addText(text => {
			text.inputEl.type = 'password';
			text
				.setPlaceholder('Enter your Glean API key')
				.setValue(settings.apiKey)
				.onChange(async (value) => {
					settings.apiKey = value.trim();
					await onSave();
				});
		});
}

function createTimeoutSetting(containerEl: HTMLElement, settings: GleanSettings, onSave: () => Promise<void>): void {
	new Setting(containerEl)
		.setName('Request Timeout')
		.setDesc('Timeout for Glean API requests in milliseconds (default: 30000)')
		.addText(text => text
			.setPlaceholder('30000')
			.setValue(settings.timeout.toString())
			.onChange(async (value) => {
				const timeout = parseInt(value);
				if (!isNaN(timeout) && timeout > 0) {
					settings.timeout = timeout;
					await onSave();
				}
			}));
}

function createCorsMethodSetting(containerEl: HTMLElement, settings: GleanSettings, onSave: () => Promise<void>): void {
	new Setting(containerEl)
		.setName('Use CORS-Free Methods')
		.setDesc('Use Obsidian\'s built-in request method to bypass CORS restrictions (recommended)')
		.addToggle(toggle => toggle
			.setValue(settings.useCorsFreeMethods)
			.onChange(async (value) => {
				settings.useCorsFreeMethods = value;
				await onSave();
			}));
}

function showValidationResult(containerEl: HTMLElement, type: 'success' | 'error' | 'loading', message: string): void {
	// Clear any existing validation result first
	const existingStatus = containerEl.querySelector('.validation-result');
	if (existingStatus) {
		existingStatus.remove();
	}

	const resultEl = containerEl.createEl('div', { 
		cls: `validation-result validation-${type}`,
		text: message 
	});
	
	// Auto-remove success/error messages after 5 seconds
	if (type !== 'loading') {
		setTimeout(() => {
			if (resultEl.parentNode) {
				resultEl.remove();
			}
		}, 5000);
	}
}

async function handleConnectionTest(settings: GleanSettings, statusEl: HTMLElement): Promise<void> {
	const validation = validateSettings(settings);
	
	if (!validation.isValid) {
		showValidationResult(statusEl, 'error', validation.message || 'Invalid settings');
		return;
	}

	try {
		showValidationResult(statusEl, 'loading', 'Testing connection...');
		
		const isValid = await testGleanConnection(settings);
		
		if (isValid) {
			showValidationResult(statusEl, 'success', 'Connection successful!');
		} else {
			showValidationResult(statusEl, 'error', 'Connection failed. Please check your credentials.');
		}
	} catch (error) {
		console.error('Glean connection test failed:', error);
		showValidationResult(statusEl, 'error', `Connection failed: ${error.message}`);
	}
}

function createValidationSection(containerEl: HTMLElement, settings: GleanSettings): void {
	const statusEl = containerEl.createEl('div', { cls: 'glean-settings-status' });
	
	new Setting(statusEl)
		.setName('Test Connection')
		.setDesc('Validate your Glean configuration')
		.addButton(button => button
			.setButtonText('Test')
			.setCta()
			.onClick(async () => {
				await handleConnectionTest(settings, statusEl);
			}));

	// Add debug network button
	new Setting(statusEl)
		.setName('Debug Network')
		.setDesc('Test if network requests are working (check browser console)')
		.addButton(button => button
			.setButtonText('Debug')
			.onClick(async () => {
				console.log('=== STARTING NETWORK DEBUG ===');
				await debugNetworkRequest();
				console.log('=== NETWORK DEBUG COMPLETE ===');
				showValidationResult(statusEl, 'success', 'Debug test completed - check browser console for results');
			}));
}

// Main settings tab class (still needed for Obsidian's plugin system)
export class GleanSettingTab extends PluginSettingTab {
	private settings: GleanSettings;
	private onSave: () => Promise<void>;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.settings = plugin.settings;
		this.onSave = () => plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Glean Plugin Settings' });

		containerEl.createEl('p', {
			text: 'Configure your Glean instance connection. You can find your API key in your Glean admin console.',
		});

		// Create all settings using modular functions
		createInstanceNameSetting(containerEl, this.settings, this.onSave);
		createApiKeySetting(containerEl, this.settings, this.onSave);
		createTimeoutSetting(containerEl, this.settings, this.onSave);
		createCorsMethodSetting(containerEl, this.settings, this.onSave);
		createValidationSection(containerEl, this.settings);
	}
}
