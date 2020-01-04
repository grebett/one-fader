import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RightPanel } from './components/RightPanel';
import { MainZone } from './components/MainZone';

import './App.css';

const createEditorsIds = n => Array(n).fill(0).map((_, i) => `editor-${i}`);

const App = () => {
  const dispatch = useDispatch();
  const curveEditors = useSelector(state => state.app.curveEditors);
  const selectedEditorId = useSelector(state => state.app.selectedEditor);

  // init
  useEffect(() => {
    dispatch({type: 'INIT_CURVE_EDITORS', payload: { ids: createEditorsIds(20) }});
  }, [dispatch]);

  return (
    <div className="App">
      <MainZone curveEditors={curveEditors} selectedEditorId={selectedEditorId} />
      <RightPanel selectedEditorId={selectedEditorId} />
    </div>
  );
}

export default App;
