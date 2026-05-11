(function () {
  "use strict";

  var root = document.getElementById("root");
  var state = {
    activeCategory: "all",
    activeKid: "all",
    selectedItemId: null,
    selectedMonth: null,   // { year, month } — null = auto-anchor on next render
    selectedDate: null,    // "YYYY-MM-DD" or null
    exportPromptText: null // non-null = show export modal in Notes tab
  };

  var currentModel = null; // set on every renderDashboard call

  var VISUAL_CATEGORIES = [
    { id: "all", label: "All" },
    { id: "school", label: "School" },
    { id: "dance", label: "Dance" },
    { id: "theater", label: "Theater" },
    { id: "sports", label: "Sports" },
    { id: "calendar", label: "Calendar" },
    { id: "family", label: "Family" },
    { id: "dashboard-notes", label: "Notes" }
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

  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DOW_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  // ─── Utility ────────────────────────────────────────────────────────────────

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

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

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

  function todayKey() {
    var t = new Date();
    return t.getFullYear() + "-" + pad2(t.getMonth() + 1) + "-" + pad2(t.getDate());
  }

  // ─── Data loading & adapting ─────────────────────────────────────────────────

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
      startTime: item.startTime || null,
      endTime: item.endTime || null,
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

  // ─── Shared render helpers ────────────────────────────────────────────────────

  function renderBadge(label, value, modifier) {
    return '<span class="badge ' + escapeHtml(modifier || "") + '"><b>' + escapeHtml(label) + '</b>' + escapeHtml(value || "not listed") + '</span>';
  }

  function renderPrepList(item) {
    if (!item.prep.length) return '<div class="prep-list muted"><strong>Prep</strong><span>Prep items not listed</span></div>';
    return '<div class="prep-list"><strong>Prep</strong><ul>' + item.prep.map(function (prep) {
      return '<li><span></span>' + escapeHtml(prep.label) + ' <em>' + escapeHtml(prep.status) + '</em></li>';
    }).join("") + '</ul></div>';
  }

  // ─── Timeline / standard view renderers ──────────────────────────────────────

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
      item.calStatus === "on_calendar"
        ? (item.link ? '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">Open calendar event</a>' : '<span class="muted">Already on calendar</span>')
        : (item.calendarHref ? '<a href="' + escapeHtml(item.calendarHref) + '" target="_blank" rel="noopener">Add to calendar</a>' : '<span>Add-to-calendar unavailable</span>'),
      '    </div>',
      '  </div>',
      '</article>'
    ].join("");
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

  // ─── Calendar Command View — data helpers ────────────────────────────────────

  function getCalendarAnchorDate(model) {
    var today = new Date();
    var sw = model.sourceWindow;
    if (sw && sw.startDate && sw.endDate) {
      var swStart = parseLocalDate(sw.startDate);
      var swEnd   = parseLocalDate(sw.endDate);
      var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (swStart && swEnd && todayMid >= swStart && todayMid <= swEnd) {
        return { year: today.getFullYear(), month: today.getMonth() };
      }
    }
    var upcoming = model.items.filter(function (item) {
      return item.date && daysUntil(item.date) >= 0;
    });
    if (upcoming.length) {
      var d = parseLocalDate(upcoming[0].date);
      if (d) return { year: d.getFullYear(), month: d.getMonth() };
    }
    if (model.generatedAt && model.generatedAt !== "Not listed") {
      var gd = new Date(model.generatedAt);
      if (!isNaN(gd.getTime())) return { year: gd.getFullYear(), month: gd.getMonth() };
    }
    var dated = model.items.filter(function (item) { return item.date; });
    if (dated.length) {
      var ed = parseLocalDate(dated[0].date);
      if (ed) return { year: ed.getFullYear(), month: ed.getMonth() };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  }

  function getMonthMatrix(year, month) {
    var firstDay  = new Date(year, month, 1);
    var lastDay   = new Date(year, month + 1, 0);
    var startDow  = firstDay.getDay();
    var totalDays = lastDay.getDate();
    var weeks = [];
    var week  = [];
    var day   = 1;

    for (var pre = 0; pre < startDow; pre++) {
      var prevD = new Date(year, month, 1 - (startDow - pre));
      week.push({ year: prevD.getFullYear(), month: prevD.getMonth(), day: prevD.getDate(), isCurrentMonth: false });
    }

    while (day <= totalDays) {
      week.push({ year: year, month: month, day: day, isCurrentMonth: true });
      day++;
      if (week.length === 7) { weeks.push(week); week = []; }
    }

    if (week.length > 0) {
      var trail     = 1;
      var trailMo   = (month + 1) % 12;
      var trailYr   = month === 11 ? year + 1 : year;
      while (week.length < 7) {
        week.push({ year: trailYr, month: trailMo, day: trail, isCurrentMonth: false });
        trail++;
      }
      weeks.push(week);
    }

    return weeks;
  }

  function groupItemsByDate(items) {
    var groups = {};
    items.forEach(function (item) {
      if (!item.date) return;
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return groups;
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    var parts = String(timeStr).split(":");
    if (parts.length < 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    return (isNaN(h) || isNaN(m)) ? null : h * 60 + m;
  }

  function detectTimeConflicts(items) {
    var conflictIds = {};
    var byDate = groupItemsByDate(items);
    Object.keys(byDate).forEach(function (date) {
      var timed = byDate[date].filter(function (item) {
        return !item.allDay && item.startTime && item.endTime;
      });
      for (var i = 0; i < timed.length; i++) {
        for (var j = i + 1; j < timed.length; j++) {
          var aS = parseTimeToMinutes(timed[i].startTime);
          var aE = parseTimeToMinutes(timed[i].endTime);
          var bS = parseTimeToMinutes(timed[j].startTime);
          var bE = parseTimeToMinutes(timed[j].endTime);
          if (aS !== null && aE !== null && bS !== null && bE !== null && aS < bE && bS < aE) {
            conflictIds[timed[i].id] = true;
            conflictIds[timed[j].id] = true;
          }
        }
      }
    });
    return conflictIds;
  }

  function getCalendarStatusLink(item) {
    if (item.calStatus === "on_calendar") {
      if (item.link) return '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">Open calendar event</a>';
      return '<span class="muted">Already on calendar</span>';
    }
    if ((item.calStatus === "needs_review" || item.calStatus === "not_checked")) {
      return '<span class="badge warn">⚠ Calendar unconfirmed</span>';
    }
    if (item.calendarHref) {
      return '<a href="' + escapeHtml(item.calendarHref) + '" target="_blank" rel="noopener">Add to calendar</a>';
    }
    return '';
  }

  // ─── Calendar Command View — renderers ───────────────────────────────────────

  function renderCalendarCommandView(model, visibleItems) {
    var anchor = state.selectedMonth || getCalendarAnchorDate(model);
    state.selectedMonth = anchor;
    var byDate    = groupItemsByDate(visibleItems);
    var conflicts = detectTimeConflicts(visibleItems);

    return [
      '<section class="cal-view">',
      renderCalendarToolbar(anchor, visibleItems),
      '<div class="cal-body">',
      '<div class="cal-main">',
      renderMonthGrid(anchor, byDate, conflicts),
      renderSelectedDayAgenda(byDate, conflicts),
      renderCalendarReviewPanel(visibleItems, conflicts),
      '</div>',
      '<aside class="cal-side">',
      renderUpcomingStrip(visibleItems),
      renderSourceLedger(model),
      '</aside>',
      '</div>',
      '</section>'
    ].join("");
  }

  function renderCalendarToolbar(anchor, visibleItems) {
    var title = MONTH_NAMES[anchor.month] + " " + anchor.year;
    var mStart = anchor.year + "-" + pad2(anchor.month + 1) + "-01";
    var mEnd   = anchor.year + "-" + pad2(anchor.month + 1) + "-31";
    var monthItems    = visibleItems.filter(function (i) { return i.date && i.date >= mStart && i.date <= mEnd; });
    var actionCount   = monthItems.filter(function (i) { return i.actionRequired; }).length;
    var reviewCount   = monthItems.filter(function (i) { return i.reviewStatus === "needs_review"; }).length;
    var calRiskCount  = monthItems.filter(function (i) {
      return i.calStatus === "not_on_calendar" || i.calStatus === "needs_review" || i.calStatus === "not_checked";
    }).length;

    return [
      '<div class="cal-toolbar glass-panel">',
      '  <div class="cal-toolbar-left">',
      '    <p class="eyebrow">Calendar command</p>',
      '    <span class="cal-month-title">' + escapeHtml(title) + '</span>',
      '  </div>',
      '  <div class="cal-toolbar-counts">',
      '    <span><b>' + monthItems.length + '</b>This month</span>',
      '    <span class="' + (actionCount  ? 'count-warn' : '') + '"><b>' + actionCount  + '</b>Actions</span>',
      '    <span class="' + (reviewCount  ? 'count-warn' : '') + '"><b>' + reviewCount  + '</b>Review</span>',
      '    <span class="' + (calRiskCount ? 'count-warn' : '') + '"><b>' + calRiskCount + '</b>Cal risk</span>',
      '  </div>',
      '  <nav class="cal-nav" aria-label="Month navigation">',
      '    <button class="cal-nav-btn" data-cal-month="prev" aria-label="Previous month">&#8249;</button>',
      '    <button class="cal-nav-btn cal-nav-btn--today" data-cal-month="today" aria-label="Go to today">Today</button>',
      '    <button class="cal-nav-btn" data-cal-month="next" aria-label="Next month">&#8250;</button>',
      '  </nav>',
      '</div>'
    ].join("");
  }

  function renderMonthGrid(anchor, byDate, conflicts) {
    var weeks  = getMonthMatrix(anchor.year, anchor.month);
    var tKey   = todayKey();
    var header = '<div class="cal-grid-header">' + DOW_LABELS.map(function (d) {
      return '<div class="cal-dow">' + d + '</div>';
    }).join("") + '</div>';

    var rows = weeks.map(function (week) {
      return '<div class="cal-week">' + week.map(function (cell) {
        var key = cell.year + "-" + pad2(cell.month + 1) + "-" + pad2(cell.day);
        return renderDayCell(cell, key, byDate[key] || [], key === tKey, key === state.selectedDate, conflicts);
      }).join("") + '</div>';
    }).join("");

    return '<div class="cal-grid glass-panel">' + header + rows + '</div>';
  }

  function renderDayCell(cell, key, dayItems, isTodayCell, isSelected, conflicts) {
    var hasAction   = dayItems.some(function (i) { return i.actionRequired; });
    var hasReview   = dayItems.some(function (i) {
      return i.reviewStatus === "needs_review" || i.calStatus === "needs_review" ||
             i.calStatus === "not_checked" || i.calStatus === "not_on_calendar";
    });
    var hasConflict = dayItems.some(function (i) { return conflicts[i.id]; });

    var cls = "cal-day" +
      (!cell.isCurrentMonth ? " cal-day--overflow" : "") +
      (isTodayCell   ? " cal-day--today"    : "") +
      (isSelected    ? " cal-day--selected" : "") +
      (hasConflict   ? " cal-day--conflict" : "");

    var dots = (hasAction   ? '<span class="cal-dot cal-dot--action"   title="Action needed"></span>'  : "") +
               (hasReview   ? '<span class="cal-dot cal-dot--review"   title="Needs review"></span>'   : "") +
               (hasConflict ? '<span class="cal-dot cal-dot--conflict" title="Time conflict"></span>'  : "");

    var pills = dayItems.slice(0, 3).map(function (item) {
      return '<div class="cal-pill accent-' + escapeHtml(item.accent) + '" title="' + escapeHtml(item.title) + '">' +
        escapeHtml(item.title) + '</div>';
    }).join("");

    var overflow = dayItems.length > 3
      ? '<div class="cal-overflow">+' + (dayItems.length - 3) + ' more</div>'
      : "";

    return [
      '<button class="' + cls + '" data-cal-date="' + escapeHtml(key) + '">',
      '  <div class="cal-day-hd"><span class="cal-day-num">' + cell.day + '</span>',
      dots ? '<span class="cal-day-dots">' + dots + '</span>' : '',
      '  </div>',
      pills,
      overflow,
      '</button>'
    ].join("");
  }

  function renderSelectedDayAgenda(byDate, conflicts) {
    if (!state.selectedDate) {
      return [
        '<div class="cal-agenda glass-panel">',
        '  <p class="eyebrow">Day agenda</p>',
        '  <p class="muted">Click a day on the calendar to see its items here.</p>',
        '</div>'
      ].join("");
    }

    var dayItems  = byDate[state.selectedDate] || [];
    var dateLabel = formatLongDate(state.selectedDate);

    return [
      '<div class="cal-agenda glass-panel">',
      '  <p class="eyebrow">Day agenda</p>',
      '  <h3 class="cal-agenda-date">' + escapeHtml(dateLabel) + '</h3>',
      dayItems.length
        ? dayItems.map(function (item) { return renderAgendaItem(item, conflicts); }).join("")
        : '<p class="muted">No items scheduled for this day.</p>',
      '</div>'
    ].join("");
  }

  function renderAgendaItem(item, conflicts) {
    var hasConflict = conflicts[item.id];
    var deadline    = item.deadline ? '<span class="deadline">Due ' + escapeHtml(formatDate(item.deadline)) + '</span>' : '';

    return [
      '<div class="agenda-item' + (hasConflict ? ' agenda-item--conflict' : '') + '">',
      '  <div class="agenda-item-hd">',
      '    <span class="agenda-accent-bar accent-' + escapeHtml(item.accent) + '"></span>',
      '    <span class="agenda-time">' + escapeHtml(item.time) + '</span>',
      '    <span class="category-pill">' + escapeHtml(item.categoryLabel) + '</span>',
      hasConflict ? '<span class="badge warn agenda-conflict-badge">⚠ Conflict</span>' : '',
      '  </div>',
      '  <button class="agenda-title" data-open-item="' + escapeHtml(item.id) + '">' + escapeHtml(item.title) + '</button>',
      '  <div class="agenda-meta"><span>' + escapeHtml(item.kid) + '</span><span>' + escapeHtml(item.location) + '</span></div>',
      item.actionRequired
        ? '<div class="action-box"><strong>Action needed</strong><span>' + escapeHtml(item.actions) + '</span>' + deadline + '</div>'
        : '',
      item.prep.length ? renderPrepList(item) : '',
      '  <div class="agenda-badges">',
      renderBadge("Cal", item.calStatus,
        (item.calStatus === "needs_review" || item.calStatus === "not_checked" || item.calStatus === "not_on_calendar") ? "warn" : ""),
      renderBadge("Review", item.reviewStatus, item.reviewStatus === "needs_review" ? "warn" : ""),
      '  </div>',
      '  <div class="agenda-links">',
      item.link ? '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">Open source</a>' : '',
      getCalendarStatusLink(item),
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderUpcomingStrip(visibleItems) {
    var tKey     = todayKey();
    var upcoming = visibleItems.filter(function (item) { return item.date && item.date >= tKey; }).slice(0, 7);

    return [
      '<section class="cal-upcoming glass-panel">',
      '  <p class="eyebrow">Upcoming</p>',
      '  <h3>Next 7 items</h3>',
      upcoming.length
        ? upcoming.map(function (item) {
          return '<button class="upcoming-row" data-open-item="' + escapeHtml(item.id) + '">' +
            '<span class="upcoming-date">' + escapeHtml(item.dateLabel) + '</span>' +
            '<strong>' + escapeHtml(item.title) + '</strong>' +
            '<em>' + escapeHtml(item.kid) + '</em>' +
            '</button>';
        }).join("")
        : '<p class="muted">No upcoming dated items.</p>',
      '</section>'
    ].join("");
  }

  function renderCalendarReviewPanel(visibleItems, conflicts) {
    var flagged = visibleItems.filter(function (item) {
      if (!item.date) return false;
      return item.reviewStatus === "needs_review" ||
             item.calStatus === "needs_review" ||
             item.calStatus === "not_checked" ||
             item.calStatus === "not_on_calendar" ||
             (!item.allDay && !item.startTime) ||
             conflicts[item.id];
    });

    return [
      '<section class="cal-review-panel glass-panel">',
      '  <p class="eyebrow">Calendar risks</p>',
      '  <h3>Needs attention</h3>',
      flagged.length
        ? flagged.map(function (item) {
          var reasons = [];
          if (item.reviewStatus === "needs_review") reasons.push("review");
          if (item.calStatus === "not_on_calendar") reasons.push("not on calendar");
          if (item.calStatus === "needs_review" || item.calStatus === "not_checked") reasons.push("cal unconfirmed");
          if (!item.allDay && !item.startTime) reasons.push("no time");
          if (conflicts[item.id]) reasons.push("conflict");
          return '<button class="review-row" data-open-item="' + escapeHtml(item.id) + '">' +
            '<span class="status-dot accent-' + escapeHtml(item.accent) + '"></span>' +
            '<div class="review-row-body">' +
            '<strong>' + escapeHtml(item.title) + '</strong>' +
            '<span>' + escapeHtml(item.dateLabel) + ' · ' + reasons.join(", ") + '</span>' +
            '</div></button>';
        }).join("")
        : '<p class="muted">No calendar risks for the current filter.</p>',
      '</section>'
    ].join("");
  }

  // ─── Compact card ────────────────────────────────────────────────────────────

  function renderCompactItemCard(item) {
    var urgentCls = (item.priority === "urgent" || item.priority === "high") ? " compact-card--urgent" : "";
    var deadline = item.deadline ? '<span class="compact-deadline">Due ' + escapeHtml(formatDate(item.deadline)) + '</span>' : '';
    return [
      '<article class="compact-card glass-panel accent-' + escapeHtml(item.accent) + urgentCls + '">',
      '  <button class="card-hit" data-open-item="' + escapeHtml(item.id) + '" aria-label="' + escapeHtml(item.title) + '"></button>',
      '  <div class="compact-rail"><span></span></div>',
      '  <div class="compact-body">',
      '    <div class="compact-topline">',
      '      <span class="category-pill">' + escapeHtml(item.categoryLabel) + '</span>',
      item.actionRequired ? '<span class="badge warn compact-flag">Action</span>' : '',
      item.reviewStatus === "needs_review" ? '<span class="badge warn compact-flag">Review</span>' : '',
      (item.calStatus === "not_checked" || item.calStatus === "needs_review" || item.calStatus === "not_on_calendar") ? '<span class="badge warn compact-flag">Cal</span>' : '',
      '    </div>',
      '    <h3 class="compact-title">' + escapeHtml(item.title) + '</h3>',
      '    <div class="compact-meta">',
      '      <span>' + escapeHtml(item.kid) + '</span>',
      item.date ? '<span>' + escapeHtml(item.dateLabel) + (item.allDay ? '' : ' · ' + escapeHtml(item.time)) + '</span>' : '',
      deadline,
      '    </div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function renderSectionSummary(items) {
    var action = items.filter(function (i) { return i.actionRequired; }).length;
    var review = items.filter(function (i) { return i.reviewStatus === "needs_review"; }).length;
    var calRisk = items.filter(function (i) {
      return i.calStatus === "not_checked" || i.calStatus === "needs_review" || i.calStatus === "not_on_calendar";
    }).length;
    return [
      '<div class="section-summary cal-toolbar-counts">',
      '<span><b>' + items.length + '</b>Items</span>',
      '<span class="' + (action ? 'count-warn' : '') + '"><b>' + action + '</b>Actions</span>',
      '<span class="' + (review ? 'count-warn' : '') + '"><b>' + review + '</b>Review</span>',
      '<span class="' + (calRisk ? 'count-warn' : '') + '"><b>' + calRisk + '</b>Cal risk</span>',
      '</div>'
    ].join("");
  }

  function renderTabHero(model, visibleItems) {
    var cat = null;
    for (var ci = 0; ci < VISUAL_CATEGORIES.length; ci++) {
      if (VISUAL_CATEGORIES[ci].id === state.activeCategory) { cat = VISUAL_CATEGORIES[ci]; break; }
    }
    var label = cat ? cat.label : titleCase(state.activeCategory);
    var dateItems = visibleItems.filter(function (i) { return i.date; });
    var earliest = dateItems.length ? dateItems[0].dateLabel : null;
    var latest = dateItems.length ? dateItems[dateItems.length - 1].dateLabel : null;
    return [
      '<section class="tab-hero glass-panel">',
      '  <div class="tab-hero-inner">',
      '    <p class="eyebrow">' + escapeHtml(label) + ' tab</p>',
      '    <h1 class="tab-hero-title">' + escapeHtml(label) + '</h1>',
      earliest ? '<p class="tab-hero-range muted">' + escapeHtml(earliest) + ' → ' + escapeHtml(latest) + '</p>' : '',
      '  </div>',
      '</section>'
    ].join("");
  }

  function renderTabShell(model, visibleItems) {
    var priorityItems = visibleItems.filter(function (i) { return i.isPriority; });
    var normalItems = visibleItems.filter(function (i) { return !i.isPriority; });
    var priorityStrip = priorityItems.length
      ? '<div class="priority-strip"><p class="eyebrow strip-label">Needs attention · ' + priorityItems.length + ' item(s)</p><div class="compact-grid">' + priorityItems.map(renderCompactItemCard).join("") + '</div></div>'
      : '';
    var mainGrid = normalItems.length
      ? '<div class="compact-grid">' + normalItems.map(renderCompactItemCard).join("") + '</div>'
      : (!priorityItems.length ? '<div class="empty-state glass-panel"><p class="eyebrow">No matches</p><p class="muted">No items match these filters.</p></div>' : '');
    return [
      '<section class="content-grid">',
      '  <div class="event-column">',
      renderSectionSummary(visibleItems),
      priorityStrip,
      mainGrid,
      '  </div>',
      '  <aside class="side-column">',
      renderCalendarOverview(model),
      renderSourceLedger(model),
      '  </aside>',
      '</section>'
    ].join("");
  }

  // ─── Dashboard Notes (localStorage) ──────────────────────────────────────────

  var NOTES_KEY = "familyDesk.auditNotes.v1";

  function localStorageOk() {
    try { localStorage.setItem("__fd_test__", "1"); localStorage.removeItem("__fd_test__"); return true; }
    catch (e) { return false; }
  }

  function getAuditNotes() {
    try {
      var raw = localStorage.getItem(NOTES_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function saveAuditNotes(notes) {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); return true; }
    catch (e) { return false; }
  }

  function addAuditNote(noteData) {
    var notes = getAuditNotes();
    var note = {
      id: "note-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
      section: noteData.section || "general",
      kid: noteData.kid || "all",
      type: noteData.type || "observation",
      title: noteData.title || "",
      text: noteData.text || "",
      status: "open",
      createdAt: new Date().toISOString(),
      exported: false
    };
    notes.unshift(note);
    saveAuditNotes(notes);
    return note;
  }

  function updateAuditNote(id, changes) {
    var notes = getAuditNotes();
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === id) {
        var keys = Object.keys(changes);
        for (var k = 0; k < keys.length; k++) { notes[i][keys[k]] = changes[keys[k]]; }
        return saveAuditNotes(notes);
      }
    }
    return false;
  }

  function deleteAuditNote(id) {
    var filtered = getAuditNotes().filter(function (n) { return n.id !== id; });
    return saveAuditNotes(filtered);
  }

  function groupAuditNotesBySection(notes) {
    var groups = {};
    notes.forEach(function (note) {
      var s = note.section || "general";
      if (!groups[s]) groups[s] = [];
      groups[s].push(note);
    });
    return groups;
  }

  function buildAuditExportPrompt(notes) {
    var open = notes.filter(function (n) { return n.status !== "exported"; });
    if (!open.length) return "No open audit notes to export.";
    var lines = [
      "You are helping update a family dashboard data file (dashboard-data.js).",
      "Below are audit notes from the Family Desk dashboard.",
      "For each note, update or add the relevant item in dashboard-data.js as described.",
      "Keep all existing items. Return the full updated dashboard-data.js file.",
      "The file must define window.DASHBOARD_DATA = { ... } with no imports.",
      "",
      "AUDIT NOTES:"
    ];
    open.forEach(function (note, i) {
      lines.push("");
      lines.push((i + 1) + ". [" + String(note.section).toUpperCase() + "] [" + (note.kid === "all" ? "Family" : note.kid) + "] [" + note.type + "]");
      if (note.title) lines.push("   Title: " + note.title);
      lines.push("   Note: " + note.text);
      lines.push("   Status: " + note.status);
    });
    lines.push("", "END OF AUDIT NOTES", "", "Return the complete updated dashboard-data.js file.");
    return lines.join("\n");
  }

  // ─── Dashboard Notes renderers ────────────────────────────────────────────────

  function renderDashboardNotesView(model) {
    var notes = getAuditNotes();
    var lsOk = localStorageOk();
    var warningHtml = lsOk ? "" : '<div class="notes-warning">localStorage is unavailable in this browser. Notes will not be saved between sessions.</div>';
    var exportBar = notes.length
      ? '<div class="notes-export-bar"><button class="notes-export-btn" data-notes-action="export-prompt">Export Prompt for ChatGPT</button><span class="notes-export-hint">Generates a prompt to paste into ChatGPT → updated dashboard-data.js</span></div>'
      : '';
    var exportModal = state.exportPromptText ? renderExportPromptModal(state.exportPromptText) : '';
    return [
      '<section class="notes-view">',
      renderNotesAddForm(model),
      '<div class="notes-main">',
      warningHtml,
      renderNotesList(notes),
      '</div>',
      exportBar,
      exportModal,
      '</section>'
    ].join("");
  }

  function renderNotesAddForm(model) {
    var kids = (model.kids || []).filter(function (k) { return k.active !== false; });
    var kidOptions = kids.map(function (k) {
      return '<option value="' + escapeHtml(k.id) + '">' + escapeHtml(k.label) + '</option>';
    }).join("");
    return [
      '<form class="notes-form glass-panel" data-notes-form="add">',
      '  <p class="eyebrow">Dashboard notes</p>',
      '  <h2>Add audit note</h2>',
      '  <div class="notes-form-grid">',
      '    <label class="notes-label">Section<select name="section" class="notes-select">',
      '      <option value="general">General</option>',
      '      <option value="school">School</option>',
      '      <option value="dance">Dance</option>',
      '      <option value="theater">Theater</option>',
      '      <option value="sports">Sports</option>',
      '      <option value="family">Family</option>',
      '      <option value="calendar">Calendar</option>',
      '    </select></label>',
      '    <label class="notes-label">Kid<select name="kid" class="notes-select">' + kidOptions + '</select></label>',
      '    <label class="notes-label">Type<select name="type" class="notes-select">',
      '      <option value="observation">Observation</option>',
      '      <option value="reminder">Reminder</option>',
      '      <option value="question">Question</option>',
      '      <option value="action">Action</option>',
      '      <option value="export-ready">Export ready</option>',
      '    </select></label>',
      '    <label class="notes-label notes-label--wide">Note title<input type="text" name="title" class="notes-input" placeholder="Short title (optional)" /></label>',
      '    <label class="notes-label notes-label--full">Note text<textarea name="text" class="notes-textarea" placeholder="What needs to be updated, checked, or remembered?" rows="3"></textarea></label>',
      '  </div>',
      '  <button type="submit" class="notes-submit">Save Note</button>',
      '</form>'
    ].join("");
  }

  function renderNotesList(notes) {
    if (!notes.length) {
      return '<div class="notes-empty glass-panel"><p class="eyebrow">No notes yet</p><p class="muted">Use the form above to add audit notes. Notes are saved in your browser only.</p></div>';
    }
    var groups = groupAuditNotesBySection(notes);
    return Object.keys(groups).map(function (section) {
      return [
        '<div class="notes-section">',
        '<h3 class="notes-section-title">' + escapeHtml(titleCase(section)) + ' <span class="notes-count">' + groups[section].length + '</span></h3>',
        groups[section].map(renderNoteCard).join(""),
        '</div>'
      ].join("");
    }).join("");
  }

  function renderNoteCard(note) {
    var typeAccent = { reminder: "amber", question: "sky", action: "rose", observation: "mint", "export-ready": "gold" };
    var accent = typeAccent[note.type] || "slate";
    var exportedCls = note.exported ? " note-card--exported" : "";
    var doneCls = note.status === "done" ? " note-card--done" : "";
    var safeId = escapeHtml(note.id);
    return [
      '<div class="note-card glass-panel accent-' + escapeHtml(accent) + exportedCls + doneCls + '">',
      '  <div class="note-card-rail"><span></span></div>',
      '  <div class="note-card-body">',
      '    <div class="note-card-hd">',
      '      <span class="category-pill">' + escapeHtml(note.type) + '</span>',
      '      <span class="note-kid">' + escapeHtml(note.kid === "all" ? "Family" : note.kid) + '</span>',
      '      <span class="note-date">' + escapeHtml(new Date(note.createdAt).toLocaleDateString()) + '</span>',
      note.exported ? '<span class="badge">Exported</span>' : '',
      note.status === "done" ? '<span class="badge">Done</span>' : '',
      '    </div>',
      note.title ? '<p class="note-title">' + escapeHtml(note.title) + '</p>' : '',
      '    <p class="note-text">' + escapeHtml(note.text) + '</p>',
      '    <div class="note-actions">',
      note.status !== "done"
        ? '<button class="note-btn" data-notes-action="mark-done" data-note-id="' + safeId + '">Mark done</button>'
        : '<button class="note-btn" data-notes-action="mark-open" data-note-id="' + safeId + '">Reopen</button>',
      '<button class="note-btn note-btn--export" data-notes-action="mark-exported" data-note-id="' + safeId + '">Mark exported</button>',
      '<button class="note-btn note-btn--delete" data-notes-action="delete" data-note-id="' + safeId + '">Delete</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderExportPromptModal(promptText) {
    return [
      '<div class="notes-modal-backdrop" data-close-export-modal="true">',
      '  <section class="notes-modal glass-panel" role="dialog" aria-modal="true" onclick="event.stopPropagation()">',
      '    <button class="close-overlay" data-close-export-modal="true" aria-label="Close">×</button>',
      '    <p class="eyebrow">Export prompt</p>',
      '    <h2>Copy this prompt for ChatGPT</h2>',
      '    <p class="muted">Paste into ChatGPT → it returns an updated dashboard-data.js.</p>',
      '    <textarea class="notes-export-textarea" readonly rows="14">' + escapeHtml(promptText) + '</textarea>',
      '    <button class="notes-submit" data-notes-copy-prompt="true">Copy to clipboard</button>',
      '  </section>',
      '</div>'
    ].join("");
  }

  // ─── Event delegation ─────────────────────────────────────────────────────────

  function attachEvents(model) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-category]"), function (button) {
      button.addEventListener("click", function () {
        state.activeCategory = button.getAttribute("data-category");
        state.selectedItemId = null;
        state.exportPromptText = null;
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
        event.stopPropagation();
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

    // Calendar month navigation
    Array.prototype.forEach.call(root.querySelectorAll("[data-cal-month]"), function (button) {
      button.addEventListener("click", function () {
        var action = button.getAttribute("data-cal-month");
        var cur = state.selectedMonth || { year: new Date().getFullYear(), month: new Date().getMonth() };
        if (action === "prev") {
          state.selectedMonth = cur.month === 0
            ? { year: cur.year - 1, month: 11 }
            : { year: cur.year, month: cur.month - 1 };
        } else if (action === "next") {
          state.selectedMonth = cur.month === 11
            ? { year: cur.year + 1, month: 0 }
            : { year: cur.year, month: cur.month + 1 };
        } else if (action === "today") {
          var t = new Date();
          state.selectedMonth = { year: t.getFullYear(), month: t.getMonth() };
          state.selectedDate  = null;
        }
        renderDashboard(model);
      });
    });

    // Calendar day selection — stopPropagation from child data-open-item buttons is set above
    Array.prototype.forEach.call(root.querySelectorAll("[data-cal-date]"), function (button) {
      button.addEventListener("click", function () {
        var key = button.getAttribute("data-cal-date");
        state.selectedDate = state.selectedDate === key ? null : key;
        renderDashboard(model);
      });
    });

    // Notes form submit
    var notesForm = root.querySelector("[data-notes-form='add']");
    if (notesForm) {
      notesForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var fd = new FormData(notesForm);
        var text = (fd.get("text") || "").toString().trim();
        if (!text) return;
        addAuditNote({
          section: (fd.get("section") || "general").toString(),
          kid: (fd.get("kid") || "all").toString(),
          type: (fd.get("type") || "observation").toString(),
          title: (fd.get("title") || "").toString().trim(),
          text: text
        });
        renderDashboard(model);
      });
    }

    // Notes action buttons (mark-done, mark-open, mark-exported, delete, export-prompt)
    Array.prototype.forEach.call(root.querySelectorAll("[data-notes-action]"), function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        var action = button.getAttribute("data-notes-action");
        var noteId = button.getAttribute("data-note-id");
        if (action === "delete" && noteId) {
          deleteAuditNote(noteId);
          renderDashboard(model);
        } else if (action === "mark-done" && noteId) {
          updateAuditNote(noteId, { status: "done" });
          renderDashboard(model);
        } else if (action === "mark-open" && noteId) {
          updateAuditNote(noteId, { status: "open", exported: false });
          renderDashboard(model);
        } else if (action === "mark-exported" && noteId) {
          updateAuditNote(noteId, { exported: true, status: "exported" });
          renderDashboard(model);
        } else if (action === "export-prompt") {
          state.exportPromptText = buildAuditExportPrompt(getAuditNotes());
          renderDashboard(model);
        }
      });
    });

    // Copy prompt button inside export modal
    var copyBtn = root.querySelector("[data-notes-copy-prompt]");
    if (copyBtn) {
      copyBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        var text = state.exportPromptText || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(function () {});
        }
        copyBtn.textContent = "Copied!";
        setTimeout(function () { if (copyBtn.parentNode) copyBtn.textContent = "Copy to clipboard"; }, 2200);
      });
    }

    // Export modal close (backdrop click or × button)
    Array.prototype.forEach.call(root.querySelectorAll("[data-close-export-modal]"), function (el) {
      el.addEventListener("click", function (event) {
        if (el.tagName !== "BUTTON" && event.target !== el) return;
        state.exportPromptText = null;
        renderDashboard(model);
      });
    });
  }

  // ─── Main render entry ────────────────────────────────────────────────────────

  function renderDashboard(model) {
    currentModel = model;
    if (model.error) {
      renderDataProblem(model);
      return;
    }

    var visibleItems = getVisibleItems(model);

    if (state.activeCategory === "calendar") {
      root.innerHTML = [
        '<main class="family-desk">',
        renderTopNav(model),
        renderCalendarCommandView(model, visibleItems),
        renderOverlay(model),
        '</main>'
      ].join("");
      attachEvents(model);
      return;
    }

    if (state.activeCategory === "dashboard-notes") {
      root.innerHTML = [
        '<main class="family-desk">',
        renderTopNav(model),
        renderDashboardNotesView(model),
        '</main>'
      ].join("");
      attachEvents(model);
      return;
    }

    if (state.activeCategory === "all") {
      root.innerHTML = [
        '<main class="family-desk">',
        renderTopNav(model),
        renderHero(model, visibleItems),
        renderTodayBrief(model),
        renderTabShell(model, visibleItems),
        renderOverlay(model),
        '</main>'
      ].join("");
    } else {
      root.innerHTML = [
        '<main class="family-desk">',
        renderTopNav(model),
        renderTabHero(model, visibleItems),
        renderTabShell(model, visibleItems),
        renderOverlay(model),
        '</main>'
      ].join("");
    }
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
