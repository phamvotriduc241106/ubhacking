/** Print only a clone of the report, leaving the interactive page out of pagination. */
export function printReport(report: Element | null): void {
  if (!report) return;
  document.getElementById("folland-print-root")?.remove();
  const root = document.createElement("div");
  root.id = "folland-print-root";
  root.appendChild(report.cloneNode(true));
  document.body.appendChild(root);
  const cleanup = () => { root.remove(); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  try { window.print(); } catch (error) { cleanup(); throw error; }
}
