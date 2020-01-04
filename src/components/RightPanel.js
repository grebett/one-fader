import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import './RightPanel.css';

const RightPanel = ({ selectedEditorId }) => {
  const dispatch = useDispatch();
  const selectedWidget = useSelector(state => state.app.curveEditors.find(editor => editor.id === selectedEditorId));

  const unselectEditor = () => {
    dispatch({ type: 'UNSELECT_CURVE_EDITOR', payload: {id: selectedEditorId} });
    selectedWidget.widget.minimize();
  };

  return <div className="right-panel container">
    <h1>RightPanel</h1>
    {selectedEditorId && (
      <>
        <button onClick={unselectEditor}>Close</button>
      </>
    )}
  </div>
};

export { RightPanel };
