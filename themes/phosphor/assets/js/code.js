// Add copy buttons to code blocks (both .highlight-wrapped and bare pre)
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".highlight pre, .prose > pre").forEach(function (pre) {
    // Skip if already has a copy button (e.g. highlight pre inside prose)
    if (pre.querySelector(".copy-btn")) return;
    var highlight = pre.closest(".highlight");
    if (highlight && highlight.querySelector(".copy-btn")) return;
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code");
      var text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () {
          btn.textContent = "Copy";
        }, 2000);
      });
    });
    if (highlight) {
      highlight.appendChild(btn);
    } else {
      // Wrap bare pre in a container so the copy button stays fixed on scroll
      var wrapper = document.createElement("div");
      wrapper.className = "highlight";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    }
  });
});
