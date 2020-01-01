const initialState = {
  selectedEditorId: null,
};

const uiReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SELECT_EDITOR':
      return { ...state, selectedEditorId: action.payload.id };
    case 'UNSELECT_EDITOR':
      return { ...state, selectedEditorId: null };
    default:
      return state;
  }
};

export default uiReducer;
