import { subscribeReport, mergeNames } from "../services/reportService.js";
import { showToast } from "./Toast.js";

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function renderReportView(container) {
  container.innerHTML = `
    <h2>Attendance report</h2>
    <div class="subtitle" id="reportSubtitle">Loading…</div>

    <div class="panel">
      <div class="panel-header">
        <h3>By name</h3>
        <button class="btn small danger" id="mergeBtn" disabled>Merge selected (2)</button>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th class="checkbox-cell"></th>
            <th>Name</th>
            <th>Sessions attended</th>
          </tr>
        </thead>
        <tbody id="reportBody">
          <tr><td colspan="3" class="empty-state">Loading…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const reportSubtitle = container.querySelector("#reportSubtitle");
  const reportBody = container.querySelector("#reportBody");
  const mergeBtn = container.querySelector("#mergeBtn");

  let selected = [];

  function updateMergeBtn() {
    mergeBtn.disabled = selected.length !== 2;
  }

  mergeBtn.addEventListener("click", async () => {
    if (selected.length !== 2) return;
    const [a, b] = selected;
    const canonical = prompt(
      `Merge "${a.name}" and "${b.name}" into one name.\nType the correct name to use:`,
      a.name
    );
    if (!canonical) return;
    const canonicalTrim = canonical.trim();
    if (!canonicalTrim) return;

    mergeBtn.disabled = true;
    mergeBtn.innerHTML = `<span class="spinner"></span>`;
    try {
      await mergeNames(a.key, b.key, canonicalTrim);
      showToast("Names merged", "success");
      selected = [];
    } catch (err) {
      showToast("Couldn't merge — try again", "error");
    } finally {
      mergeBtn.textContent = "Merge selected (2)";
      updateMergeBtn();
    }
  });

  const unsubscribe = subscribeReport(
    ({ totalSessions, rows }) => {
      reportSubtitle.textContent = `Across ${totalSessions} session${totalSessions === 1 ? "" : "s"}`;

      if (!rows.length) {
        reportBody.innerHTML = `<tr><td colspan="3" class="empty-state">No check-ins recorded yet.</td></tr>`;
        return;
      }

      // preserve current checkbox selection across live updates
      const selectedKeys = new Set(selected.map((s) => s.key));

      reportBody.innerHTML = rows.map((r) => `
        <tr class="fade-in-row">
          <td class="checkbox-cell">
            <input type="checkbox" data-key="${r.key}" data-name="${escapeHtml(r.name)}" ${selectedKeys.has(r.key) ? "checked" : ""} />
          </td>
          <td>${escapeHtml(r.name)}</td>
          <td class="attend-count">${r.count} / ${totalSessions}</td>
        </tr>
      `).join("");

      reportBody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener("change", () => {
          const key = cb.dataset.key;
          if (cb.checked) {
            if (selected.length >= 2) { cb.checked = false; return; }
            selected.push({ key, name: cb.dataset.name });
          } else {
            selected = selected.filter((s) => s.key !== key);
          }
          updateMergeBtn();
        });
      });
    },
    () => showToast("Couldn't load report", "error")
  );

  return unsubscribe;
}
