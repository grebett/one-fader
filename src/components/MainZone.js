import React from 'react';
import { MIDICurveEditor } from './MIDICurveEditor';

import './MainZone.css';

const MainZone = ({ editorIds, selectedEditorId }) => {
  return (
    <div className="main-zone container">
      <h1>MainZone</h1>
      {editorIds.map((editorId, i) => {
        if (editorId) {
          return (
            <MIDICurveEditor
              key={editorId}
              name={editorId}
              layout="minimized"
              selectedEditorId={selectedEditorId}
            />
          );
        } else {
          return <div key={i} className="MIDI-curve-editor-placeholder"></div>
        }
      })}
    </div>
  );
};

export { MainZone };
