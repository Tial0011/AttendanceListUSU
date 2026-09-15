import { logout } from "../services/authService.js";

export function renderSidebar(container, store) {
  container.innerHTML = `
    <div class="brand">UNIMEDSU</div>
    <div class="brand-sub">Graphics Design · 14-Day Class</div>
    <button class="nav-item" data-view="sessions">Sessions</button>
    <button class="nav-item" data-view="report">Attendance report</button>
    <button class="logout" id="logoutBtn">Sign out</button>
  `;

  const buttons = container.querySelectorAll(".nav-item");

  function sync(state) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
  }

  buttons.forEach((b) => {
    b.addEventListener("click", () => store.setState({ view: b.dataset.view }));
  });

  container.querySelector("#logoutBtn").addEventListener("click", () => logout());

  const unsubscribe = store.subscribe(sync);
  sync(store.getState());

  return unsubscribe;
}
