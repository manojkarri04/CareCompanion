import { EditorCommand } from './EditorCommand';
import { EditorState } from '../EditorState';
import { ReplaceCommand } from './ReplaceCommand';
import { InsertCommand } from './InsertCommand';

export class PasteCommand implements EditorCommand {
    private internalCommand: EditorCommand;

    constructor(
        public position: number,
        public pastedText: string,
        public replacedText: string = ""
    ) {
        if (replacedText) {
            this.internalCommand = new ReplaceCommand(position, replacedText, pastedText);
        } else {
            this.internalCommand = new InsertCommand(position, pastedText);
        }
    }

    execute(state: EditorState): EditorState {
        return this.internalCommand.execute(state);
    }

    undo(state: EditorState): EditorState {
        return this.internalCommand.undo(state);
    }
}
