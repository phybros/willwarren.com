// Zero-dependency lightbox for article images
(function () {
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Enlarged image");

  const img = document.createElement("img");
  img.className = "lightbox-img";
  overlay.appendChild(img);

  document.body.appendChild(overlay);

  function close() {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  function isOpen() {
    return overlay.classList.contains("active");
  }

  overlay.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) close();
  });

  // Attach to all images inside article prose
  document.querySelectorAll(".prose img").forEach(function (el) {
    el.style.cursor = "zoom-in";
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      img.src = el.src;
      img.alt = el.alt || "";
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  });
})();
