
const initialState = {
  editorIds: [],
};

const uiReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'ADD_EDITORS':
      return { ...state, editorIds: [...state.editorIds, ...action.payload.ids] };
    case 'REMOVE_EDITOR_IN_UI':
      const indexToRemove = state.editorIds.findIndex(storedId => storedId === action.payload.id);
      state.editorIds[indexToRemove] = null;
      return { ...state, editorIds: [...state.editorIds] };
    case 'RESTORE_EDITOR_IN_UI':
      const indexToRestore = state.editorIds.findIndex(storedId => storedId === null);
      state.editorIds[indexToRestore] = action.payload.id;
      return { ...state, editorIds: [...state.editorIds] };
    default:
      return state;
  }
};

export default uiReducer;
