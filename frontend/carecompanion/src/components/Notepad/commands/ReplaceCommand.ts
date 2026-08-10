import { EditorCommand } from './EditorCommand';
import { EditorState } from '../EditorState';

export class ReplaceCommand implements EditorCommand {
    constructor(
        public position: number,
        public oldText: string,
        public newText: string
    ) {}

    execute(state: EditorState): EditorState {
        const before = state.content.slice(0, this.position);
        const after = state.content.slice(this.position + this.oldText.length);
        
        return {
            content: before + this.newText + after,
            cursorStart: this.position + this.newText.length,
            cursorEnd: this.position + this.newText.length
        };
    }

    undo(state: EditorState): EditorState {
        const before = state.content.slice(0, this.position);
        const after = state.content.slice(this.position + this.newText.length);
        
        return {
            content: before + this.oldText + after,
            cursorStart: this.position,
            cursorEnd: this.position + this.oldText.length
        };
    }
}
