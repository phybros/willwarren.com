// Runs blocking in <head> to prevent flash of wrong theme
(function () {
  var stored = localStorage.getItem("appearance");
  var auto = document.documentElement.dataset.autoAppearance === "true";
  var defaultAppearance = document.documentElement.dataset.defaultAppearance || "dark";

  var appearance = defaultAppearance;
  if (stored) {
    appearance = stored;
  } else if (auto && window.matchMedia("(prefers-color-scheme: light)").matches) {
    appearance = "light";
  } else if (auto && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    appearance = "dark";
  }

  if (appearance === "light") {
    document.documentElement.classList.add("light");
  }
})();
