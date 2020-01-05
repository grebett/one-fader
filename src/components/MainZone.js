import React from 'react';
import { MIDICurveEditor } from './MIDICurveEditor';

import './MainZone.css';

const MainZone = ({ curveEditors, selectedEditorId }) => {
  return (
    <div className="main-zone container">
      <h1>MainZone</h1>
      {curveEditors.map((editor, i) => {
        const isSelected = selectedEditorId === editor.id;
        const className = isSelected ? 'MIDI-curve-editor-placeholder' : 'MIDI-curve-editor-container';
        return (
          <div key={`midi-curve-editor-wrapper-${i}`} className={className}>
            <MIDICurveEditor
              key={editor.id}
              name={editor.id}
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
