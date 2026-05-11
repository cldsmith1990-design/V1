(function () {
  "use strict";

  var root = document.getElementById("root");
  var state = {
    activeCategory: "all",
    activeKid: "all",
    selectedItemId: null
  };

  var VISUAL_CATEGORIES = [
    { id: "all", label: "All" },
    { id: "school", label: "School" },
    { id: "dance", label: "Dance" },
    { id: "theater", label: "Theater" },
    { id: "sports", label: "Sports" },
    { id: "calendar", label: "Calendar" },
    { id: "family", label: "Family" }
  ];

  var CATEGORY_ACCENTS = {
    school: "mint",
    dance: "violet",
    theater: "rose",
    sports: "sky",
    calendar: "amber",
    family: "gold",
    other: "slate"
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function parseLocalDate(dateValue) {
    if (!dateValue) return null;
    var parts = String(dateValue).split("-");
    if (parts.length !== 3) return null;
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(dateValue, fallback) {
    if (!dateValue) return fallback || "No date listed";
    var date = parseLocalDate(dateValue);
    if (!date) return String(dateValue);
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function formatLongDate(dateValue) {
    if (!dateValue) return "No date listed";
    var date = parseLocalDate(dateValue);
    if (!date) return String(dateValue);
    return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function formatTimeRange(item) {
    if (item.allDay) return "All day";
    if (!item.startTime && !item.endTime) return "Time not listed";
    if (item.startTime && item.endTime) return item.startTime + "–" + item.endTime;
    return item.startTime || item.endTime;
  }

  function toSortDate(item) {
    if (!item.date) return "9999-12-31T99:99";
    return String(item.date) + "T" + String(item.startTime || "23:59");
  }

  function daysUntil(dateValue) {
    var date = parseLocalDate(dateValue);
    if (!date) return null;
    var today = new Date();
    var start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((date.getTime() - start.getTime()) / 86400000);
  }

  // ChatGPT generates dashboard-data.js. The app reads that global file and adapts it
  // into the restored Family Desk visual model without mutating the loaded object.
  function getManualDashboardData() {
    return window.DASHBOARD_DATA;
  }

  function validateDashboardData(rawData) {
    if (!rawData || typeof rawData !== "object") {
      return {
        ok: false,
        code: "missing-data",
        message: "dashboard-data.js is missing or did not define window.DASHBOARD_DATA. Replace dashboard-data.js and refresh this browser tab."
      };
    }

    if (!Array.isArray(rawData.items)) {
      return {
        ok: false,
        code: "invalid-items",
        message: "dashboard-data.js loaded, but window.DASHBOARD_DATA.items is missing or is not an array. Replace dashboard-data.js and refresh this browser tab."
      };
    }

    return { ok: true };
  }

  function createVisibleErrorState(validation) {
    return {
      error: true,
      code: validation.code || "data-error",
      message: validation.message || "dashboard-data.js could not be read. Replace dashboard-data.js and refresh this browser tab."
    };
  }

  function adaptManualDataToVisualModel(rawData) {
    var validation = validateDashboardData(rawData);
    if (!validation.ok) return createVisibleErrorState(validation);

    var children = Array.isArray(rawData.children) ? rawData.children.map(function (child) {
      return {
        id: child && child.id ? String(child.id) : slug(child && child.displayName),
        label: child && child.displayName ? String(child.displayName) : "Kid",
        color: child && child.colorKey ? String(child.colorKey) : "gold",
        active: !(child && child.active === false)
      };
    }).filter(function (child) { return child.id; }) : [];

    var childLookup = children.reduce(function (lookup, child) {
      lookup[child.id] = child;
      return lookup;
    }, {});

    var manualCategories = Array.isArray(rawData.categories) ? rawData.categories : [];
    var categories = VISUAL_CATEGORIES.filter(function (category) {
      if (category.id === "all") return true;
      var manualMatch = manualCategories.find(function (manualCategory) { return manualCategory && manualCategory.id === category.id; });
      return !manualMatch || manualMatch.visible !== false;
    });

    manualCategories.forEach(function (manualCategory) {
      if (!manualCategory || manualCategory.visible === false) return;
      if (!categories.find(function (category) { return category.id === manualCategory.id; })) {
        categories.push({ id: String(manualCategory.id), label: manualCategory.label || titleCase(manualCategory.id) });
      }
    });

    var items = rawData.items.map(function (item, index) {
      return adaptManualItemToVisualItem(item, index, childLookup, rawData.meta || {});
    }).sort(function (a, b) {
      var aFlag = a.isPriority ? 0 : 1;
      var bFlag = b.isPriority ? 0 : 1;
      if (aFlag !== bFlag) return aFlag - bFlag;
      return a.sortDate.localeCompare(b.sortDate);
    });

    return {
      error: false,
      meta: rawData.meta || {},
      review: rawData.review || {},
      kids: [{ id: "all", label: "Family", color: "gold", active: true }].concat(children),
      categories: categories,
      items: items,
      generatedAt: rawData.meta && rawData.meta.generatedAt ? rawData.meta.generatedAt : "Not listed",
      sourceWindow: rawData.meta && rawData.meta.sourceWindow ? rawData.meta.sourceWindow : null
    };
  }

  function adaptManualItemToVisualItem(manualItem, index, childLookup, meta) {
    var item = manualItem && typeof manualItem === "object" ? manualItem : {};
    var childIds = Array.isArray(item.childIds) ? item.childIds.map(String) : [];
    var childNames = Array.isArray(item.childNames) ? item.childNames.filter(Boolean).map(String) : [];

    if (!childNames.length && childIds.length) {
      childNames = childIds.map(function (id) { return childLookup[id] ? childLookup[id].label : titleCase(id); });
    }

    var cat = item.category ? String(item.category) : "other";
    var location = item.location && typeof item.location === "object" ? item.location : {};
    var source = item.source && typeof item.source === "object" ? item.source : {};
    var action = item.actionNeeded && typeof item.actionNeeded === "object" ? item.actionNeeded : { required: false };
    var prepItems = Array.isArray(item.prepItems) ? item.prepItems.map(function (prep) {
      if (typeof prep === "string") return { label: prep, status: "needed" };
      return { label: prep && prep.label ? String(prep.label) : "Prep item", status: prep && prep.status ? String(prep.status) : "needed" };
    }) : [];
    var notes = item.notes ? String(item.notes) : "";
    var actionLabel = action.required ? (action.label || "Action needed") : (action.label || "Action not listed");
    var details = [source.summary, notes, prepItems.map(function (prep) { return prep.label; }).join(", "), action.label]
      .filter(Boolean).join(" · ") || "Source not listed";
    var priority = item.priority || "normal";
    var reviewStatus = item.reviewStatus || "needs_review";
    var calStatus = item.calendarStatus || "not_checked";
    var isActionRequired = Boolean(action.required);
    var isPriority = priority === "urgent" || priority === "high" || isActionRequired || reviewStatus === "needs_review" || calStatus === "needs_review" || calStatus === "not_checked" || source.confidence === "needs_review";

    return {
      id: item.id || "manual-" + index,
      type: item.type || "item",
      title: item.title || "Untitled item",
      cat: cat,
      categoryLabel: titleCase(cat),
      accent: CATEGORY_ACCENTS[cat] || "slate",
      kidIds: childIds,
      kid: childNames.length ? childNames.join(", ") : "Family",
      date: item.date || null,
      sortDate: toSortDate(item),
      dateLabel: formatDate(item.date),
      longDateLabel: formatLongDate(item.date),
      time: formatTimeRange(item),
      allDay: Boolean(item.allDay),
      timezone: item.timezone || meta.timezone || null,
      location: location.name || location.address || "Location not listed",
      locationNotes: location.notes || "",
      summary: source.summary || source.subject || "Source not listed",
      details: details,
      from: source.sender || "Source not listed",
      received: source.receivedAt || "Source not listed",
      link: source.link || "",
      actions: actionLabel,
      actionRequired: isActionRequired,
      deadline: action.dueDate || "",
      prep: prepItems,
      calStatus: calStatus,
      priority: priority,
      reviewStatus: reviewStatus,
      confidence: source.confidence || "not listed",
      notes: notes,
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      daysUntil: daysUntil(item.date),
      isPriority: isPriority,
      calendarHref: createCalendarHref(item, location)
    };
  }

  function createCalendarHref(item, location) {
    if (!item || !item.date) return "";
    var title = item.title || "Family Dashboard item";
    var text = [item.notes, item.source && item.source.summary].filter(Boolean).join("\n\n");
    var where = location && (location.name || location.address) ? (location.name || location.address) : "";
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(title) + "&dates=" + encodeURIComponent(String(item.date).replace(/-/g, "")) + "/" + encodeURIComponent(String(item.date).replace(/-/g, "")) + "&details=" + encodeURIComponent(text) + "&location=" + encodeURIComponent(where);
  }

  function isToday(item) {
    var remaining = daysUntil(item.date);
    return remaining === 0;
  }

  function getVisibleItems(model) {
    return model.items.filter(function (item) {
      var categoryMatch = state.activeCategory === "all" || item.cat === state.activeCategory || (state.activeCategory === "calendar" && item.date);
      var kidMatch = state.activeKid === "all" || item.kidIds.indexOf(state.activeKid) !== -1 || (state.activeKid === "all" && !item.kidIds.length);
      return categoryMatch && kidMatch;
    });
  }

  function renderBadge(label, value, modifier) {
    return '<span class="badge ' + escapeHtml(modifier || "") + '"><b>' + escapeHtml(label) + '</b>' + escapeHtml(value || "not listed") + '</span>';
  }

  function renderDataProblem(errorState) {
    root.innerHTML = [
      '<main class="family-desk error-mode">',
      '  <section class="data-error-panel glass-panel">',
      '    <p class="eyebrow">Manual file issue</p>',
      '    <h1>Family Desk cannot load dashboard-data.js</h1>',
      '    <p>' + escapeHtml(errorState.message) + '</p>',
      '    <div class="repair-steps">',
      '      <span>1. Replace dashboard-data.js</span>',
      '      <span>2. Keep window.DASHBOARD_DATA = { ... }</span>',
      '      <span>3. Refresh this browser tab</span>',
      '    </div>',
      '  </section>',
      '</main>'
    ].join("");
  }

  function renderTopNav(model) {
    var kidButtons = model.kids.filter(function (kid) { return kid.active !== false; }).map(function (kid) {
      return '<button class="nav-pill kid-' + escapeHtml(kid.color) + (state.activeKid === kid.id ? ' is-active' : '') + '" data-kid="' + escapeHtml(kid.id) + '">' + escapeHtml(kid.label) + '</button>';
    }).join("");

    var categoryButtons = model.categories.map(function (category) {
      return '<button class="chip ' + (state.activeCategory === category.id ? 'is-active' : '') + '" data-category="' + escapeHtml(category.id) + '">' + escapeHtml(category.label) + '</button>';
    }).join("");

    return [
      '<header class="top-nav">',
      '  <a class="brand-mark" href="#top" aria-label="Family Desk home"><span>FD</span><strong>Family Desk</strong></a>',
      '  <nav class="kid-filter" aria-label="Kid filter">' + kidButtons + '</nav>',
      '  <nav class="category-filter" aria-label="Category filter">' + categoryButtons + '</nav>',
      '</header>'
    ].join("");
  }

  function renderHero(model, visibleItems) {
    var nextItem = model.items.filter(function (item) { return item.date; })[0] || model.items[0];
    var urgentCount = model.items.filter(function (item) { return item.isPriority; }).length;
    var actionCount = model.items.filter(function (item) { return item.actionRequired; }).length;
    var rangeText = model.sourceWindow && model.sourceWindow.startDate ? formatDate(model.sourceWindow.startDate) + ' → ' + formatDate(model.sourceWindow.endDate) : 'Current family window';

    return [
      '<section class="hero-grid" id="top">',
      '  <article class="hero-copy glass-panel">',
      '    <p class="eyebrow">Manual-file command center</p>',
      '    <h1>Family Desk</h1>',
      '    <p class="deck">A premium dark family dashboard for school, dance, theater, sports, and calendar follow-through. Replace <strong>dashboard-data.js</strong>, refresh, and the desk updates.</p>',
      '    <div class="hero-metrics">',
      '      <span><b>' + model.items.length + '</b>Total</span>',
      '      <span><b>' + urgentCount + '</b>Priority</span>',
      '      <span><b>' + actionCount + '</b>Actions</span>',
      '      <span><b>' + visibleItems.length + '</b>Showing</span>',
      '    </div>',
      '  </article>',
      '  <article class="forward-card glass-panel">',
      '    <p class="eyebrow">Forward look</p>',
      nextItem ? renderTimelineHero(nextItem) : '<h2>Nothing scheduled</h2><p>Add items to dashboard-data.js to fill the forward look.</p>',
      '    <div class="source-range">' + escapeHtml(rangeText) + '</div>',
      '  </article>',
      '</section>'
    ].join("");
  }

  function renderTimelineHero(item) {
    return [
      '<div class="timeline-hero accent-' + escapeHtml(item.accent) + '">',
      '  <div class="rail-dot"></div>',
      '  <span class="date-kicker">' + escapeHtml(item.dateLabel) + ' · ' + escapeHtml(item.time) + '</span>',
      '  <h2>' + escapeHtml(item.title) + '</h2>',
      '  <p>' + escapeHtml(item.summary) + '</p>',
      '  <div class="mini-meta"><span>' + escapeHtml(item.kid) + '</span><span>' + escapeHtml(item.location) + '</span></div>',
      '</div>'
    ].join("");
  }

  function renderTodayBrief(model) {
    var todayItems = model.items.filter(isToday);
    var priorityItems = model.items.filter(function (item) { return item.isPriority; }).slice(0, 4);
    var reviewWarnings = [];
    if (model.review && Array.isArray(model.review.warnings)) reviewWarnings = reviewWarnings.concat(model.review.warnings);
    if (model.review && Array.isArray(model.review.unknowns)) reviewWarnings = reviewWarnings.concat(model.review.unknowns);

    return [
      '<section class="brief-grid">',
      '  <article class="today-brief glass-panel">',
      '    <p class="eyebrow">Today brief</p>',
      '    <h2>' + (todayItems.length ? todayItems.length + ' item(s) today' : 'No dated items today') + '</h2>',
      todayItems.length ? todayItems.slice(0, 3).map(renderMiniCard).join("") : '<p class="muted">Nothing in dashboard-data.js lands on today. Upcoming items remain visible below.</p>',
      '  </article>',
      '  <article class="priority-stack glass-panel">',
      '    <p class="eyebrow">Auto-focus</p>',
      '    <h2>Priority stack</h2>',
      priorityItems.length ? priorityItems.map(renderFocusRow).join("") : '<p class="muted">No urgent, action, review, or calendar flags are active.</p>',
      reviewWarnings.length ? '<div class="warning-strip">' + reviewWarnings.map(function (warning) { return '<span>⚠ ' + escapeHtml(warning) + '</span>'; }).join("") + '</div>' : '',
      '  </article>',
      '</section>'
    ].join("");
  }

  function renderMiniCard(item) {
    return '<button class="mini-card accent-' + escapeHtml(item.accent) + '" data-open-item="' + escapeHtml(item.id) + '"><span>' + escapeHtml(item.time) + '</span><strong>' + escapeHtml(item.title) + '</strong><em>' + escapeHtml(item.kid) + '</em></button>';
  }

  function renderFocusRow(item) {
    var label = item.actionRequired ? item.actions : (item.reviewStatus === "needs_review" ? "Needs review" : item.calStatus);
    return '<button class="focus-row" data-open-item="' + escapeHtml(item.id) + '"><span class="status-dot accent-' + escapeHtml(item.accent) + '"></span><strong>' + escapeHtml(item.title) + '</strong><em>' + escapeHtml(label) + '</em></button>';
  }

  function renderTimeline(model, visibleItems) {
    if (!model.items.length) {
      return '<section class="empty-state glass-panel"><p class="eyebrow">Empty dashboard</p><h2>No dashboard items yet</h2><p>dashboard-data.js loaded successfully, but its items array is empty.</p></section>';
    }

    if (!visibleItems.length) {
      return '<section class="empty-state glass-panel"><p class="eyebrow">No matches</p><h2>No items match these filters</h2><p>Try Family or All to return to the full dashboard.</p></section>';
    }

    return [
      '<section class="content-grid">',
      '  <div class="event-column">',
      '    <div class="section-heading"><p class="eyebrow">Timeline rail</p><h2>Family flow</h2></div>',
      visibleItems.map(renderEventCard).join(""),
      '  </div>',
      '  <aside class="side-column">',
      renderCalendarOverview(model),
      renderSourceLedger(model),
      '  </aside>',
      '</section>'
    ].join("");
  }

  function renderEventCard(item) {
    var deadline = item.deadline ? '<span class="deadline">Due ' + escapeHtml(formatDate(item.deadline)) + '</span>' : '';
    return [
      '<article class="event-card glass-panel accent-' + escapeHtml(item.accent) + '">',
      '  <button class="card-hit" data-open-item="' + escapeHtml(item.id) + '" aria-label="Open details for ' + escapeHtml(item.title) + '"></button>',
      '  <div class="event-rail"><span></span></div>',
      '  <div class="event-main">',
      '    <div class="event-topline"><span class="category-pill">' + escapeHtml(item.categoryLabel) + '</span><span>' + escapeHtml(item.type) + '</span></div>',
      '    <h3>' + escapeHtml(item.title) + '</h3>',
      '    <p class="kid-line">' + escapeHtml(item.kid) + '</p>',
      '    <p class="summary-line">' + escapeHtml(item.summary) + '</p>',
      '    <dl class="fact-grid">',
      '      <div><dt>Date</dt><dd>' + escapeHtml(item.longDateLabel) + '</dd></div>',
      '      <div><dt>Time</dt><dd>' + escapeHtml(item.time) + '</dd></div>',
      '      <div><dt>Place</dt><dd>' + escapeHtml(item.location) + '</dd></div>',
      '      <div><dt>From</dt><dd>' + escapeHtml(item.from) + '</dd></div>',
      '    </dl>',
      '    <div class="badge-row">',
      renderBadge("Urgency", item.priority, item.priority === "urgent" || item.priority === "high" ? "hot" : ""),
      renderBadge("Calendar", item.calStatus, item.calStatus === "needs_review" || item.calStatus === "not_checked" ? "warn" : ""),
      renderBadge("Action", item.actionRequired ? "needed" : "not listed", item.actionRequired ? "warn" : ""),
      renderBadge("Review", item.reviewStatus, item.reviewStatus === "needs_review" || item.reviewStatus === "sample" ? "warn" : ""),
      '    </div>',
      '    <div class="action-box"><strong>' + (item.actionRequired ? 'Action needed' : 'Action') + '</strong><span>' + escapeHtml(item.actions) + '</span>' + deadline + '</div>',
      renderPrepList(item),
      '    <div class="card-links">',
      item.link ? '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">Open source</a>' : '<span>Source link not listed</span>',
      item.calendarHref ? '<a href="' + escapeHtml(item.calendarHref) + '" target="_blank" rel="noopener">Add to calendar</a>' : '<span>Add-to-calendar unavailable</span>',
      '    </div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function renderPrepList(item) {
    if (!item.prep.length) return '<div class="prep-list muted"><strong>Prep</strong><span>Prep items not listed</span></div>';
    return '<div class="prep-list"><strong>Prep</strong><ul>' + item.prep.map(function (prep) {
      return '<li><span></span>' + escapeHtml(prep.label) + ' <em>' + escapeHtml(prep.status) + '</em></li>';
    }).join("") + '</ul></div>';
  }

  function renderCalendarOverview(model) {
    var dated = model.items.filter(function (item) { return item.date; }).slice(0, 7);
    return [
      '<section class="calendar-overview glass-panel">',
      '  <p class="eyebrow">Calendar overview</p>',
      '  <h2>Next dated items</h2>',
      dated.length ? dated.map(function (item) {
        return '<button class="calendar-row" data-open-item="' + escapeHtml(item.id) + '"><span>' + escapeHtml(item.dateLabel) + '</span><strong>' + escapeHtml(item.title) + '</strong><em>' + escapeHtml(item.time) + '</em></button>';
      }).join("") : '<p class="muted">No dated items yet.</p>',
      '</section>'
    ].join("");
  }

  function renderSourceLedger(model) {
    return [
      '<section class="source-ledger glass-panel">',
      '  <p class="eyebrow">Manual data</p>',
      '  <h2>Source ledger</h2>',
      '  <p><strong>File:</strong> dashboard-data.js</p>',
      '  <p><strong>Generated:</strong> ' + escapeHtml(model.generatedAt) + '</p>',
      '  <p><strong>Refresh:</strong> replace the data file, then refresh the browser.</p>',
      '</section>'
    ].join("");
  }

  function renderOverlay(model) {
    if (!state.selectedItemId) return "";
    var item = model.items.find(function (candidate) { return candidate.id === state.selectedItemId; });
    if (!item) return "";
    return [
      '<div class="overlay-backdrop" data-close-overlay="true">',
      '  <section class="detail-overlay glass-panel" role="dialog" aria-modal="true">',
      '    <button class="close-overlay" data-close-overlay="true" aria-label="Close details">×</button>',
      '    <p class="eyebrow">Item detail</p>',
      '    <h2>' + escapeHtml(item.title) + '</h2>',
      '    <p class="overlay-summary">' + escapeHtml(item.details) + '</p>',
      '    <dl class="fact-grid overlay-facts">',
      '      <div><dt>Kid</dt><dd>' + escapeHtml(item.kid) + '</dd></div>',
      '      <div><dt>Date</dt><dd>' + escapeHtml(item.longDateLabel) + '</dd></div>',
      '      <div><dt>Time</dt><dd>' + escapeHtml(item.time) + '</dd></div>',
      '      <div><dt>Location</dt><dd>' + escapeHtml(item.location) + '</dd></div>',
      '      <div><dt>Received</dt><dd>' + escapeHtml(item.received) + '</dd></div>',
      '      <div><dt>Tags</dt><dd>' + escapeHtml(item.tags.length ? item.tags.join(", ") : "Not listed") + '</dd></div>',
      '    </dl>',
      renderPrepList(item),
      '  </section>',
      '</div>'
    ].join("");
  }

  function attachEvents(model) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-category]"), function (button) {
      button.addEventListener("click", function () {
        state.activeCategory = button.getAttribute("data-category");
        state.selectedItemId = null;
        renderDashboard(model);
      });
    });

    Array.prototype.forEach.call(root.querySelectorAll("[data-kid]"), function (button) {
      button.addEventListener("click", function () {
        state.activeKid = button.getAttribute("data-kid");
        state.selectedItemId = null;
        renderDashboard(model);
      });
    });

    Array.prototype.forEach.call(root.querySelectorAll("[data-open-item]"), function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        state.selectedItemId = button.getAttribute("data-open-item");
        renderDashboard(model);
      });
    });

    Array.prototype.forEach.call(root.querySelectorAll("[data-close-overlay]"), function (button) {
      button.addEventListener("click", function (event) {
        if (event.target !== button && button.className !== "close-overlay") return;
        state.selectedItemId = null;
        renderDashboard(model);
      });
    });
  }

  function renderDashboard(model) {
    if (model.error) {
      renderDataProblem(model);
      return;
    }

    var visibleItems = getVisibleItems(model);
    root.innerHTML = [
      '<main class="family-desk">',
      renderTopNav(model),
      renderHero(model, visibleItems),
      renderTodayBrief(model),
      renderTimeline(model, visibleItems),
      renderOverlay(model),
      '</main>'
    ].join("");
    attachEvents(model);
  }

  try {
    renderDashboard(adaptManualDataToVisualModel(getManualDashboardData()));
  } catch (error) {
    renderDataProblem(createVisibleErrorState({
      code: "render-error",
      message: "The dashboard hit an unexpected rendering problem. Check dashboard-data.js for invalid fields, replace it, and refresh. Details: " + error.message
    }));
  }
}());
