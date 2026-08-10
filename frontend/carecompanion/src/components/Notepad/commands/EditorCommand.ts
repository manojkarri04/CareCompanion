import { EditorState } from '../EditorState';

export interface EditorCommand {
    execute(state: EditorState): EditorState;
    undo(state: EditorState): EditorState;
}
