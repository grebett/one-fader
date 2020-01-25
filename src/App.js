import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RightPanel } from './components/RightPanel';
import { MainZone } from './components/MainZone';
import { MIDIHandler } from './components/MIDIHandler';

import './App.css';

const createEditorsIds = n => Array(n).fill(0).map((_, i) => `editor-${i}`);

const bindStoreToMIDIHandler = MIDIHandler();

const App = ({ store }) => {
  const dispatch = useDispatch();
  const curveEditors = useSelector(state => state.app.curveEditors);
  const selectedEditorId = useSelector(state => state.app.selectedEditor);

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
