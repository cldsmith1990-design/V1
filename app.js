/*
  app.js — Family Desk dashboard renderer
  Accessibility: focus-trap, keyboard activation, aria-pressed, aria-live
*/
(function () {
  'use strict';

  var NOTES_KEY = "fd_audit_notes_v1";

  var state = {
    activeKid: 'all',
    activeCategory: 'all'
  };

  var COLOR_TO_ACCENT = {
    purple: 'accent-violet',
    blue:   'accent-sky',
    rose:   'accent-rose',
    mint:   'accent-mint',
    gold:   'accent-amber'
  };

  function log() { if (window.DEBUG_FD) console.debug.apply(console, arguments); }

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function todayKey() {
    var t = new Date();
    return t.getFullYear() + "-" + pad2(t.getMonth() + 1) + "-" + pad2(t.getDate());
  }

  function tomorrowKey() {
    var t = new Date();
    t.setDate(t.getDate() + 1);
    return t.getFullYear() + "-" + pad2(t.getMonth() + 1) + "-" + pad2(t.getDate());
  }

  function parseDateKey(d) {
    if (!d) return null;
    if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var parts = String(d).split(/[-T ]/)[0].split("-");
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function formatDateLong(d) {
    var dt = parseDateKey(d);
    if (!dt) return "";
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatDateSection(d) {
    if (d === todayKey()) return 'Today';
    if (d === tomorrowKey()) return 'Tomorrow';
    return formatDateLong(d);
  }

  function formatTime(t) {
    if (!t) return '';
    var parts = String(t).split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + (m !== '00' ? ':' + m : '') + ' ' + ampm;
  }

  function kidAccentClass(model, childIds) {
    if (!childIds || !childIds.length) return '';
    var kid = (model.children || []).find(function (k) { return k.id === childIds[0]; });
    if (!kid || !kid.colorKey) return '';
    return COLOR_TO_ACCENT[kid.colorKey] || '';
  }

  function createCalendarHref(item, location) {
    if (!item || !item.date) return "";
    var title = item.title || "Family Dashboard item";
    var text = (item.notes || '') + (item.source && item.source.summary ? '\n\n' + item.source.summary : '');
    var where = (location && (location.name || location.address)) ? (location.name || location.address) : '';
    var start, end;
    var date = String(item.date).replace(/-/g, '');
    if (item.startTime) {
      var s = String(item.startTime).replace(/:/g, '');
      start = date + 'T' + (s.length === 4 ? s + '00' : s);
      if (item.endTime) {
        var e = String(item.endTime).replace(/:/g, '');
        end = date + 'T' + (e.length === 4 ? e + '00' : e);
      } else {
        var hour = parseInt(s.slice(0, 2), 10) || 9;
        var endHour = (hour + 1) % 24;
        end = date + 'T' + (('0' + endHour).slice(-2) + (s.slice(2) || '00') + '00');
      }
    } else {
      start = date;
      end = date;
    }
    var params = [];
    params.push('action=TEMPLATE');
    params.push('text=' + encodeURIComponent(title));
    if (text) params.push('details=' + encodeURIComponent(text));
    if (where) params.push('location=' + encodeURIComponent(where));
    params.push('dates=' + encodeURIComponent(start + '/' + end));
    return 'https://calendar.google.com/calendar/render?' + params.join('&');
  }

  function validateDashboardData(raw) {
    var errors = [];
    if (!raw) { errors.push('No data supplied'); return { ok: false, errors: errors }; }
    if (!raw.meta) errors.push('Missing meta');
    if (!Array.isArray(raw.children)) errors.push('Missing children array');
    if (!Array.isArray(raw.items)) errors.push('Missing items array');
    if (errors.length) return { ok: false, errors: errors };
    return { ok: true };
  }

  function buildModel(raw) {
    var model = { meta: raw.meta || {}, children: raw.children || [], categories: raw.categories || [], items: [] };
    (raw.items || []).forEach(function (it, idx) {
      var copy = Object.assign({}, it);
      copy._index = idx;
      copy._dateObj = parseDateKey(copy.date);
      copy._dateKey = copy.date || null;
      copy._timeSort = copy.startTime ? (String(copy.startTime) + (copy.endTime || '')) : 'zzzz';
      model.items.push(copy);
    });
    model.items.sort(function (a, b) {
      if (!a._dateKey && !b._dateKey) return 0;
      if (!a._dateKey) return 1;
      if (!b._dateKey) return -1;
      if (a._dateKey < b._dateKey) return -1;
      if (a._dateKey > b._dateKey) return 1;
      if ((a.startTime || '') < (b.startTime || '')) return -1;
      if ((a.startTime || '') > (b.startTime || '')) return 1;
      return 0;
    });
    return model;
  }

  function getFilteredItems(model) {
    return model.items.filter(function (it) {
      if (state.activeKid !== 'all') {
        var ids = it.childIds || [];
        if (!ids.some(function (id) { return id === state.activeKid; })) return false;
      }
      if (state.activeCategory !== 'all') {
        if (it.category !== state.activeCategory) return false;
      }
      return true;
    });
  }

  // Focus trap utility — returns a release function
  function trapFocus(container) {
    if (!container) return function () {};
    var selectors = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    var nodes = Array.prototype.slice.call(container.querySelectorAll(selectors));
    if (!nodes.length) return function () {};
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    function keyHandler(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }
    container.addEventListener('keydown', keyHandler);
    return function release() { container.removeEventListener('keydown', keyHandler); };
  }

  // Live region for small announcements
  function ensureLiveRegion() {
    var lr = document.getElementById('fd-status');
    if (lr) return lr;
    lr = document.createElement('div');
    lr.id = 'fd-status';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.style.position = 'absolute';
    lr.style.left = '-9999px';
    document.body.appendChild(lr);
    return lr;
  }
  function announce(msg) { try { ensureLiveRegion().textContent = msg; } catch (e) {} }

  function syncFilterActiveClasses() {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-pill'), function (b) {
      var isActive = b.getAttribute('data-kid') === state.activeKid;
      b.setAttribute('aria-pressed', isActive);
      if (isActive) b.classList.add('is-active'); else b.classList.remove('is-active');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
      var isActive = c.getAttribute('data-cat') === state.activeCategory;
      c.setAttribute('aria-pressed', isActive);
      if (isActive) c.classList.add('is-active'); else c.classList.remove('is-active');
    });
  }

  function renderTopNav(model, container) {
    var kids = model.children || [];
    var kidHtml = '<button class="nav-pill' + (state.activeKid === 'all' ? ' is-active' : '') + '" data-kid="all" aria-pressed="' + (state.activeKid === 'all') + '">Family</button>' +
      kids.map(function (k) {
        var active = state.activeKid === k.id;
        return '<button class="nav-pill kid-' + escapeHtml(k.colorKey || 'gold') + (active ? ' is-active' : '') + '" data-kid="' + escapeHtml(k.id) + '" aria-pressed="' + active + '">' + escapeHtml(k.displayName) + '</button>';
      }).join('\n');
    var catHtml = '<button class="chip' + (state.activeCategory === 'all' ? ' is-active' : '') + '" data-cat="all" aria-pressed="' + (state.activeCategory === 'all') + '">All</button>' +
      (model.categories || []).filter(function (c) { return c.visible !== false; }).map(function (c) {
        var active = state.activeCategory === c.id;
        return '<button class="chip' + (active ? ' is-active' : '') + '" data-cat="' + escapeHtml(c.id) + '" aria-pressed="' + active + '">' + escapeHtml(c.label) + '</button>';
      }).join('\n');

    container.innerHTML = '\n      <header class="top-nav glass-panel" role="navigation" aria-label="Top navigation">\n        <a class="brand-mark" href="#" aria-label="Family Desk home"><span>FD</span><strong>Family Desk</strong></a>\n        <nav class="kid-filter" aria-label="Kid filter">' + kidHtml + '</nav>\n        <nav class="category-filter" aria-label="Category filter">' + catHtml + '</nav>\n      </header>\n    ';
  }

  function renderHero(model, container) {
    var today = todayKey();
    var filtered = getFilteredItems(model);
    var todayItems = filtered.filter(function (it) { return it._dateKey === today; });
    var upcoming = filtered.filter(function (it) { return it._dateKey && it._dateKey >= today; }).slice(0, 8);
    var urgentCount = filtered.filter(function (i) { return i.priority === 'urgent'; }).length;
    var actionCount = filtered.filter(function (i) { return i.actionNeeded && i.actionNeeded.required; }).length;
    var html = '\n      <section class="hero-grid">\n        <article class="glass-panel hero-copy">\n          <p class="eyebrow">Family Dashboard</p>\n          <h1>' + (today ? 'Today' : 'Desk') + '</h1>\n          <p class="deck">Quick view of what matters today. Replace <strong>dashboard-data.js</strong> and refresh to update the desk.</p>\n          <div class="hero-metrics">\n            <span><b>' + escapeHtml(String(todayItems.length)) + '</b> Today</span>\n            <span><b>' + escapeHtml(String(upcoming.length)) + '</b> Upcoming</span>\n            <span><b>' + escapeHtml(String(urgentCount)) + '</b> Urgent</span>\n            <span><b>' + escapeHtml(String(actionCount)) + '</b> Actions</span>\n          </div>\n        </article>\n        <aside class="forward-card glass-panel">\n          <p class="eyebrow">Forward look</p>\n          <h2>Upcoming</h2>\n          <div class="mini-meta">' + (upcoming.length ? upcoming.map(function (it) {
      return '<button class="mini-card" data-open-item="' + escapeHtml(it.id) + '"><span>' + escapeHtml(formatDateSection(it._dateKey)) + (it.startTime ? ' · ' + escapeHtml(formatTime(it.startTime)) : '') + '</span><strong>' + escapeHtml(it.title) + '</strong><em>' + escapeHtml((it.childNames || []).join(', ')) + '</em></button>';
    }).join('\n') : '<p class="muted">No upcoming items.</p>') + '</div>\n        </aside>\n      </section>\n    ';
    container.innerHTML = html;
  }

  function renderMain(model, container) {
    var today = todayKey();
    var filtered = getFilteredItems(model);

    if (!filtered.length) {
      container.innerHTML = '<div class="content-grid"><div class="event-column"><div class="glass-panel empty-state"><p class="eyebrow">No results</p><h2>Nothing here</h2><p>No items match the current filter. Try selecting a different child or category.</p></div></div><aside class="side-column">' + renderSideColumn(model, filtered, today) + '</aside></div>';
      return;
    }

    var byDate = {};
    filtered.forEach(function (it) {
      var k = it._dateKey || 'unscheduled';
      byDate[k] = byDate[k] || [];
      byDate[k].push(it);
    });
    var keys = Object.keys(byDate).sort(function (a, b) { if (a === 'unscheduled') return 1; if (b === 'unscheduled') return -1; return a < b ? -1 : (a > b ? 1 : 0); });
    var html = '<div class="content-grid">\n  <div class="event-column">';
    keys.forEach(function (k) {
      html += '<div class="section-heading"><h2>' + (k === 'unscheduled' ? 'Unscheduled' : escapeHtml(formatDateSection(k))) + '</h2></div>';
      byDate[k].forEach(function (it) {
        var accent = kidAccentClass(model, it.childIds);
        var priorityBadge = '';
        if (it.priority === 'urgent') {
          priorityBadge = '<span class="badge hot">Urgent</span>';
        } else if (it.priority === 'high') {
          priorityBadge = '<span class="badge warn">High priority</span>';
        }
        var actionBadge = (it.actionNeeded && it.actionNeeded.required)
          ? '<span class="badge warn"><b>Action:</b> ' + escapeHtml(it.actionNeeded.label || 'Action required') + '</span>'
          : '';
        var timeStr = it.startTime ? escapeHtml(formatTime(it.startTime)) + (it.endTime ? ' – ' + escapeHtml(formatTime(it.endTime)) : '') : '';
        var locationStr = it.location && it.location.name ? escapeHtml(it.location.name) : '';
        var metaRight = [timeStr, locationStr].filter(Boolean).join(' · ');
        var showCalLink = it.date && it.calendarStatus !== 'on_calendar';
        var calLink = showCalLink ? '<a href="' + escapeHtml(createCalendarHref(it, it.location || {})) + '" target="_blank" rel="noopener">Add to Calendar</a>' : (it.calendarStatus === 'on_calendar' ? '<span>On calendar</span>' : '');
        var typeLabel = it.type === 'task' ? '<span class="badge">Task</span>' : '';
        html += '<article class="event-card ' + escapeHtml(accent) + '" data-open-item="' + escapeHtml(it.id) + '">\n          <div class="event-rail"><span></span></div>\n          <div class="event-main">\n            <div class="event-topline"><span class="category-pill">' + escapeHtml(it.category || '') + '</span><span>' + escapeHtml(metaRight || (it.childNames || []).join(', ')) + '</span></div>\n            <h3>' + escapeHtml(it.title || 'Untitled') + '</h3>\n            <p class="summary-line">' + escapeHtml(it.notes || (it.source && it.source.summary) || '') + '</p>\n            <div class="badge-row">' + priorityBadge + actionBadge + typeLabel + '</div>\n            <div class="card-links">' + calLink + '<span>' + escapeHtml(it.childNames && it.childNames.join(', ') || '') + '</span></div>\n          </div>\n        </article>';
      });
    });
    html += '</div>\n  <aside class="side-column">' + renderSideColumn(model, filtered, today) + '</aside>\n</div>';
    container.innerHTML = html;
  }

  function renderSideColumn(model, filtered, today) {
    var todayItems = filtered.filter(function (it) { return it._dateKey === today; });
    var actionItems = filtered.filter(function (it) { return it.actionNeeded && it.actionNeeded.required; });
    var todayHtml = '<section class="glass-panel today-brief"><h2>Today</h2><div id="today-list">';
    if (!todayItems.length) {
      todayHtml += '<p class="muted">No items for today.</p>';
    } else {
      todayItems.forEach(function (it) {
        var timeStr = it.startTime ? formatTime(it.startTime) : '';
        todayHtml += '<div class="calendar-row"><strong>' + escapeHtml(it.title) + '</strong><div>' + escapeHtml([timeStr, it.location && it.location.name].filter(Boolean).join(' · ')) + '</div></div>';
      });
    }
    todayHtml += '</div></section>';

    var actionsHtml = '';
    if (actionItems.length) {
      actionsHtml = '<section class="glass-panel today-brief"><p class="eyebrow">Needs attention</p><h2>Actions</h2><div>';
      actionItems.forEach(function (it) {
        var due = it.actionNeeded.dueDate ? ' · Due ' + formatDateLong(it.actionNeeded.dueDate) : '';
        actionsHtml += '<div class="calendar-row"><strong>' + escapeHtml(it.actionNeeded.label || it.title) + '</strong><div>' + escapeHtml(it.title) + escapeHtml(due) + '</div></div>';
      });
      actionsHtml += '</div></section>';
    }

    var sourcesHtml = '<section class="glass-panel source-ledger"><h2>Sources</h2><div class="muted source-range">' + escapeHtml((model.meta && model.meta.sourceTypesReviewed && Array.isArray(model.meta.sourceTypesReviewed)) ? model.meta.sourceTypesReviewed.join(', ') : '') + '</div>';
    if (model.meta && model.meta.sourceWindow) {
      sourcesHtml += '<div class="muted source-range" style="margin-top:8px;font-size:.8rem;">' + escapeHtml(model.meta.sourceWindow.startDate || '') + ' – ' + escapeHtml(model.meta.sourceWindow.endDate || '') + '</div>';
    }
    sourcesHtml += '</section>';

    return todayHtml + actionsHtml + sourcesHtml;
  }

  function openOverlay(item, model, opener) {
    var backdrop = document.createElement('div');
    backdrop.className = 'overlay-backdrop';
    backdrop.setAttribute('data-overlay', 'true');

    var titleId = 'overlay-title-' + Date.now();

    var timeStr = item.startTime ? formatTime(item.startTime) + (item.endTime ? ' – ' + formatTime(item.endTime) : '') : '—';
    var locationName = item.location && item.location.name ? item.location.name : '';
    var locationNotes = item.location && item.location.notes ? item.location.notes : '';

    var factsHtml = '<div class="overlay-facts fact-grid">' +
      '<div><dt>Date</dt><dd>' + escapeHtml(item._dateKey ? formatDateSection(item._dateKey) : 'Unscheduled') + '</dd></div>' +
      '<div><dt>Time</dt><dd>' + escapeHtml(timeStr) + '</dd></div>' +
      (locationName ? '<div><dt>Location</dt><dd>' + escapeHtml(locationName) + (locationNotes ? '<br><small style="color:var(--muted)">' + escapeHtml(locationNotes) + '</small>' : '') + '</dd></div>' : '') +
      (item.actionNeeded && item.actionNeeded.assignedTo ? '<div><dt>Assigned to</dt><dd>' + escapeHtml(item.actionNeeded.assignedTo) + '</dd></div>' : '') +
      '</div>';

    var actionHtml = '';
    if (item.actionNeeded && item.actionNeeded.required) {
      actionHtml = '<div class="action-box">' +
        '<strong>Action needed</strong>' +
        '<p style="margin:6px 0 0">' + escapeHtml(item.actionNeeded.label || 'Action required') + '</p>' +
        (item.actionNeeded.dueDate ? '<div class="deadline">Due: ' + escapeHtml(formatDateLong(item.actionNeeded.dueDate)) + '</div>' : '') +
        (item.actionNeeded.assignedTo ? '<div style="color:var(--muted);font-size:.85rem">Assigned: ' + escapeHtml(item.actionNeeded.assignedTo) + '</div>' : '') +
        '</div>';
    }

    var prepHtml = '';
    if (item.prepItems && item.prepItems.length) {
      prepHtml = '<div class="prep-list"><strong>Prep items</strong><ul>' +
        item.prepItems.map(function (p) {
          return '<li><span></span>' + escapeHtml(p.label || '') + (p.status && p.status !== 'done' ? '<em> · ' + escapeHtml(p.status) + '</em>' : '') + '</li>';
        }).join('') +
        '</ul></div>';
    }

    var showCalLink = item.date && item.calendarStatus !== 'on_calendar';
    var linksHtml = '<div class="card-links">' +
      (showCalLink ? '<a href="' + escapeHtml(createCalendarHref(item, item.location || {})) + '" target="_blank" rel="noopener">Open in Calendar</a>' : '') +
      (item.source && item.source.link ? '<a href="' + escapeHtml(item.source.link) + '" target="_blank" rel="noopener">View in Gmail</a>' : '') +
      '<button class="notes-add-btn">Add note</button>' +
      '</div>';

    var sourceHtml = '';
    if (item.source) {
      var subjectLine = item.source.subject ? '<div style="color:var(--paper);font-size:.9rem">' + escapeHtml(item.source.subject) + '</div>' : '';
      var senderLine = item.source.sender ? '<div style="color:var(--muted);font-size:.82rem">' + escapeHtml(item.source.sender) + '</div>' : '';
      if (subjectLine || senderLine) {
        sourceHtml = '<div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">' + subjectLine + senderLine + '</div>';
      }
    }

    backdrop.innerHTML = '<div class="detail-overlay glass-panel" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">\n      <button class="close-overlay" aria-label="Close dialog">×</button>\n      <p class="eyebrow">' + escapeHtml((item.category || '') + (item.type ? ' · ' + item.type : '')) + '</p>\n      <h2 id="' + titleId + '">' + escapeHtml(item.title || 'Item') + '</h2>\n      <div class="overlay-summary">' + escapeHtml(item.notes || (item.source && item.source.summary) || '') + '</div>\n      ' + factsHtml + actionHtml + prepHtml + linksHtml + sourceHtml + '\n    </div>';

    var main = document.querySelector('.family-desk');
    if (main) main.setAttribute('aria-hidden', 'true');

    document.body.appendChild(backdrop);

    var dialog = backdrop.querySelector('.detail-overlay');
    var closeBtn = dialog.querySelector('.close-overlay');
    var releaseTrap = trapFocus(dialog);

    function close() {
      try { releaseTrap(); } catch (e) {}
      if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (main) main.removeAttribute('aria-hidden');
      if (opener && opener.focus) opener.focus();
      announce('Closed dialog');
    }

    closeBtn.addEventListener('click', function () { close(); });
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });

    function escHandler(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } }
    document.addEventListener('keydown', escHandler);

    var firstFocus = dialog.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
    if (firstFocus && firstFocus.focus) firstFocus.focus();

    var addBtn = dialog.querySelector('.notes-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () {
      var text = prompt('Add an audit note for this item:');
      if (!text) return;
      var notes = getAuditNotes();
      notes.unshift({ id: 'n_' + Date.now(), itemId: item.id, text: text, createdAt: new Date().toISOString(), status: 'open' });
      saveAuditNotes(notes);
      announce('Note saved');
      try { close(); } catch (e) {}
    });
  }

  function attachEvents(model, heroWrap, mainWrap) {
    document.body.addEventListener('click', function (e) {
      var open = e.target.closest('[data-open-item]');
      if (open) {
        e.preventDefault();
        var id = open.getAttribute('data-open-item');
        var item = model.items.find(function (it) { return it.id === id; });
        if (item) openOverlay(item, model, open);
      }

      var pill = e.target.closest('.nav-pill');
      if (pill && pill.hasAttribute('data-kid')) {
        state.activeKid = pill.getAttribute('data-kid');
        syncFilterActiveClasses();
        announce('Filtered to ' + (state.activeKid === 'all' ? 'Family' : state.activeKid));
        renderHero(model, heroWrap);
        renderMain(model, mainWrap);
      }

      var chip = e.target.closest('.chip');
      if (chip && chip.hasAttribute('data-cat')) {
        state.activeCategory = chip.getAttribute('data-cat');
        syncFilterActiveClasses();
        announce('Showing ' + (state.activeCategory === 'all' ? 'all' : state.activeCategory) + ' items');
        renderHero(model, heroWrap);
        renderMain(model, mainWrap);
      }
    });

    document.body.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var el = document.activeElement;
        if (!el) return;
        if (el.hasAttribute && el.hasAttribute('data-open-item')) { el.click(); e.preventDefault(); }
        if (el.classList && el.classList.contains('nav-pill')) { el.click(); e.preventDefault(); }
        if (el.classList && el.classList.contains('chip')) { el.click(); e.preventDefault(); }
      }
    });
  }

  function localStorageOk() {
    try { localStorage.setItem('__fd_test__', '1'); localStorage.removeItem('__fd_test__'); return true; }
    catch (e) { return false; }
  }

  function getAuditNotes() {
    try { var raw = localStorage.getItem(NOTES_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }

  function saveAuditNotes(notes) {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); return true; } catch (e) { return false; }
  }

  function renderApp() {
    var root = document.getElementById('root');
    if (!root) { console.error('No root element found'); return; }
    var raw = window.DASHBOARD_DATA;
    var validation = validateDashboardData(raw);
    if (!validation.ok) {
      root.innerHTML = '<section class="data-error-panel glass-panel" role="alert"><h1>Data error</h1><p>' + escapeHtml(validation.errors.join('; ')) + '</p></section>';
      return;
    }
    var model = buildModel(raw);
    var container = document.createElement('main');
    container.className = 'family-desk';
    container.setAttribute('role', 'application');

    var top = document.createElement('div');
    renderTopNav(model, top);
    container.appendChild(top);

    var heroWrap = document.createElement('div');
    renderHero(model, heroWrap);
    container.appendChild(heroWrap);

    var mainWrap = document.createElement('div');
    renderMain(model, mainWrap);
    container.appendChild(mainWrap);

    if (!localStorageOk()) {
      var notePanel = document.createElement('div');
      notePanel.className = 'glass-panel data-error-panel';
      notePanel.innerHTML = '<h2>Notes unavailable</h2><p>localStorage is not available in this browser. Notes will not be saved.</p>';
      container.appendChild(notePanel);
    }

    root.innerHTML = '';
    root.appendChild(container);

    ensureLiveRegion();

    attachEvents(model, heroWrap, mainWrap);
    announce('Dashboard loaded');
    log('Rendered model with', model.items.length, 'items');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderApp); else renderApp();

})();
