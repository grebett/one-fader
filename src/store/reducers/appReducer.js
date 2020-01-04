const initialState = {
  curveEditors: [],
  selectedEditor: null,
  page: 0,
  tempo: 60,
  cursor: 0,
};

const appReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'INIT_CURVE_EDITORS': {
      const { ids } = action.payload;
      const curveEditors = ids.map(id => ({
        id,
        midiValue: 0,
        instrument: 1,
        channel: 1,
        cc: 1,
        boundaries: [0, 127],
        duration: null,
      }));
      return { ...state, curveEditors };
    }
    case 'ATTACH_WIDGET_TO_EDITOR':
    case 'UPDATE_CURVE_EDITOR_PARAMETERS': {
      const { id, parameters, widget } = action.payload;
      const index = state.curveEditors.findIndex(editor => editor.id === id);
      if (index === -1) {
        console.warn(`Editor ${id} has not been found in curve editors list:`, state.curveEditors);
        return state;
      }
      const updatedEditor = { ...state.curveEditors[index], ...parameters };
      if (widget) {
        updatedEditor.widget = widget;
      }
      const updatedCurveEditorsList = [
        ...state.curveEditors.slice(0, index),
        updatedEditor,
        ...state.curveEditors.slice(index + 1),
      ];
      return { ...state, curveEditors: updatedCurveEditorsList };
    }
    case 'SELECT_CURVE_EDITOR':
      const { id } = action.payload;
      return { ...state, selectedEditor: id };
    case 'UNSELECT_CURVE_EDITOR':
      return { ...state, selectedEditor: null };
    case 'SET_PAGE':
      const { page } = action.payload;
      return { ...state, page };
    case 'SET_GLOBAL_TEMPO':
      const { tempo } = action.payload;
      return { ...state, tempo };
    case 'UPDATE_GLOBAL_CURSOR_POSITION':
      const { cursor } = action.payload;
      return { ...state, cursor }
    default:
      return state;
  }
};

export default appReducer;
