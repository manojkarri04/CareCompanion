import { EditorCommand } from './EditorCommand';
import { EditorState } from '../EditorState';

export class InsertCommand implements EditorCommand {
    constructor(
        public position: number,
        public insertedText: string
    ) {}

    execute(state: EditorState): EditorState {
        const before = state.content.slice(0, this.position);
        const after = state.content.slice(this.position);
        
        return {
            content: before + this.insertedText + after,
            cursorStart: this.position + this.insertedText.length,
            cursorEnd: this.position + this.insertedText.length
        };
    }

    undo(state: EditorState): EditorState {
        const before = state.content.slice(0, this.position);
        const after = state.content.slice(this.position + this.insertedText.length);
        
        return {
            content: before + after,
            cursorStart: this.position,
            cursorEnd: this.position
        };
    }
}
