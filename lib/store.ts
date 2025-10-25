import { configureStore } from '@reduxjs/toolkit';
import keyManagementReducer from './keyManagementSlice';

export const store = configureStore({
  reducer: {
    keyManagement: keyManagementReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
