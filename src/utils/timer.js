export const reTimer = (state = 0, action) => {
  switch (action.type) {
    case "SET_TIMER":
      return action.p;
    default:
      return state;
  }
};

export const acTimer = (p) => ({ type: "SET_TIMER", p });