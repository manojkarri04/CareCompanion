import { EditorState } from './EditorState';
import { UndoRedoManager } from './UndoRedoManager';
import { InsertCommand } from './commands/InsertCommand';
import { DeleteCommand } from './commands/DeleteCommand';
import { ReplaceCommand } from './commands/ReplaceCommand';
import { PasteCommand } from './commands/PasteCommand';
import { EditorCommand } from './commands/EditorCommand';

export class EditorEngine {
    private manager = new UndoRedoManager();
    private currentState: EditorState;
    private uncommittedCommand: InsertCommand | DeleteCommand | null = null;
    private lastEditTime: number = 0;

    constructor(initialState: EditorState) {
        this.currentState = initialState;
    }

    public getCurrentState(): EditorState {
        return this.currentState;
    }

    public handleChange(newState: EditorState, isPaste: boolean = false, isCut: boolean = false): void {
        const oldState = this.currentState;
        this.currentState = newState;

        const now = Date.now();
        const timeSinceLastEdit = now - this.lastEditTime;
        this.lastEditTime = now;

        const diffResult = this.computeDiff(oldState.content, newState.content);
        
        if (!diffResult) {
            return;
        }

        const { type, position, text, replacedText } = diffResult;
        
        const shouldBreakGroup = 
            timeSinceLastEdit > 500 || 
            isPaste || 
            isCut || 
            text.includes('\n') || 
            type === 'replace' ||
            (this.uncommittedCommand && 
                ((type === 'insert' && !(this.uncommittedCommand instanceof InsertCommand)) ||
                 (type === 'delete' && !(this.uncommittedCommand instanceof DeleteCommand))));

        if (shouldBreakGroup) {
            this.commitCurrentGroup();
        }

        if (isPaste) {
            this.manager.executeCommand(new PasteCommand(position, text, replacedText || ""));
            return;
        }

        if (type === 'replace') {
            this.manager.executeCommand(new ReplaceCommand(position, replacedText!, text));
        } else if (type === 'insert') {
            if (this.uncommittedCommand instanceof InsertCommand && this.uncommittedCommand.position + this.uncommittedCommand.insertedText.length === position) {
                this.uncommittedCommand.insertedText += text;
            } else {
                this.commitCurrentGroup();
                this.uncommittedCommand = new InsertCommand(position, text);
            }
        } else if (type === 'delete') {
            if (this.uncommittedCommand instanceof DeleteCommand && position + text.length === this.uncommittedCommand.position) {
                this.uncommittedCommand.deletedText = text + this.uncommittedCommand.deletedText;
                this.uncommittedCommand.position = position;
            } 
            else if (this.uncommittedCommand instanceof DeleteCommand && position === this.uncommittedCommand.position) {
                this.uncommittedCommand.deletedText += text;
            } else {
                this.commitCurrentGroup();
                this.uncommittedCommand = new DeleteCommand(position, text);
            }
        }
    }

    public handleCursorChange(cursorStart: number, cursorEnd: number): void {
        const oldStart = this.currentState.cursorStart;
        const oldEnd = this.currentState.cursorEnd;

        this.currentState = {
            ...this.currentState,
            cursorStart,
            cursorEnd
        };

        if (this.uncommittedCommand) {
            // Break grouping if cursor moves to a new position without editing
            if (Math.abs(cursorStart - oldStart) > 1 || oldStart !== oldEnd) {
                this.commitCurrentGroup();
            }
        }
    }

    public commitCurrentGroup(): void {
        if (this.uncommittedCommand) {
            this.manager.executeCommand(this.uncommittedCommand);
            this.uncommittedCommand = null;
        }
    }

    public undo(): EditorState | null {
        this.commitCurrentGroup(); 
        if (this.manager.canUndo()) {
            const command = this.manager.undo()!;
            this.currentState = command.undo(this.currentState);
            return this.currentState;
        }
        return null;
    }

    public redo(): EditorState | null {
        this.commitCurrentGroup();
        if (this.manager.canRedo()) {
            const command = this.manager.redo()!;
            this.currentState = command.execute(this.currentState);
            return this.currentState;
        }
        return null;
    }

    public canUndo(): boolean {
        return this.uncommittedCommand !== null || this.manager.canUndo();
    }

    public canRedo(): boolean {
        return this.manager.canRedo();
    }

    public reset(initialState: EditorState): void {
        this.currentState = initialState;
        this.manager.clear();
        this.uncommittedCommand = null;
        this.lastEditTime = 0;
    }

    private computeDiff(oldText: string, newText: string): { type: 'insert' | 'delete' | 'replace', position: number, text: string, replacedText?: string } | null {
        if (oldText === newText) return null;

        let prefixLen = 0;
        while (prefixLen < oldText.length && prefixLen < newText.length && oldText[prefixLen] === newText[prefixLen]) {
            prefixLen++;
        }

        let suffixLen = 0;
        while (suffixLen < oldText.length - prefixLen && suffixLen < newText.length - prefixLen && 
               oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]) {
            suffixLen++;
        }

        const oldSegment = oldText.substring(prefixLen, oldText.length - suffixLen);
        const newSegment = newText.substring(prefixLen, newText.length - suffixLen);

        if (oldSegment.length === 0 && newSegment.length > 0) {
            return { type: 'insert', position: prefixLen, text: newSegment };
        } else if (oldSegment.length > 0 && newSegment.length === 0) {
            return { type: 'delete', position: prefixLen, text: oldSegment };
        } else {
            return { type: 'replace', position: prefixLen, text: newSegment, replacedText: oldSegment };
        }
    }
}
