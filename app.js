(function () {
  "use strict";

  var root = document.getElementById("root");
  var state = {
    activeCategory: "all",
    activeChild: "all"
  };

  var DEFAULT_CATEGORIES = [
    { id: "school", label: "School", visible: true },
    { id: "dance", label: "Dance", visible: true },
    { id: "theater", label: "Theater", visible: true },
    { id: "sports", label: "Sports", visible: true },
    { id: "family", label: "Family", visible: true }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(dateValue) {
    if (!dateValue) return "No date listed";
    var parts = String(dateValue).split("-");
    if (parts.length !== 3) return escapeHtml(dateValue);
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) return escapeHtml(dateValue);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatTime(item) {
    if (item.allDay) return "All day";
    if (!item.startTime && !item.endTime) return "Time not listed";
    if (item.startTime && item.endTime) return item.startTime + "–" + item.endTime;
    return item.startTime || item.endTime;
  }

  function normalizeData(rawData) {
    if (!rawData || typeof rawData !== "object") {
      return { error: "dashboard-data.js was not found or did not define window.DASHBOARD_DATA. Replace dashboard-data.js and refresh." };
    }

    if (!Array.isArray(rawData.items)) {
      return { error: "The data file format is invalid: window.DASHBOARD_DATA.items must be an array. Replace dashboard-data.js and refresh." };
    }

    var children = Array.isArray(rawData.children) ? rawData.children : [];
    var categories = Array.isArray(rawData.categories) && rawData.categories.length ? rawData.categories : DEFAULT_CATEGORIES;
    var activeChildrenById = children.reduce(function (lookup, child) {
      if (child && child.id) lookup[child.id] = child;
      return lookup;
    }, {});

    var items = rawData.items.map(function (item, index) {
      var safeItem = item && typeof item === "object" ? item : {};
      var childNames = Array.isArray(safeItem.childNames) ? safeItem.childNames.filter(Boolean) : [];
      if (!childNames.length && Array.isArray(safeItem.childIds)) {
        childNames = safeItem.childIds.map(function (id) {
          return activeChildrenById[id] ? activeChildrenById[id].displayName : id;
        }).filter(Boolean);
      }

      return {
        id: safeItem.id || "manual_item_" + index,
        type: safeItem.type || "item",
        title: safeItem.title || "Untitled item",
        category: safeItem.category || "other",
        childIds: Array.isArray(safeItem.childIds) ? safeItem.childIds : [],
        childNames: childNames,
        date: safeItem.date || null,
        startTime: safeItem.startTime || null,
        endTime: safeItem.endTime || null,
        allDay: Boolean(safeItem.allDay),
        timezone: safeItem.timezone || (rawData.meta && rawData.meta.timezone) || null,
        location: safeItem.location && typeof safeItem.location === "object" ? safeItem.location : {},
        source: safeItem.source && typeof safeItem.source === "object" ? safeItem.source : {},
        actionNeeded: safeItem.actionNeeded && typeof safeItem.actionNeeded === "object" ? safeItem.actionNeeded : { required: false },
        prepItems: Array.isArray(safeItem.prepItems) ? safeItem.prepItems : [],
        calendarStatus: safeItem.calendarStatus || "not_checked",
        priority: safeItem.priority || "normal",
        reviewStatus: safeItem.reviewStatus || "needs_review",
        notes: safeItem.notes || "",
        tags: Array.isArray(safeItem.tags) ? safeItem.tags : []
      };
    });

    return {
      meta: rawData.meta || {},
      children: children,
      categories: categories,
      items: sortItems(items, rawData.meta),
      review: rawData.review || {}
    };
  }

  function sortItems(items, meta) {
    var showNeedsReviewFirst = Boolean(meta && meta.dashboardInstructions && meta.dashboardInstructions.showNeedsReviewFirst);
    return items.slice().sort(function (a, b) {
      if (showNeedsReviewFirst) {
        var aNeeds = isFlagged(a) ? 0 : 1;
        var bNeeds = isFlagged(b) ? 0 : 1;
        if (aNeeds !== bNeeds) return aNeeds - bNeeds;
      }
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return String(a.date).localeCompare(String(b.date)) || String(a.startTime || "").localeCompare(String(b.startTime || ""));
    });
  }

  function isFlagged(item) {
    return item.priority === "urgent" ||
      item.priority === "high" ||
      item.reviewStatus === "needs_review" ||
      item.calendarStatus === "needs_review" ||
      item.calendarStatus === "not_checked" ||
      (item.actionNeeded && item.actionNeeded.required) ||
      (item.source && item.source.confidence === "needs_review");
  }

  function categoryLabel(data, categoryId) {
    var match = data.categories.find(function (category) { return category.id === categoryId; });
    return match ? match.label : categoryId;
  }

  function getFilteredItems(data) {
    return data.items.filter(function (item) {
      var categoryMatches = state.activeCategory === "all" || item.category === state.activeCategory;
      var childMatches = state.activeChild === "all" || item.childIds.indexOf(state.activeChild) !== -1;
      return categoryMatches && childMatches;
    });
  }

  function renderError(message) {
    root.innerHTML = [
      '<main class="shell">',
      '  <section class="error-panel">',
      '    <p class="eyebrow">Manual file issue</p>',
      '    <h1>Family Dashboard could not load data</h1>',
      '    <p>' + escapeHtml(message) + '</p>',
      '  </section>',
      '</main>'
    ].join("");
  }

  function renderBadge(label, value, extraClass) {
    if (!value && !label) return "";
    return '<span class="badge ' + escapeHtml(extraClass || "") + '">' + escapeHtml(label ? label + ": " : "") + escapeHtml(value || "unknown") + '</span>';
  }

  function renderTabs(data) {
    var visibleCategories = data.categories.filter(function (category) { return category.visible !== false; });
    var categoryTabs = [{ id: "all", label: "All" }].concat(visibleCategories).map(function (category) {
      var activeClass = state.activeCategory === category.id ? " active" : "";
      return '<button class="tab' + activeClass + '" data-category="' + escapeHtml(category.id) + '">' + escapeHtml(category.label) + '</button>';
    }).join("");

    var childTabs = [{ id: "all", displayName: "All kids" }].concat(data.children.filter(function (child) { return child.active !== false; })).map(function (child) {
      var activeClass = state.activeChild === child.id ? " active" : "";
      var colorClass = child.colorKey ? " child-" + child.colorKey : "";
      return '<button class="tab child-tab' + activeClass + colorClass + '" data-child="' + escapeHtml(child.id) + '">' + escapeHtml(child.displayName) + '</button>';
    }).join("");

    return '<section class="toolbar"><div><p class="toolbar-label">Category</p><div class="tabs">' + categoryTabs + '</div></div><div><p class="toolbar-label">Child</p><div class="tabs">' + childTabs + '</div></div></section>';
  }

  function renderSummary(data, filteredItems) {
    var actionCount = data.items.filter(function (item) { return item.actionNeeded && item.actionNeeded.required; }).length;
    var reviewCount = data.items.filter(isFlagged).length;
    var datedCount = data.items.filter(function (item) { return Boolean(item.date); }).length;
    var generatedAt = data.meta.generatedAt || "Not listed";
    return [
      '<section class="summary-grid">',
      '  <article class="summary-card"><span>Total items</span><strong>' + data.items.length + '</strong></article>',
      '  <article class="summary-card urgent"><span>Needs attention</span><strong>' + reviewCount + '</strong></article>',
      '  <article class="summary-card"><span>Actions</span><strong>' + actionCount + '</strong></article>',
      '  <article class="summary-card"><span>Dated items</span><strong>' + datedCount + '</strong></article>',
      '</section>',
      '<section class="data-note">',
      '  <strong>Manual data file:</strong> dashboard-data.js · <strong>Generated:</strong> ' + escapeHtml(generatedAt) + ' · <strong>Showing:</strong> ' + filteredItems.length + ' item(s)',
      '</section>'
    ].join("");
  }

  function renderReviewWarnings(data) {
    var warnings = Array.isArray(data.review.warnings) ? data.review.warnings : [];
    var unknowns = Array.isArray(data.review.unknowns) ? data.review.unknowns : [];
    if (!warnings.length && !unknowns.length) return "";
    return '<section class="review-panel"><h2>Review notes</h2>' +
      warnings.concat(unknowns).map(function (warning) { return '<p>⚠️ ' + escapeHtml(warning) + '</p>'; }).join("") +
      '</section>';
  }

  function renderCalendar(data) {
    var datedItems = data.items.filter(function (item) { return item.date; }).slice(0, 8);
    if (!datedItems.length) {
      return '<section class="calendar-panel"><h2>Calendar overview</h2><p>No dated items yet.</p></section>';
    }
    return '<section class="calendar-panel"><h2>Calendar overview</h2><div class="calendar-list">' +
      datedItems.map(function (item) {
        return '<article><strong>' + formatDate(item.date) + '</strong><span>' + escapeHtml(item.title) + '</span></article>';
      }).join("") +
      '</div></section>';
  }

  function renderPrepItems(prepItems) {
    if (!prepItems.length) return "";
    return '<div class="prep"><h3>Prep items</h3><ul>' + prepItems.map(function (prep) {
      if (typeof prep === "string") return '<li>' + escapeHtml(prep) + '</li>';
      return '<li>' + escapeHtml(prep.label || "Prep item") + (prep.status ? ' <span>(' + escapeHtml(prep.status) + ')</span>' : '') + '</li>';
    }).join("") + '</ul></div>';
  }

  function renderItemCard(item, data) {
    var locationName = item.location.name || item.location.address || "Location not listed";
    var sourceSummary = item.source.summary || item.source.subject || "Source not listed";
    var actionLabel = item.actionNeeded && item.actionNeeded.required ? (item.actionNeeded.label || "Action needed") : "No action listed";
    var flaggedClass = isFlagged(item) ? " flagged" : "";
    var priorityClass = item.priority === "urgent" || item.priority === "high" ? " badge-alert" : "";
    var reviewClass = item.reviewStatus === "needs_review" || item.reviewStatus === "sample" ? " badge-warning" : "";
    var calendarClass = item.calendarStatus === "needs_review" || item.calendarStatus === "not_checked" ? " badge-warning" : "";
    var confidenceClass = item.source.confidence === "needs_review" ? " badge-warning" : "";
    var actionClass = item.actionNeeded && item.actionNeeded.required ? " action-required" : "";

    return [
      '<article class="item-card' + flaggedClass + '">',
      '  <div class="card-topline">',
      '    <span class="category-pill">' + escapeHtml(categoryLabel(data, item.category)) + '</span>',
      '    <span>' + escapeHtml(item.type) + '</span>',
      '  </div>',
      '  <h2>' + escapeHtml(item.title) + '</h2>',
      '  <p class="kids">' + escapeHtml(item.childNames.length ? item.childNames.join(", ") : "Family") + '</p>',
      '  <dl class="details">',
      '    <div><dt>Date</dt><dd>' + formatDate(item.date) + '</dd></div>',
      '    <div><dt>Time</dt><dd>' + escapeHtml(formatTime(item)) + '</dd></div>',
      '    <div><dt>Location</dt><dd>' + escapeHtml(locationName) + '</dd></div>',
      '    <div><dt>Source</dt><dd>' + escapeHtml(sourceSummary) + '</dd></div>',
      '  </dl>',
      '  <div class="badges">',
      renderBadge("Priority", item.priority, priorityClass),
      renderBadge("Calendar", item.calendarStatus, calendarClass),
      renderBadge("Review", item.reviewStatus, reviewClass),
      renderBadge("Confidence", item.source.confidence || "not listed", confidenceClass),
      '  </div>',
      '  <div class="action' + actionClass + '"><strong>Action:</strong> ' + escapeHtml(actionLabel) + '</div>',
      renderPrepItems(item.prepItems),
      item.notes ? '<p class="notes"><strong>Notes:</strong> ' + escapeHtml(item.notes) + '</p>' : '',
      '</article>'
    ].join("");
  }

  function renderItems(data, filteredItems) {
    if (!data.items.length) {
      return '<section class="empty-state"><h2>No dashboard items yet</h2><p>dashboard-data.js loaded successfully, but it contains zero items.</p></section>';
    }
    if (!filteredItems.length) {
      return '<section class="empty-state"><h2>No items match these filters</h2><p>Try All, Family, or another child filter.</p></section>';
    }
    return '<section class="cards-grid">' + filteredItems.map(function (item) { return renderItemCard(item, data); }).join("") + '</section>';
  }

  function renderDashboard(data) {
    var filteredItems = getFilteredItems(data);
    root.innerHTML = [
      '<main class="shell">',
      '  <header class="hero">',
      '    <p class="eyebrow">Manual-file family viewer</p>',
      '    <h1>Family Dashboard</h1>',
      '    <p>Open this file directly. Replace <strong>dashboard-data.js</strong> whenever ChatGPT generates updated family data.</p>',
      '  </header>',
      renderTabs(data),
      renderSummary(data, filteredItems),
      renderReviewWarnings(data),
      '  <div class="main-layout">',
      '    <div>', renderItems(data, filteredItems), '</div>',
      '    <aside>', renderCalendar(data), '</aside>',
      '  </div>',
      '</main>'
    ].join("");

    Array.prototype.forEach.call(root.querySelectorAll("[data-category]"), function (button) {
      button.addEventListener("click", function () {
        state.activeCategory = button.getAttribute("data-category");
        renderDashboard(data);
      });
    });

    Array.prototype.forEach.call(root.querySelectorAll("[data-child]"), function (button) {
      button.addEventListener("click", function () {
        state.activeChild = button.getAttribute("data-child");
        renderDashboard(data);
      });
    });
  }

  try {
    var normalized = normalizeData(window.DASHBOARD_DATA);
    if (normalized.error) {
      renderError(normalized.error);
      return;
    }
    renderDashboard(normalized);
  } catch (error) {
    renderError("The dashboard hit an unexpected rendering problem. Check dashboard-data.js for invalid fields, replace it, and refresh. Details: " + error.message);
  }
}());
