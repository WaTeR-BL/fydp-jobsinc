import { createSlice } from '@reduxjs/toolkit';

interface CommonState {
  common_loading: boolean;
  user: Record<string, any> | null;
  delete_loading: boolean;
  detail_loading: boolean;
  update_loading: boolean;
}

const initialState: CommonState = {
  common_loading: false,
  user: null,
  delete_loading: false,
  detail_loading: false,
  update_loading: false,
};

export const commonSlice = createSlice({
  name: 'common',
  initialState,
  reducers: {
    setCommonLoading: (state, action) => {
      state.common_loading = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
    setDeleteLoading: (state, action) => {
      state.delete_loading = action.payload;
    },
    setDetailLoading: (state, action) => {
      state.detail_loading = action.payload;
    },
    setUpdateLoading: (state, action) => {
      state.update_loading = action.payload;
    },
  },
});

export const {
  setCommonLoading,
  setUser,
  clearUser,
  setDeleteLoading,
  setDetailLoading,
  setUpdateLoading,
} = commonSlice.actions;

export default commonSlice.reducer;
