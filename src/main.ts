import { Plugin } from 'obsidian';
import { GleanSettings, GleanSettingTab, DEFAULT_SETTINGS } from './settings';
import { initializeGleanClient } from './glean-client';
import { createGleanSlashCommand } from './slash-command';

export default class GleanPlugin extends Plugin {
	settings: GleanSettings;

	async onload() {
		await this.loadSettings();

		// Initialize Glean client with current settings
		initializeGleanClient(this.settings);

		// Add settings tab
		this.addSettingTab(new GleanSettingTab(this.app, this));

		// Register slash command for /glean
		console.log('Registering Glean slash command...');
		this.registerEditorSuggest(createGleanSlashCommand(this.app, () => this.settings));
		console.log('Glean slash command registered successfully');

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
		initializeGleanClient(this.settings);
	}
}
