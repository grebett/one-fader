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
  const innerMIDIValues = useRef([]);

  useEffect(() => {
    // 1) create widget
    const widget = new MojsCurveEditor({ name }, widgetContainerRef.current);
    widget.minimize();
    saveWidget(widget);
    dispatch({ type: 'ATTACH_WIDGET_TO_EDITOR', payload: { id: name, widget } });

    // 2) get its MIDI values
  }, [name, layout, dispatch]);

  useEffect(() => {
    if (widget) {
      const MIDIValues = [];
      for (let i = 0; i < 1; i += 1 / 127) {
        MIDIValues.push(widget.getMIDIValue()(i));
      }
      dispatch({
        type: 'UPDATE_CURVE_EDITOR_PARAMETERS',
        payload: { id: name, parameters: { MIDIValues } },
      });
      innerMIDIValues.current = MIDIValues;
    }
  }, [dispatch, name, widget]);

  const doubleClickHandler = () => {
    if (!selectedEditorId) {
      dispatch({ type: 'SELECT_CURVE_EDITOR', payload: { id: name } });
      widget.maximize();
    }
  };

  const clickHandler = () => {
    widget.forceSaveState();
    const MIDIValues = [];
    for (let i = 0; i < 1; i += 1 / 127) {
      MIDIValues.push(widget.getMIDIValue()(i));
    }
    dispatch({
      type: 'UPDATE_CURVE_EDITOR_PARAMETERS',
      payload: { id: name, parameters: { MIDIValues } },
    });
    innerMIDIValues.current = MIDIValues;
  };

  const showValues = () => {
    console.table(innerMIDIValues.current);
  };

  let containerClassName = 'MIDI-curve-editor container';
  let widgetNameClassName = 'MIDI-curve-editor--widget-name';
  if (isSelected) {
    containerClassName += ' selected';
    widgetNameClassName += ' selected';
  }
  return (
    <div
      className={containerClassName}
      ref={widgetContainerRef}
      onDoubleClick={doubleClickHandler}
      onClick={clickHandler}
    >
      {widget && (
        <div className={widgetNameClassName} onClick={showValues}>
          {name}
        </div>
      )}
    </div>
  );
};

export { MIDICurveEditor };
