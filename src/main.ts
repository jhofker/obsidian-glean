import { Plugin } from 'obsidian';
import { GleanSettings, GleanSettingTab, DEFAULT_SETTINGS } from './settings';
import { initializeGleanClient } from './glean-client';
import { createGleanSlashCommand } from './slash-command';

export default class GleanPlugin extends Plugin {
	settings: GleanSettings;

	async onload() {
		await this.loadSettings();

		initializeGleanClient(this.settings);

		this.addSettingTab(new GleanSettingTab(this.app, this));

		this.registerEditorSuggest(createGleanSlashCommand(this.app, () => this.settings));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		initializeGleanClient(this.settings);
	}
}
