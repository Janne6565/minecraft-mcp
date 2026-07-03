import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ModelKey, EffortKey } from '@/lib/houseData';

interface ShowcaseState {
  readonly selectedId: string | null;
  readonly modelFilter: ModelKey | 'all';
  readonly effortFilter: EffortKey | 'all';
}

const initialState: ShowcaseState = {
  selectedId: null,
  modelFilter: 'all',
  effortFilter: 'all',
};

export const showcaseSlice = createSlice({
  name: 'showcase',
  initialState,
  reducers: {
    selectHouse(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    clearSelection(state) {
      state.selectedId = null;
    },
    setModelFilter(state, action: PayloadAction<ModelKey | 'all'>) {
      state.modelFilter = action.payload;
    },
    setEffortFilter(state, action: PayloadAction<EffortKey | 'all'>) {
      state.effortFilter = action.payload;
    },
    /** Reset filters and clear any open build when a benchmark route is (re)entered. */
    resetTestView(state) {
      state.modelFilter = 'all';
      state.effortFilter = 'all';
      state.selectedId = null;
    },
  },
});

export const {
  selectHouse, clearSelection, setModelFilter, setEffortFilter, resetTestView,
} = showcaseSlice.actions;
