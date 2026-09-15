import { createStore } from "./state/store.js";
import { watchAuth } from "./services/authService.js";
import { renderLogin } from "./components/LoginView.js";
import { renderSidebar } from "./components/Sidebar.js";
import { renderSessionsView } from "./components/SessionsView.js";
import { renderReportView } from "./components/ReportView.js";

const store = createStore({ user: undefined, view: "sessions" });
const root = document.getElementById("app");

let sidebarCleanup = null;
let viewCleanup = null;
let lastRenderedView = null;

function renderCurrentView() {
  const mainEl = document.getElementById("mainView");
  if (!mainEl) return;

  if (viewCleanup) viewCleanup();

  // restart the fade-in animation on every view switch
  mainEl.classList.remove("fade-in");
  void mainEl.offsetWidth;
  mainEl.classList.add("fade-in");

  const { view } = store.getState();
  viewCleanup = view === "report" ? renderReportView(mainEl) : renderSessionsView(mainEl);
  lastRenderedView = view;
}

function mountDashboard() {
  root.innerHTML = `
    <div class="admin-shell">
      <div class="sidebar" id="sidebar"></div>
      <div class="main fade-in" id="mainView"></div>
    </div>
  `;
  sidebarCleanup = renderSidebar(document.getElementById("sidebar"), store);
  renderCurrentView();

  store.subscribe((state) => {
    if (state.view !== lastRenderedView) renderCurrentView();
  });
}

function mountLogin() {
  root.innerHTML = "";
  renderLogin(root);
}

function teardownDashboard() {
  if (viewCleanup) { viewCleanup(); viewCleanup = null; }
  if (sidebarCleanup) { sidebarCleanup(); sidebarCleanup = null; }
  lastRenderedView = null;
}

watchAuth((user) => {
  store.setState({ user });
  if (user) {
    mountDashboard();
  } else {
    teardownDashboard();
    mountLogin();
  }
});
