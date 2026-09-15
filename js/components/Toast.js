let container = null;

function ensureContainer() {
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-stack";
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = "info", duration = 3200) {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  ensureContainer().appendChild(el);

  requestAnimationFrame(() => el.classList.add("show"));

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, duration);
}
