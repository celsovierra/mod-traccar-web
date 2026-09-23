import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'calendars',
  initialState: {
    items: {},
  },
  reducers: {
    refresh(state, action) {
      state.items = {};
      Object.values(action.payload || {}).forEach((item) => (state.items[item.id] = item));
    },
  },
});

export { actions as calendarsActions };
export { reducer as calendarsReducer };
