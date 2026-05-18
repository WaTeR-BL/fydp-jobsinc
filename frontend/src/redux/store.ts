import { configureStore, combineReducers } from '@reduxjs/toolkit';
import storageDefault from 'redux-persist/lib/storage';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi as api } from '@/redux/api';
import { commonReducer, notificationReducer } from '@/redux/slices';

const createNoopStorage = () => {
  return {
    getItem: () => Promise.resolve(null),
    setItem: (value: string) => Promise.resolve(value),
    removeItem: () => Promise.resolve(),
  };
};

const storage = typeof window === 'undefined' ? (createNoopStorage() as any) : storageDefault;

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['common'],
};

const rootReducer = combineReducers({
  common: commonReducer,
  notification: notificationReducer,
  [api.reducerPath]: api.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(api.middleware as any),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export let persistor: any;
if (typeof window !== 'undefined') {
  persistor = persistStore(store);
}

setupListeners(store.dispatch);

export default store;
