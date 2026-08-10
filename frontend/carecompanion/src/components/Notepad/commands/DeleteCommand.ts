import { EditorCommand } from './EditorCommand';
import { EditorState } from '../EditorState';

export class DeleteCommand implements EditorCommand {
    constructor(
        public position: number,
        public deletedText: string
    ) {}

    execute(state: EditorState): EditorState {
        const before = state.content.slice(0, this.position);
        const after = state.content.slice(this.position + this.deletedText.length);
        
        return {
            content: before + after,
            cursorStart: this.position,
            cursorEnd: this.position
        };
    }

    undo(state: EditorState): EditorState {
        const before = state.content.slice(0, this.position);
        const after = state.content.slice(this.position);
        
        return {
            content: before + this.deletedText + after,
            cursorStart: this.position + this.deletedText.length,
            cursorEnd: this.position + this.deletedText.length
        };
    }
}
