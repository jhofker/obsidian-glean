import {
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  Notice,
  TFile,
} from "obsidian";

import { queryGlean } from "./glean-client";
import { GleanSettings } from "./settings";

interface GleanSuggestion {
  query: string;
}

export function createGleanSlashCommand(
  app: any,
  getSettings: () => GleanSettings
): EditorSuggest<GleanSuggestion> {
  return new GleanSlashCommandImpl(app, getSettings);
}

class GleanSlashCommandImpl extends EditorSuggest<GleanSuggestion> {
  private getSettings: () => GleanSettings;

  constructor(app: any, getSettings: () => GleanSettings) {
    super(app);
    this.getSettings = getSettings;
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);

    // Look for /glean at the start of the line or after whitespace
    const match = line.match(/(^|\s)\/glean(\s+(.*))?$/);

    if (match) {
      console.log("Found /glean trigger, match:", match);
      const gleanIndex = line.lastIndexOf("/glean");
      const query = match[3] || ""; // The captured group after the space, if any

      return {
        start: { line: cursor.line, ch: gleanIndex },
        end: cursor,
        query: query,
      };
    }

    return null;
  }

  getSuggestions(context: EditorSuggestContext): GleanSuggestion[] {
    const query = context.query.trim();

    if (query.length === 0) {
      return [{ query: "Type your question for Glean..." }];
    }

    return [{ query }];
  }

  renderSuggestion(suggestion: GleanSuggestion, el: HTMLElement): void {
    el.createEl("div", { text: `Ask Glean: ${suggestion.query}` });
  }

  async selectSuggestion(
    suggestion: GleanSuggestion,
    evt: MouseEvent | KeyboardEvent
  ): Promise<void> {
    if (suggestion.query === "Type your question for Glean...") {
      return;
    }

    const editor = this.context?.editor;
    const file = this.context?.file;
    if (!editor || !this.context || !file) return;

    try {
      // Replace the /glean command with a loading message
      const start = this.context.start;
      const end = this.context.end;

      const loadingMessage = "> [!info] Glean is thinking...";
      editor.replaceRange(loadingMessage, start, end);

      // Store the current file for validation later
      const originalFile = file;
      const expectedLine = start.line;

      // Query Glean using the modular function
      const settings = this.getSettings();
      const response = await queryGlean(suggestion.query, settings);

      // Safety checks before inserting response
      const currentEditor = this.app.workspace.activeEditor?.editor;
      const currentFile = this.app.workspace.getActiveFile();

      // Check if we're still in the same document
      if (!currentEditor || !currentFile || currentFile.path !== originalFile.path) {
        new Notice(
          "Glean response ready, but you switched documents. Check the original document."
        );

        // Try to find the original editor and replace the loading message
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        for (const leaf of leaves) {
          const view = leaf.view as any;
          if (view.file?.path === originalFile.path && view.editor) {
            this.replaceLoadingMessage(view.editor, loadingMessage, response, expectedLine);
            break;
          }
        }
        return;
      }

      // We're in the same document, try to replace the loading message
      this.replaceLoadingMessage(currentEditor, loadingMessage, response, expectedLine);
    } catch (error) {
      console.error("Failed to query Glean:", error);
      new Notice(`Glean query failed: ${error.message}`);

      // Try to replace with error message using the same safe method
      const errorMessage = `> [!error] Glean Error\n> ${error.message}`;
      const currentEditor = this.app.workspace.activeEditor?.editor;
      if (currentEditor && this.context) {
        this.replaceLoadingMessage(
          currentEditor,
          "> [!info] Glean is thinking...",
          errorMessage,
          this.context.start.line
        );
      }
    }
  }

  private replaceLoadingMessage(
    editor: Editor,
    loadingMessage: string,
    replacement: string,
    expectedLine: number
  ): void {
    // First, try the expected line
    if (expectedLine < editor.lineCount()) {
      const lineContent = editor.getLine(expectedLine);
      if (lineContent.trim() === loadingMessage.trim()) {
        const lineStart = { line: expectedLine, ch: 0 };
        const lineEnd = { line: expectedLine, ch: lineContent.length };
        editor.replaceRange(replacement, lineStart, lineEnd);
        return;
      }
    }

    // If not found at expected line, search nearby lines (in case text was added/removed)
    const searchRange = 5; // Search 5 lines above and below
    const startSearch = Math.max(0, expectedLine - searchRange);
    const endSearch = Math.min(editor.lineCount() - 1, expectedLine + searchRange);

    for (let lineNum = startSearch; lineNum <= endSearch; lineNum++) {
      const lineContent = editor.getLine(lineNum);
      if (lineContent.trim() === loadingMessage.trim()) {
        const lineStart = { line: lineNum, ch: 0 };
        const lineEnd = { line: lineNum, ch: lineContent.length };
        editor.replaceRange(replacement, lineStart, lineEnd);
        return;
      }
    }

    // If we still can't find it, insert at the expected line or end of document
    const insertLine = Math.min(expectedLine, editor.lineCount() - 1);
    const insertPos = { line: insertLine, ch: editor.getLine(insertLine).length };
    editor.replaceRange("\n" + replacement, insertPos, insertPos);

    new Notice("Glean response inserted, but loading message was not found at expected location.");
  }
}
