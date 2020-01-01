import { combineReducers } from 'redux';
import uiReducer from './uiReducer';
import appReducer from './appReducer';

export default combineReducers({
  ui: uiReducer,
  app: appReducer,
});
