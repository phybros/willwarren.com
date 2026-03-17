// Mobile menu toggle
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", menu.classList.contains("open"));
    });
  }

  // Appearance switcher
  var switcher = document.getElementById("appearance-switcher");
  if (switcher) {
    switcher.addEventListener("click", function () {
      document.documentElement.classList.toggle("light");
      var isLight = document.documentElement.classList.contains("light");
      localStorage.setItem("appearance", isLight ? "light" : "dark");
    });
  }

  // Scroll to top
  var scrollBtn = document.getElementById("scroll-to-top");
  var footer = document.querySelector(".site-footer");
  if (scrollBtn) {
    var btnGap = 32; // matches CSS bottom: 2rem
    window.addEventListener("scroll", function () {
      scrollBtn.hidden = window.scrollY < 400;
      if (footer) {
        var footerVisible = window.innerHeight - footer.getBoundingClientRect().top;
        if (footerVisible > 0) {
          scrollBtn.style.bottom = footerVisible + btnGap + "px";
        } else {
          scrollBtn.style.bottom = "";
        }
      }
    });
    scrollBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Reading progress bar
  var progressBar = document.getElementById("reading-progress");
  if (progressBar) {
    window.addEventListener("scroll", function () {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        progressBar.style.width = (window.scrollY / docHeight) * 100 + "%";
      }
    });
  }

  // ToC active heading highlight
  var tocSidebar = document.querySelector(".toc-sidebar");
  if (tocSidebar) {
    var tocLinks = tocSidebar.querySelectorAll("a");
    var headingIds = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute("href");
      if (id && id.startsWith("#")) {
        headingIds.push(id.substring(1));
      }
    });

    if (headingIds.length > 0) {
      var headings = [];
      headingIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) headings.push(el);
      });

      var ticking = false;
      var offset = 100;

      function updateActiveHeading() {
        var current = null;
        headings.forEach(function (heading) {
          if (heading.getBoundingClientRect().top <= offset) {
            current = heading;
          }
        });

        tocLinks.forEach(function (link) {
          link.classList.remove("active");
        });

        if (current) {
          var active = tocSidebar.querySelector('a[href="#' + current.id + '"]');
          if (active) active.classList.add("active");
        }
      }

      window.addEventListener("scroll", function () {
        if (!ticking) {
          requestAnimationFrame(function () {
            updateActiveHeading();
            ticking = false;
          });
          ticking = true;
        }
      });

      updateActiveHeading();
    }
  }
});
