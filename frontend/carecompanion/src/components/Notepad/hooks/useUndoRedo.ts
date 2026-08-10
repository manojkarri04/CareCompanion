import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorState } from '../EditorState';
import { EditorEngine } from '../EditorEngine';

export function useUndoRedo(initialContent: string = '') {
    const initialState: EditorState = {
        content: initialContent,
        cursorStart: 0,
        cursorEnd: 0
    };

    const engineRef = useRef(new EditorEngine(initialState));
    const [state, setState] = useState<EditorState>(initialState);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    
    const isPasteRef = useRef(false);
    const isCutRef = useRef(false);

    const reset = useCallback((content: string) => {
        const newState = { content, cursorStart: 0, cursorEnd: 0 };
        engineRef.current.reset(newState);
        setState(newState);
    }, []);

    const updateState = useCallback((newState: EditorState) => {
        // We use a new object reference to ensure React triggers a re-render
        setState({ ...newState });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const target = e.target;
        const newState: EditorState = {
            content: target.value,
            cursorStart: target.selectionStart,
            cursorEnd: target.selectionEnd
        };
        
        engineRef.current.handleChange(newState, isPasteRef.current, isCutRef.current);
        
        isPasteRef.current = false;
        isCutRef.current = false;
        
        updateState(engineRef.current.getCurrentState());
    };

    const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        engineRef.current.handleCursorChange(target.selectionStart, target.selectionEnd);
        updateState(engineRef.current.getCurrentState());
    };

    const handleUndo = useCallback(() => {
        const restoredState = engineRef.current.undo();
        if (restoredState) {
            updateState(restoredState);
        }
    }, [updateState]);

    const handleRedo = useCallback(() => {
        const restoredState = engineRef.current.redo();
        if (restoredState) {
            updateState(restoredState);
        }
    }, [updateState]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            } else if (e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
            }
        }
    }, [handleUndo, handleRedo]);

    const handlePaste = () => { isPasteRef.current = true; };
    const handleCut = () => { isCutRef.current = true; };

    // Restore cursor position in DOM when state changes via undo/redo
    useEffect(() => {
        if (textAreaRef.current) {
            const textarea = textAreaRef.current;
            if (textarea.selectionStart !== state.cursorStart || textarea.selectionEnd !== state.cursorEnd) {
                if (document.activeElement !== textarea) {
                    textarea.focus();
                }
                textarea.setSelectionRange(state.cursorStart, state.cursorEnd);
            }
        }
    }, [state.cursorStart, state.cursorEnd, state.content]);

    return {
        state,
        textAreaRef,
        handleChange,
        handleSelect,
        handleKeyDown,
        handlePaste,
        handleCut,
        handleUndo,
        handleRedo,
        reset,
        canUndo: engineRef.current.canUndo(),
        canRedo: engineRef.current.canRedo()
    };
}
