import { Stack } from './Stack';
import { EditorCommand } from './commands/EditorCommand';

export class UndoRedoManager {
    private undoStack = new Stack<EditorCommand>();
    private redoStack = new Stack<EditorCommand>();

    executeCommand(command: EditorCommand): void {
        this.undoStack.push(command);
        // Any new operation clears the redo stack
        this.redoStack.clear();
    }

    undo(): EditorCommand | undefined {
        if (this.undoStack.isEmpty()) {
            return undefined;
        }
        
        const command = this.undoStack.pop()!;
        this.redoStack.push(command);
        return command;
    }

    redo(): EditorCommand | undefined {
        if (this.redoStack.isEmpty()) {
            return undefined;
        }

        const command = this.redoStack.pop()!;
        this.undoStack.push(command);
        return command;
    }

    canUndo(): boolean {
        return !this.undoStack.isEmpty();
    }

    canRedo(): boolean {
        return !this.redoStack.isEmpty();
    }

    clear(): void {
        this.undoStack.clear();
        this.redoStack.clear();
    }
}
