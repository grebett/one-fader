import React, { useRef, useEffect, useState } from 'react';
import '@mojs/core';
import MojsCurveEditor from 'midi-curve-editor';
import './MIDICurveEditor.css';
import { useDispatch } from 'react-redux';

const MIDICurveEditor = ({ name, layout, selectedEditorId, restored }) => {
  const widgetContainerRef = useRef(null);
  const [widget, saveWidget] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (widget) {
      widget.dispose();
    }
    const editor = new MojsCurveEditor({ name }, widgetContainerRef.current);
    saveWidget(editor);
    layout === 'maximized' ? editor.maximize() : editor.minimize();
  }, [name, layout, restored]);

  const doubleClickHandler = () => {
    if (selectedEditorId) {
      dispatch({ type: 'RESTORE_EDITOR_IN_UI', payload: {id: selectedEditorId} });
    }
    dispatch({ type: 'SELECT_EDITOR', payload: {id: name} });
    dispatch({ type: 'REMOVE_EDITOR_IN_UI', payload: {id: name} });
    widget.dispose();
  };

  if (layout === 'maximized') {
    return <div className="MIDI-curve-editor container" ref={widgetContainerRef}></div>;
  } else {
    return (
      <div
        className="MIDI-curve-editor container"
        ref={widgetContainerRef}
        onDoubleClick={doubleClickHandler}
      ></div>
    );
  }
};

export { MIDICurveEditor };
