export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState: () => state,
    setState(patch) {
      state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
