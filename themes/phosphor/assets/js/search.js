// Search modal with Fuse.js
(function () {
  var fuse = null;
  var searchIndex = null;
  var modal = document.getElementById("search-modal");
  var input = document.getElementById("search-input");
  var results = document.getElementById("search-results");

  function openSearch() {
    if (!modal) return;
    modal.classList.add("open");
    input.value = "";
    results.innerHTML = "";
    input.focus();
    loadIndex();
  }

  function closeSearch() {
    if (!modal) return;
    modal.classList.remove("open");
  }

  function loadIndex() {
    if (fuse) return;
    fetch("/index.json")
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        searchIndex = data;
        fuse = new Fuse(searchIndex, {
          keys: ["title", "content", "summary"],
          includeMatches: true,
          threshold: 0.3,
          minMatchCharLength: 2,
        });
      })
      .catch(function (e) {
        console.error("Failed to load search index:", e);
      });
  }

  function doSearch(query) {
    if (!fuse || !query) {
      results.innerHTML = "";
      return;
    }
    var hits = fuse.search(query).slice(0, 10);
    if (hits.length === 0) {
      results.innerHTML = '<p class="search-no-results">No results found.</p>';
      return;
    }
    results.innerHTML = hits
      .map(function (h) {
        var item = h.item;
        return (
          '<a class="search-result" href="' +
          item.permalink +
          '"><span class="search-result-title">' +
          escapeHtml(item.title) +
          "</span>" +
          (item.summary
            ? '<span class="search-result-summary">' +
              escapeHtml(item.summary) +
              "</span>"
            : "") +
          "</a>"
        );
      })
      .join("");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  if (input) {
    input.addEventListener("input", function () {
      doSearch(this.value);
    });
  }

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeSearch();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      var tag = document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      openSearch();
    }
    if (e.key === "Escape") closeSearch();
  });

  // Expose for buttons
  window.openSearch = openSearch;
})();
