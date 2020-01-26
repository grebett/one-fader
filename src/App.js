import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RightPanel } from './components/RightPanel';
import { MainZone } from './components/MainZone';
import { MIDIHandler } from './components/MIDIHandler';

import './App.css';

const createEditorsIds = n => Array(n).fill(0).map((_, i) => `editor-${i}`);

const bindStoreToMIDIHandler = MIDIHandler();

const sanitize = editors => {
  return editors.map(editor => {
    delete editor.widget;
    return editor;
  });
};

const createTextFileAndDownload = (filename, text) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const App = ({ store }) => {
  const dispatch = useDispatch();
  const curveEditors = useSelector(state => state.app.curveEditors);
  const selectedEditorId = useSelector(state => state.app.selectedEditor);

  window.dump = () => {
    const state = store.getState().app;
    state.storage = {};
    for (let i = 0, key = null; !!(key = localStorage.key(i)); i++) {
      state.storage[key] = localStorage[key];
    }
    const data = JSON.stringify({...state, curveEditors: sanitize(state.curveEditors)}, null, 2);
    createTextFileAndDownload('editors.json', data);
  };

  // init
  useEffect(() => {
    dispatch({type: 'INIT_CURVE_EDITORS', payload: { ids: createEditorsIds(16) }});
    bindStoreToMIDIHandler(store);
  }, [dispatch, store]);

  return (
    <div className="App">
      <MainZone curveEditors={curveEditors} selectedEditorId={selectedEditorId} />
      <RightPanel selectedEditorId={selectedEditorId} />
    </div>
  );
}

export default App;
