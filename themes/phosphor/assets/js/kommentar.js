(function () {
  "use strict";

  // --- Auth callback handler (absorbs auth-callback.js) ---
  // Runs first: if Cognito redirected here with a hash fragment, store the
  // token and redirect back before building any DOM.

  var h = window.location.hash;
  if (h && (h.indexOf("id_token=") !== -1 || h.indexOf("error=") !== -1)) {
    var params = {};
    h.substring(1).split("&").forEach(function (p) {
      var kv = p.split("=");
      params[kv[0]] = decodeURIComponent(kv[1] || "");
    });
    if (params.id_token) {
      sessionStorage.setItem("kommentar_id_token", params.id_token);
    }
    if (params.error) {
      console.warn("Kommentar auth error:", params.error, params.error_description || "");
    }
    var returnUrl = sessionStorage.getItem("kommentar_return_url");
    if (returnUrl) {
      sessionStorage.removeItem("kommentar_return_url");
      window.location.replace(returnUrl.replace(/#.*$/, "") + "#kommentar");
      return; // stop execution — page is redirecting
    }
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  // --- DOM helper ---

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") {
          node.className = attrs[k];
        } else if (k === "textContent") {
          node.textContent = attrs[k];
        } else if (k.indexOf("on") === 0) {
          node.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children != null) {
      if (typeof children === "string") {
        node.textContent = children;
      } else if (Array.isArray(children)) {
        children.forEach(function (child) {
          if (child) node.appendChild(child);
        });
      } else {
        node.appendChild(children);
      }
    }
    return node;
  }

  // --- Boot: find container and read config ---

  var container = document.getElementById("kommentar");
  if (!container) return;

  var apiUrl = container.getAttribute("data-api-url") || "";
  var bucketUrl = container.getAttribute("data-bucket-url") || "";
  var collapsible = container.hasAttribute("data-collapsible");
  var cognitoDomain = container.getAttribute("data-cognito-domain") || "";
  var cognitoClientId = container.getAttribute("data-cognito-client-id") || "";
  var cognitoRedirectUri = window.location.origin;
  var formMessage = container.getAttribute("data-form-message") || "";

  // Slug: explicit attribute, or derive from pathname
  var slug = container.getAttribute("data-slug");
  if (!slug) {
    var path = window.location.pathname.replace(/\/+$/, "");
    slug = path.substring(path.lastIndexOf("/") + 1) || "index";
  }

  // --- Auth state ---

  var authToken = sessionStorage.getItem("kommentar_id_token");
  var authUser = null;

  function decodeTokenPayload(token) {
    try {
      var parts = token.split(".");
      return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch (e) {
      return null;
    }
  }

  function cognitoLoginUrl(provider) {
    return "https://" + cognitoDomain + "/oauth2/authorize" +
      "?response_type=token" +
      "&client_id=" + encodeURIComponent(cognitoClientId) +
      "&redirect_uri=" + encodeURIComponent(cognitoRedirectUri) +
      "&scope=openid+email+profile" +
      "&identity_provider=" + encodeURIComponent(provider);
  }

  function logOut() {
    sessionStorage.removeItem("kommentar_id_token");
    authToken = null;
    authUser = null;
    renderAuthBar();
    updateAuthorFieldVisibility();
  }

  function initAuth() {
    authToken = sessionStorage.getItem("kommentar_id_token");
    if (authToken) {
      var payload = decodeTokenPayload(authToken);
      if (payload) {
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          logOut();
          return;
        }
        var provider = null;
        if (payload.identities && payload.identities.length) {
          provider = payload.identities[0].providerName || null;
        }
        authUser = {
          name: payload.name || (payload.email ? payload.email.split("@")[0] : "User"),
          provider: provider
        };
      } else {
        logOut();
      }
    }
  }

  // --- Widget DOM references (set during buildWidget) ---

  var commentsList, authBar, mainForm, formWrapper, authorGroup;

  // --- Comment rendering ---

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  }

  function buildComment(comment) {
    var classes = "kommentar-comment";
    if (comment.owner) classes += " kommentar-owner";
    else if (comment.verified) classes += " kommentar-verified";

    var headerChildren = [
      el("span", { className: "kommentar-author" }, comment.author)
    ];

    if (comment.owner) {
      headerChildren.push(el("span", {
        className: "kommentar-badge kommentar-owner-badge",
        title: "Site owner"
      }, "Author"));
    } else if (comment.verified) {
      var providerLabel = comment.auth_provider
        ? comment.auth_provider.charAt(0).toUpperCase() + comment.auth_provider.slice(1)
        : "verified";
      headerChildren.push(el("span", {
        className: "kommentar-badge kommentar-verified-badge",
        title: "Verified via " + providerLabel
      }, "\u2713"));
    }

    var dateStr = comment.date || comment.timestamp;
    headerChildren.push(el("time", {
      className: "kommentar-time",
      datetime: dateStr
    }, formatDate(dateStr)));

    var bodyDiv = el("div", { className: "kommentar-body" });
    comment.body.split(/\n{2,}/).forEach(function (para) {
      var p = el("p");
      para.split("\n").forEach(function (line, i) {
        if (i > 0) p.appendChild(document.createElement("br"));
        p.appendChild(document.createTextNode(line));
      });
      bodyDiv.appendChild(p);
    });

    var replyBtn = el("button", {
      className: "kommentar-reply-btn",
      "data-comment-id": comment.id,
      "data-parent-id": comment.id
    }, "Reply");

    return el("article", { className: classes, id: "comment-" + comment.id }, [
      el("header", { className: "kommentar-header" }, headerChildren),
      bodyDiv,
      el("footer", { className: "kommentar-footer" }, [replyBtn])
    ]);
  }

  // --- Comment loading ---

  function loadComments() {
    if (!slug || !bucketUrl) return;

    fetch(bucketUrl + "/" + encodeURIComponent(slug) + ".json")
      .then(function (res) {
        if (res.ok) return res.json();
        if (res.status === 403 || res.status === 404) return null;
        throw new Error("HTTP " + res.status);
      })
      .then(function (data) {
        var comments = Array.isArray(data) ? data : data && data.comments;
        if (!comments || comments.length === 0) {
          commentsList.appendChild(el("p", { className: "kommentar-empty" }, "No comments yet."));
          return;
        }

        var byId = {};
        comments.forEach(function (c) { byId[c.id] = c; });

        function findRoot(c) {
          var cur = c;
          var seen = {};
          while (cur.parent_id && byId[cur.parent_id] && !seen[cur.parent_id]) {
            seen[cur.parent_id] = true;
            cur = byId[cur.parent_id];
          }
          return cur;
        }

        var topLevel = [];
        var repliesByRoot = {};
        comments.forEach(function (c) {
          if (!c.parent_id) {
            topLevel.push(c);
          } else {
            var root = findRoot(c);
            if (root === c) {
              topLevel.push(c);
            } else {
              if (!repliesByRoot[root.id]) repliesByRoot[root.id] = [];
              repliesByRoot[root.id].push(c);
            }
          }
        });

        function threadOrder(rootId, replies) {
          var childrenOf = {};
          replies.forEach(function (r) {
            var pid = r.parent_id;
            if (!childrenOf[pid]) childrenOf[pid] = [];
            childrenOf[pid].push(r);
          });
          Object.keys(childrenOf).forEach(function (pid) {
            childrenOf[pid].sort(function (a, b) {
              return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
            });
          });
          var ordered = [];
          (function visit(parentId) {
            var children = childrenOf[parentId];
            if (!children) return;
            children.forEach(function (child) {
              ordered.push(child);
              visit(child.id);
            });
          })(rootId);
          return ordered;
        }

        topLevel.forEach(function (c) {
          commentsList.appendChild(buildComment(c));
          var replies = repliesByRoot[c.id];
          if (replies && replies.length) {
            var repliesContainer = el("div", { className: "kommentar-replies" });
            threadOrder(c.id, replies).forEach(function (r) {
              repliesContainer.appendChild(buildComment(r));
            });
            commentsList.appendChild(repliesContainer);
          }
        });
      })
      .catch(function () {
        commentsList.appendChild(el("p", { className: "kommentar-error" }, "Comments unavailable."));
      });
  }

  // --- Form busy state ---

  function setFormBusy(form, busy) {
    var fields = form.querySelectorAll("input, textarea, button");
    for (var i = 0; i < fields.length; i++) {
      fields[i].disabled = busy;
    }
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) {
      btn.setAttribute("data-original-text", btn.textContent);
      btn.textContent = "Submitting\u2026";
      btn.classList.add("kommentar-loading");
    } else {
      btn.textContent = btn.getAttribute("data-original-text") || btn.textContent;
      btn.classList.remove("kommentar-loading");
    }
  }

  // --- Status message ---

  function showStatus(text) {
    var existing = container.querySelector(".kommentar-status");
    if (existing) existing.remove();
    var msg = el("p", { className: "kommentar-status" }, text);
    formWrapper.parentNode.insertBefore(msg, formWrapper.nextSibling);
    return msg;
  }

  // --- Build comment form (shared by main + reply) ---

  function buildCommentForm(opts) {
    var isReply = opts.isReply;
    var parentId = opts.parentId || null;

    var form = el("form", { className: isReply ? "kommentar-reply-form" : "kommentar-form" });

    // Auth bar
    var formAuthBar = el("div", { className: "kommentar-auth-bar" });
    if (authUser) {
      var providerLabel = authUser.provider ? " via " + authUser.provider : "";
      var prefix = isReply ? "Replying" : "Commenting";
      formAuthBar.appendChild(el("span", null, prefix + " as " + authUser.name + providerLabel + " "));
      formAuthBar.appendChild(el("button", {
        type: "button",
        className: "kommentar-logout-btn",
        textContent: "Log out",
        onClick: function () { logOut(); }
      }));
    } else if (cognitoDomain && cognitoClientId) {
      var guestLabel = isReply ? "Reply as guest, or log in: " : "Comment as guest, or log in: ";
      formAuthBar.appendChild(el("span", null, guestLabel));
      formAuthBar.appendChild(el("button", {
        type: "button",
        className: "kommentar-login-btn",
        textContent: "Sign in with Google",
        onClick: function () {
          sessionStorage.setItem("kommentar_return_url", window.location.href);
          window.location.href = cognitoLoginUrl("Google");
        }
      }));
    }
    form.appendChild(formAuthBar);

    // Parent ID (replies only)
    if (parentId) {
      form.appendChild(el("input", { type: "hidden", name: "parent_id", value: parentId }));
    }

    // Author name field (hidden when authenticated)
    var formAuthorGroup = el("div", { className: "kommentar-form-group" });
    if (authUser) {
      formAuthorGroup.style.display = "none";
    }
    var authorAttrs = {
      type: "text",
      name: "author",
      placeholder: isReply ? "Name" : "Your name",
      maxlength: "100"
    };
    if (!authUser) authorAttrs.required = "";
    if (!isReply) {
      authorAttrs.id = "kommentar-author";
      formAuthorGroup.appendChild(el("label", { for: "kommentar-author" }, "Name"));
    }
    formAuthorGroup.appendChild(el("input", authorAttrs));
    form.appendChild(formAuthorGroup);

    // Honeypot
    var honeypotAttrs = { type: "email", name: "email", tabindex: "-1", autocomplete: "off" };
    if (!isReply) honeypotAttrs.id = "kommentar-email";
    var honeypotChildren = [el("input", honeypotAttrs)];
    if (!isReply) {
      honeypotChildren.unshift(el("label", { for: "kommentar-email" }, "Email"));
    }
    form.appendChild(el("div", {
      "aria-hidden": "true",
      style: "position:absolute;left:-9999px;top:-9999px;"
    }, honeypotChildren));

    // Textarea
    var textareaGroup = el("div", { className: "kommentar-form-group" });
    var textareaAttrs = {
      name: "body",
      required: "",
      maxlength: "5000",
      rows: isReply ? "3" : "5",
      placeholder: isReply ? "Reply\u2026" : "What are your thoughts?"
    };
    if (!isReply) {
      textareaAttrs.id = "kommentar-body";
      textareaGroup.appendChild(el("label", { for: "kommentar-body" }, "Comment"));
    }
    textareaGroup.appendChild(el("textarea", textareaAttrs));
    form.appendChild(textareaGroup);

    // Form message
    if (formMessage) {
      form.appendChild(el("p", { className: "kommentar-form-message" }, formMessage));
    }

    // Submit button
    form.appendChild(el("button", {
      type: "submit",
      className: "kommentar-submit"
    }, isReply ? "Submit Reply" : "Submit Comment"));

    // Submit handler
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var authorInput = form.querySelector('input[name="author"]');
      var author = authUser ? authUser.name : authorInput.value.trim();
      var body = form.querySelector('textarea[name="body"]').value.trim();
      var email = form.querySelector('input[name="email"]').value;
      if (!author || !body) return;

      if (!isReply) showStatus("");
      setFormBusy(form, true);

      var headers = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = "Bearer " + authToken;

      var payload = { slug: slug, author: author, body: body, email: email };
      if (parentId) payload.parent_id = parentId;

      fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          if (isReply) {
            form.innerHTML = "";
            form.appendChild(el("p", { className: "kommentar-reply-success" }, "Thanks! Your reply is awaiting moderation."));
          } else {
            if (collapsible && formWrapper.removeAttribute) {
              formWrapper.removeAttribute("open");
            }
            showStatus("Thanks! Your comment is awaiting moderation.");
            form.reset();
          }
        })
        .catch(function () {
          if (isReply) {
            if (!form.querySelector(".kommentar-reply-error")) {
              form.appendChild(el("p", { className: "kommentar-reply-error" }, "Something went wrong, please try again."));
            }
          } else {
            showStatus("Something went wrong, please try again.");
          }
        })
        .finally(function () {
          setFormBusy(form, false);
        });
    });

    // Expose references for the main form so logOut() can update it
    if (!isReply) {
      authBar = formAuthBar;
      authorGroup = formAuthorGroup;
    }

    return form;
  }

  function renderAuthBar() {
    if (!authBar) return;
    authBar.innerHTML = "";

    if (authUser) {
      var providerLabel = authUser.provider ? " via " + authUser.provider : "";
      authBar.appendChild(el("span", null, "Commenting as " + authUser.name + providerLabel + " "));
      authBar.appendChild(el("button", {
        type: "button",
        className: "kommentar-logout-btn",
        textContent: "Log out",
        onClick: function () { logOut(); }
      }));
    } else if (cognitoDomain && cognitoClientId) {
      authBar.appendChild(el("span", null, "Comment as guest, or log in: "));
      authBar.appendChild(el("button", {
        type: "button",
        className: "kommentar-login-btn",
        textContent: "Sign in with Google",
        onClick: function () {
          sessionStorage.setItem("kommentar_return_url", window.location.href);
          window.location.href = cognitoLoginUrl("Google");
        }
      }));
    }
  }

  function updateAuthorFieldVisibility() {
    if (!authorGroup) return;
    if (authUser) {
      authorGroup.style.display = "none";
      var input = authorGroup.querySelector("input");
      if (input) input.removeAttribute("required");
    } else {
      authorGroup.style.display = "";
      var input2 = authorGroup.querySelector("input");
      if (input2) input2.setAttribute("required", "");
    }
  }

  // --- Build widget ---

  function buildWidget() {
    // Comments list
    commentsList = el("div", { className: "kommentar-comments-list" });

    // Reply form delegation
    commentsList.addEventListener("click", function (e) {
      var btn = e.target.closest(".kommentar-reply-btn");
      if (!btn) return;

      var commentEl = btn.closest(".kommentar-comment");
      var existing = commentEl.querySelector(".kommentar-reply-form");
      if (existing) {
        existing.remove();
        return;
      }
      var open = commentsList.querySelector(".kommentar-reply-form");
      if (open) open.remove();

      var parentId = btn.getAttribute("data-parent-id");
      commentEl.appendChild(buildCommentForm({ isReply: true, parentId: parentId }));
    });

    // Main comment form (sets authBar and authorGroup via buildCommentForm)
    mainForm = buildCommentForm({ isReply: false });

    // Wrap form in <details> if collapsible
    if (collapsible) {
      formWrapper = el("details", { className: "kommentar-form-toggle" }, [
        el("summary", { className: "kommentar-toggle-btn" }, "Leave a comment"),
        mainForm
      ]);
    } else {
      formWrapper = el("div", { className: "kommentar-form-wrapper" }, [
        mainForm
      ]);
    }

    // Assemble
    container.appendChild(commentsList);
    if (apiUrl) {
      container.appendChild(formWrapper);
    }
  }

  // --- Init ---

  initAuth();
  buildWidget();

  // Lazy-load comments
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          observer.unobserve(container);
          loadComments();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(container);
  } else {
    loadComments();
  }
})();
