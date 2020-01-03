import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RightPanel } from './components/RightPanel';
import { MainZone } from './components/MainZone';

import './App.css';

const createEditorsIds = n => Array(n).fill(0).map((_, i) => `editor-${i}`);

const App = () => {
  const dispatch = useDispatch();
  const editorIds = useSelector(state => state.app.editorIds);
  const selectedEditorId = useSelector(state => state.ui.selectedEditorId);

  // init
  useEffect(() => {
    dispatch({type: 'ADD_EDITORS', payload: { ids: createEditorsIds(20) }});
  }, [dispatch]);

  return (
    <div className="App">
      <MainZone editorIds={editorIds} selectedEditorId={selectedEditorId} />
      <RightPanel selectedEditorId={selectedEditorId} />
    </div>
  );
}

export default App;
