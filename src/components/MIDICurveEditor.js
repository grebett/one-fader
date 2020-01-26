import React, { useRef, useEffect, useState } from 'react';
import '@mojs/core';
import MojsCurveEditor from 'midi-curve-editor';
import './MIDICurveEditor.css';
import { useDispatch } from 'react-redux';

window.curves = [];

const MIDICurveEditor = ({ id, name, layout, isSelected, selectedEditorId }) => {
  const widgetContainerRef = useRef(null);
  const [widget, saveWidget] = useState(null);
  const dispatch = useDispatch();
  const innerMIDIValues = useRef([]);

  useEffect(() => {
    // 1) create widget
    const widget = new MojsCurveEditor({ name: id }, widgetContainerRef.current);
    widget.minimize();
    saveWidget(widget);
    dispatch({ type: 'ATTACH_WIDGET_TO_EDITOR', payload: { id, widget } });

    // 2) get its MIDI values
  }, [id, layout, dispatch]);

  useEffect(() => {
    if (widget) {
      const MIDIValues = [];
      for (let i = 0; i < 1; i += 1 / 127) {
        MIDIValues.push(widget.getMIDIValue()(i));
      }
      dispatch({
        type: 'UPDATE_CURVE_EDITOR_PARAMETERS',
        payload: { id, parameters: { MIDIValues } },
      });
      innerMIDIValues.current = MIDIValues;
    }
  }, [dispatch, id, widget]);

  const doubleClickHandler = () => {
    if (!selectedEditorId) {
      dispatch({ type: 'SELECT_CURVE_EDITOR', payload: { id } });
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
      payload: { id, parameters: { MIDIValues } },
    });
    innerMIDIValues.current = MIDIValues;
  };

  const showValues = () => {
    // console.table(innerMIDIValues.current);
    alert(innerMIDIValues.current);
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
      title={name}
    >
      {widget && (
        <div className={widgetNameClassName} onClick={showValues} title={name}>
          {name}
        </div>
      )}
    </div>
  );
};

export { MIDICurveEditor };
