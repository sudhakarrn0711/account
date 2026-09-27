// Final bootstrap: all feature files are loaded before this runs.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => loadBusinesses(), { once: true });
} else {
  loadBusinesses();
}
