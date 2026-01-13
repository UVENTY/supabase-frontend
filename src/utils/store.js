import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { reTimer } from "./timer";
import { reDiscount } from "./action";

export const store = configureStore({
  reducer: combineReducers({
    time: reTimer,
    discount: reDiscount,
  }),
});
