/*
  app.js — accessibility & a11y improvements
  - Adds focus-trap for overlays
  - Adds keyboard activation for interactive elements (Enter/Space)
  - Adds ESC to close overlays
  - Adds aria-pressed on filters and aria attributes on dialogs
  - Announces short status messages via aria-live

  Branch: upgrade/accessibility-2026-05-12
*/
(function () {
  'use strict';

  var NOTES_KEY = "fd_audit_notes_v1";

  var state = {
    activeKid: 'all',
    activeCategory: 'all'
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
        // fallback: same day, +1 hour simple adjustment (best-effort)
        var hour = parseInt(s.slice(0,2), 10) || 9;
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

  function renderTopNav(model, container) {
    var kids = model.children || [];
    var kidHtml = '<button class="nav-pill" data-kid="all" aria-pressed="' + (state.activeKid === 'all') + '">Family</button>' +
      kids.map(function (k) {
        return '<button class="nav-pill kid-' + escapeHtml(k.colorKey || 'gold') + '" data-kid="' + escapeHtml(k.id) + '" aria-pressed="' + (state.activeKid === k.id) + '">' + escapeHtml(k.displayName) + '</button>';
      }).join('\n');
    var catHtml = (model.categories || []).filter(function(c){return c.visible !== false}).map(function (c){
      return '<button class="chip" data-cat="' + escapeHtml(c.id) + '" aria-pressed="' + (state.activeCategory === c.id) + '">' + escapeHtml(c.label) + '</button>';
    }).join('\n');

    container.innerHTML = '\n      <header class="top-nav glass-panel" role="navigation" aria-label="Top navigation">\n        <a class="brand-mark" href="#" aria-label="Family Desk home"><span>FD</span><strong>Family Desk</strong></a>\n        <nav class="kid-filter" aria-label="Kid filter">' + kidHtml + '</nav>\n        <nav class="category-filter" aria-label="Category filter">' + catHtml + '</nav>\n      </header>\n    ';
  }

  function renderHero(model, container) {
    var today = todayKey();
    var todayItems = model.items.filter(function(it){ return it._dateKey === today; });
    var upcoming = model.items.filter(function(it){ return it._dateKey && it._dateKey >= today; }).slice(0,8);
    var html = '\n      <section class="hero-grid">\n        <article class="glass-panel hero-copy">\n          <p class="eyebrow">Family Dashboard</p>\n          <h1>Today</h1>\n          <p class="deck">Quick view of what matters today. Replace <strong>dashboard-data.js</strong> and refresh to update the desk.</p>\n          <div class="hero-metrics">\n            <span><b>' + escapeHtml(String(todayItems.length)) + '</b> Today items</span>\n            <span><b>' + escapeHtml(String(upcoming.length)) + '</b> Upcoming</span>\n            <span><b>' + escapeHtml(String(model.items.filter(function(i){return i.priority==='urgent';}).length)) + '</b> Urgent</span>\n            <span><b>' + escapeHtml(String(model.items.length)) + '</b> Total</span>\n          </div>\n        </article>\n        <aside class="forward-card glass-panel">\n          <p class="eyebrow">Forward look</p>\n          <h2>Upcoming</h2>\n          <div class="mini-meta">' + upcoming.map(function(it){
            return '<button class="mini-card" data-open-item="' + escapeHtml(it.id) + '"><span>' + escapeHtml(it.startTime || '') + '</span><strong>' + escapeHtml(it.title) + '</strong><em>' + escapeHtml(it._dateKey || 'TBD') + '</em></button>';
          }).join('\n') + '</div>\n        </aside>\n      </section>\n    ';
    container.innerHTML = html;
  }

  function renderMain(model, container) {
    var today = todayKey();
    var byDate = {};
    model.items.forEach(function (it) {
      var k = it._dateKey || 'unscheduled';
      byDate[k] = byDate[k] || [];
      byDate[k].push(it);
    });
    var keys = Object.keys(byDate).sort(function(a,b){ if (a==='unscheduled') return 1; if (b==='unscheduled') return -1; return a < b ? -1 : (a>b?1:0); });
    var html = '<div class="content-grid">\n  <div class="event-column">';
    keys.forEach(function (k) {
      html += '<div class="section-heading"><h2>' + (k==='unscheduled' ? 'Unscheduled' : formatDateLong(k)) + '</h2></div>';
      byDate[k].forEach(function (it) {
        html += '<article class="event-card" data-open-item="' + escapeHtml(it.id) + '">\n          <div class="event-rail"><span></span></div>\n          <div class="event-main">\n            <div class="event-topline"><span class="category-pill">' + escapeHtml(it.category || '') + '</span><span>' + escapeHtml((it.childNames || []).join(', ')) + '</span></div>\n            <h3>' + escapeHtml(it.title || 'Untitled') + '</h3>\n            <p class="summary-line">' + escapeHtml(it.notes || (it.source && it.source.summary) || '') + '</p>\n            <div class="badge-row">' + (it.actionNeeded && it.actionNeeded.required ? ('<span class="badge warn"><b>Action:</b> ' + escapeHtml(it.actionNeeded.label || 'Action required') + '</span>') : '') + '</div>\n            <div class="card-links">' + (it.date ? ('<a href="' + escapeHtml(createCalendarHref(it, it.location || {})) + '" target="_blank" rel="noopener">Add to calendar</a>') : '') + '<span>' + escapeHtml(it.source && it.source.sender || '') + '</span></div>\n          </div>\n        </article>';
      });
    });
    html += '</div>\n  <aside class="side-column">\n    <section class="glass-panel today-brief">\n      <h2>Today</h2>\n      <div id="today-list">';
    var todayItems = model.items.filter(function(it){ return it._dateKey === today; });
    if (!todayItems.length) html += '<p class="muted">No items for today.</p>';
    todayItems.forEach(function(it){
      html += '<div class="calendar-row"><strong>' + escapeHtml(it.title) + '</strong><div>' + escapeHtml(it.startTime || '') + ' ' + escapeHtml(it.location && it.location.name || '') + '</div></div>';
    });
    html += '</div></section>\n    <section class="glass-panel source-ledger">\n      <h2>Sources</h2>\n      <div class="muted source-range">' + escapeHtml((model.meta && model.meta.sourceTypesReviewed && Array.isArray(model.meta.sourceTypesReviewed)) ? model.meta.sourceTypesReviewed.join(', ') : '') + '</div>\n    </section>\n  </aside>\n</div>';

    container.innerHTML = html;
  }

  function openOverlay(item, model, opener) {
    var backdrop = document.createElement('div');
    backdrop.className = 'overlay-backdrop';
    backdrop.setAttribute('data-overlay', 'true');

    var titleId = 'overlay-title-' + Date.now();
    backdrop.innerHTML = '<div class="detail-overlay glass-panel" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">\n      <button class="close-overlay" aria-label="Close dialog">×</button>\n      <p class="eyebrow">Item detail</p>\n      <h2 id="' + titleId + '">' + escapeHtml(item.title || 'Item') + '</h2>\n      <div class="overlay-summary">' + escapeHtml(item.notes || (item.source && item.source.summary) || '') + '</div>\n      <div class="overlay-facts fact-grid">\n        <div><dt>Date</dt><dd>' + escapeHtml(item._dateKey || 'Unscheduled') + '</dd></div>\n        <div><dt>Time</dt><dd>' + escapeHtml(item.startTime || '—') + '</dd></div>\n      </div>\n      <div class="card-links">' + (item.date ? ('<a href="' + escapeHtml(createCalendarHref(item, item.location || {})) + '" target="_blank" rel="noopener">Open in Calendar</a>') : '') + ' <button class="notes-add-btn">Add note</button></div>\n    </div>';

    // hide main content from assistive tech while open
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

    // focus management: focus first focusable element
    var firstFocus = dialog.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
    if (firstFocus && firstFocus.focus) firstFocus.focus();

    // notes add
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

  function attachEvents(model) {
    // click/open handlers
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
        var kid = pill.getAttribute('data-kid');
        state.activeKid = kid;
        // update aria-pressed on all pills
        Array.prototype.forEach.call(document.querySelectorAll('.nav-pill'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-kid') === state.activeKid); });
        announce('Filtered to ' + (kid === 'all' ? 'Family' : kid));
        // no re-rendering here: this simplified app does not filter server-side
      }

      var chip = e.target.closest('.chip');
      if (chip && chip.hasAttribute('data-cat')) {
        var cat = chip.getAttribute('data-cat');
        state.activeCategory = cat;
        Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-cat') === state.activeCategory); });
        announce('Showing ' + cat + ' items');
      }
    });

    // keyboard activation for Enter/Space on elements with data-open-item and nav buttons
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

    // ensure live region exists
    ensureLiveRegion();

    attachEvents(model);
    announce('Dashboard loaded');
    log('Rendered model with', model.items.length, 'items');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderApp); else renderApp();

})();
