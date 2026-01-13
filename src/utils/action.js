export const reDiscount = (state = 0, action) => {
  switch (action.type) {
    case "SET_DISCOUNT":
      return action.p;
    default:
      return state;
  }
};

export const acDiscount = (type, p) => ({ type, p });