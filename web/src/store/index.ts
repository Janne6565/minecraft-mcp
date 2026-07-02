import { configureStore } from '@reduxjs/toolkit';
import { showcaseSlice } from './showcaseSlice';

export const store = configureStore({
  reducer: { showcase: showcaseSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
