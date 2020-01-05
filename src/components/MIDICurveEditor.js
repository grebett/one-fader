import React, { useRef, useEffect, useState } from 'react';
import '@mojs/core';
import MojsCurveEditor from 'midi-curve-editor';
import './MIDICurveEditor.css';
import { useDispatch } from 'react-redux';

window.curves = [];

const MIDICurveEditor = ({ name, layout, isSelected, selectedEditorId }) => {
  const widgetContainerRef = useRef(null);
  const [widget, saveWidget] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const widget = new MojsCurveEditor({ name }, widgetContainerRef.current);
    widget.minimize();
    saveWidget(widget);
    dispatch({ type: 'ATTACH_WIDGET_TO_EDITOR', payload: { id: name, widget } });
  }, [name, layout, dispatch]);

  const doubleClickHandler = () => {
    if (!selectedEditorId) {
      dispatch({ type: 'SELECT_CURVE_EDITOR', payload: { id: name } });
      widget.maximize();
    }
  };

  const clickHandler = () => {
    widget.forceSaveState();
  };

  let className = "MIDI-curve-editor container";
  if (isSelected) {
    className += ' selected';
  }
  return <div
    className={className}
    ref={widgetContainerRef}
    onDoubleClick={doubleClickHandler}
    onClick={clickHandler}
  ></div>
};

export { MIDICurveEditor };
