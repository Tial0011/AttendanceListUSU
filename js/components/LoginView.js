import { login } from "../services/authService.js";
import { showToast } from "./Toast.js";

export function renderLogin(container) {
  container.innerHTML = `
    <div class="login-wrap fade-in">
      <div class="login-card">
        <h2>Admin sign in</h2>
        <form id="loginForm">
          <input type="email" id="loginEmail" placeholder="Email" autocomplete="username" required />
          <input type="password" id="loginPassword" placeholder="Password" autocomplete="current-password" required />
          <button type="submit" class="btn primary" id="loginSubmit" style="width:100%;">Sign in</button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector("#loginForm");
  const submitBtn = container.querySelector("#loginSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#loginEmail").value.trim();
    const password = container.querySelector("#loginPassword").value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Signing in…`;

    try {
      await login(email, password);
      // onAuthStateChanged in app.js takes it from here
    } catch (err) {
      showToast("Couldn't sign in — check your email and password.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
}
