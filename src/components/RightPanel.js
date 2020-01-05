import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import './RightPanel.css';

const RightPanel = ({ selectedEditorId }) => {
  const dispatch = useDispatch();
  const selectedEditor = useSelector(state =>
    state.app.curveEditors.find(editor => editor.id === selectedEditorId),
  );

  const unselectEditor = () => {
    dispatch({ type: 'UNSELECT_CURVE_EDITOR', payload: { id: selectedEditorId } });
    selectedEditor.widget.minimize();
    const MIDIValues = [];
    for (let i = 0; i < 1; i += 1 / 127) {
      MIDIValues.push(selectedEditor.widget.getMIDIValue()(i));
    }
    dispatch({
      type: 'UPDATE_CURVE_EDITOR_PARAMETERS',
      payload: { id: selectedEditorId, parameters: { MIDIValues } },
    });
  };

  const useSignUpForm = (callback, selectedEditor = {}) => {
    const [inputs, setInputs] = useState({ instrument: 0, channel: 0, CC: 0 });
    const handleSubmit = event => {
      event.preventDefault();
      console.log('called');
      // setInputs(() => ({}));
      callback();
      return false;
    };

    const handleInputChange = event => {
      event.persist();
      setInputs(inputs => ({ ...inputs, [event.target.name]: event.target.value }));
      dispatch({
        type: 'UPDATE_CURVE_EDITOR_PARAMETERS',
        payload: { id: selectedEditorId, parameters: { [event.target.name]: event.target.value } },
      });
    };
    return {
      handleSubmit,
      handleInputChange,
      inputs,
    };
  };

  const { inputs, handleInputChange, handleSubmit } = useSignUpForm(
    (...args) => console.log(args),
    selectedEditor,
  );

  if (selectedEditor) {
    return (
      <div className="right-panel container">
        <h1>RightPanel</h1>
        {selectedEditorId && (
          <form className="right-panel-controls" onSubmit={handleSubmit}>
            <input type="submit" onClick={unselectEditor} value="Close" />

            <div className="right-panel-control">
              <label>Instrument</label>
              <input type="number" name="instrument" value={inputs.instrument} onChange={handleInputChange} />
            </div>
            <div className="right-panel-control">
              <label>Channel</label>
              <input type="number" name="channel" min={0} max={16} value={inputs.channel} onChange={handleInputChange} />
            </div>
            <div className="right-panel-control">
              <label>CC</label>
              <input type="number" name="CC" value={inputs.CC} min={0} max={127} onChange={handleInputChange} />
            </div>
          </form>
        )}
      </div>
    );
  } else {
    return (
      <div className="right-panel container">
        <h1>RightPanel</h1>
      </div>
    );
  }
};

export { RightPanel };
