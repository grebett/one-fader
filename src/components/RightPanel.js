import React from 'react';
import { useDispatch } from 'react-redux';

import { MIDICurveEditor } from './MIDICurveEditor';

import './RightPanel.css';

const RightPanel = ({ selectedEditorId }) => {
  const dispatch = useDispatch();
  const unselectEditor = () => {
    dispatch({ type: 'UNSELECT_EDITOR', payload: {id: selectedEditorId} });
    dispatch({ type: 'RESTORE_EDITOR_IN_UI', payload: {id: selectedEditorId} });
  };

  return <div className="right-panel container">
    <h1>RightPanel</h1>
    {selectedEditorId && (
      <>
        <button onClick={unselectEditor}>Close</button>
        <MIDICurveEditor name={selectedEditorId} layout="maximized" />
      </>
    )}
  </div>
};

export { RightPanel };
