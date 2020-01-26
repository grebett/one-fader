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
      <h1>MainZone</h1>
      <div className="upload" onChange={handleFileLoad}>
        <input type="file" />
        {!curveEditors.length && <button onClick={init16Editors}>init editors</button>}
        {!!curveEditors.length && <button onClick={closePage}>reset editors</button>}
        {!!curveEditors.length && <button onClick={() => window.dump()}>save editors</button>}
      </div>
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
