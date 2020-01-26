import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import './RightPanel.css';

const RightPanel = ({ selectedEditorId }) => {
  const dispatch = useDispatch();
  const findEditor = editors => editors.find(editor => editor.id === selectedEditorId);
  const selectedEditor = useSelector(state => findEditor(state.app.curveEditors));

  const computeMIDIValues = () => {
    const MIDIValues = [];
    for (let i = 0; i < 1; i += 1 / 127) {
      MIDIValues.push(selectedEditor.widget.getMIDIValue()(i));
    }
    dispatch({
      type: 'UPDATE_CURVE_EDITOR_PARAMETERS',
      payload: { id: selectedEditorId, parameters: { MIDIValues } },
    });
  };

  const unselectEditor = () => {
    dispatch({ type: 'UNSELECT_CURVE_EDITOR', payload: { id: selectedEditorId } });
    selectedEditor.widget.minimize();
    computeMIDIValues();
  };

  const useSignUpForm = callback => {
    const inputs = useSelector(state => {
      const editor = findEditor(state.app.curveEditors);
      if (editor) {
        return editor;
      }
      return {
        instrument: 0,
        displayName: '',
        about: '',
        channels: '1',
        CC: 1,
        boundMin: 0,
        boundMax: 127,
        rangeMin: 0,
        rangeMax: 0,
        duration: '',
        loop: false,
        noteEvent: 'noteon',
      };
    });

    const handleSubmit = event => {
      event.preventDefault();
      callback();
      return false;
    };

    const handleInputChange = event => {
      event.persist();
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
            <div className="right-panel-control">
              <label>Name</label>
              <input type="text" name="displayName" value={inputs.displayName} onChange={handleInputChange} />
            </div>
            <div className="right-panel-control">
              <label>About</label>
              <textarea name="about" onChange={handleInputChange} value={inputs.about}></textarea>
            </div>
            <h3>Sends</h3>
            <div className="right-panel-control">
              <label>
                Instrument <span style={{ fontSize: '0.5em' }}>(0 = disabled)</span>
              </label>
              <input
                type="number"
                name="instrument"
                min={0}
                max={32}
                value={inputs.instrument}
                onChange={handleInputChange}
              />
            </div>
            <div className="right-panel-control">
              <label>Channels</label>
              <input type="text" name="channels" value={inputs.channels} onChange={handleInputChange} />
            </div>
            <div className="right-panel-control">
              <label>CC</label>
              <input
                type="number"
                name="CC"
                value={inputs.CC}
                min={0}
                max={127}
                onChange={handleInputChange}
              />
            </div>
            <h3>Note triggered ?</h3>
            <div className="right-panel-control">
              <label>Duration</label>
              <input
                type="number"
                name="duration"
                value={inputs.duration}
                min={0}
                max={127}
                onChange={handleInputChange}
              />
            </div>
            <div className="right-panel-control">
              <label>Note-on / note-off</label>
              <select name="noteEvent" value={inputs.noteEvent} onChange={handleInputChange}>
                <option value="noteon">note-on</option>
                <option value="noteoff">note-off</option>
              </select>
            </div>
            <div className="right-panel-control">
              <label>Loop</label>
              <select name="loop" value={inputs.loop} onChange={handleInputChange}>
                <option value="">false</option>
                <option value="restart">restart</option>
                <option value="bounce">bounce</option>
              </select>
            </div>
            <h3>Triggers</h3>
            <div className="right-panel-control">
              <label>Velocity boundaries</label>
              <input
                type="number"
                name="boundMin"
                value={inputs.boundMin}
                min={0}
                max={127}
                onChange={handleInputChange}
                disabled
              />
              <input
                type="number"
                name="boundMax"
                value={inputs.boundMax}
                min={0}
                max={127}
                onChange={handleInputChange}
                disabled
              />
            </div>
            <div className="right-panel-control">
              <label>Notes range</label>
              <input
                type="number"
                name="rangeMin"
                value={inputs.rangeMin}
                min={0}
                max={127}
                onChange={handleInputChange}
                disabled
              />
              <input
                type="number"
                name="rangeMax"
                value={inputs.rangeMax}
                min={0}
                max={127}
                onChange={handleInputChange}
                disabled
              />
            </div>
            <br />
            <button type="submit" onClick={unselectEditor}>
              ╳
            </button>
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
