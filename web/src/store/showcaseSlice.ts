import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ModelKey, EffortKey, TestKey } from '@/lib/houseData';

interface ShowcaseState {
  /** Which benchmark test is open, or null for the benchmark home. */
  readonly testId: TestKey | null;
  readonly selectedId: string | null;
  readonly modelFilter: ModelKey | 'all';
  readonly effortFilter: EffortKey | 'all';
}

const initialState: ShowcaseState = {
  testId: null,
  selectedId: null,
  modelFilter: 'all',
  effortFilter: 'all',
};

export const showcaseSlice = createSlice({
  name: 'showcase',
  initialState,
  reducers: {
    openTest(state, action: PayloadAction<TestKey>) {
      state.testId = action.payload;
      state.selectedId = null;
      state.modelFilter = 'all';
      state.effortFilter = 'all';
    },
    goHome(state) {
      state.testId = null;
      state.selectedId = null;
    },
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
  },
});

export const {
  openTest, goHome, selectHouse, clearSelection, setModelFilter, setEffortFilter,
} = showcaseSlice.actions;
