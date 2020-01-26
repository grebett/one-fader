import React from 'react';
import { MIDICurveEditor } from './MIDICurveEditor';
import { useDispatch } from 'react-redux';
import shortid from 'shortid';

import './MainZone.css';

const MainZone = ({ curveEditors, selectedEditorId }) => {
  const dispatch = useDispatch();

  const onFileLoaded = e => {
    const data = JSON.parse(e.target.result);
    dispatch({ type: 'RESET_STATE' });
    localStorage.clear();
    Object.entries(data.storage).forEach(([key, value]) => localStorage.setItem(key, value));
    const newState = data;
    delete newState.storage;
    dispatch({ type: 'INIT_STATE', payload: { state: newState } });
  };

  const closePage = () => {
    dispatch({ type: 'RESET_STATE' });
    localStorage.clear();
  };

  const handleFileLoad = e => {
    const selectedFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = onFileLoaded;
    reader.readAsText(selectedFile);
  };

  const init16Editors = () => {
    const createEditorsIds = n =>
      Array(n)
        .fill(0)
        .map(() => shortid.generate());
    dispatch({ type: 'INIT_CURVE_EDITORS', payload: { ids: createEditorsIds(16) } });
  };

  return (
    <div className="main-zone container">
      <h1>One Fader – by grebett</h1>
      {!selectedEditorId && (
        <>
          <fieldset>
            <legend>Actions</legend>
            <label htmlFor="upload">
              <i class="fas fa-upload"></i> Load Editors
            </label>
            <input
              type="file"
              id="upload"
              className="upload"
              onChange={handleFileLoad}
              style={{ display: 'none' }}
            />
            {!curveEditors.length && (
              <button onClick={init16Editors}>
                <i className="fas fa-plus-square"></i>Initialize editors
              </button>
            )}
            {!!curveEditors.length && (
              <button onClick={closePage}>
                <i className="fas fa-redo-alt"></i>Reset editors
              </button>
            )}
            {!!curveEditors.length && (
              <button onClick={() => window.dump()}>
                <i className="fas fa-save"></i>Save editors
              </button>
            )}
          </fieldset>
        </>
      )}
      {selectedEditorId && <div className="padding"></div>}
      {curveEditors.map((editor, i) => {
        const isSelected = selectedEditorId === editor.id;
        const className = isSelected ? 'MIDI-curve-editor-placeholder' : 'MIDI-curve-editor-container';
        return (
          <div key={`midi-curve-editor-wrapper-${i}`} className={className}>
            <MIDICurveEditor
              key={editor.id}
              id={editor.id}
              name={editor.displayName}
              layout="minimized"
              isSelected={isSelected}
              selectedEditorId={selectedEditorId}
            />
          </div>
        );
      })}
    </div>
  );
};

export { MainZone };
