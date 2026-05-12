(function () {
  'use strict';

  var seed = window.IDEA_DASHBOARD_DATA || {};
  var STORAGE_KEY = (seed.meta && seed.meta.localStorageKey) || 'idea_dashboard_state_v1';
  var statuses = seed.statuses || ['Raw Idea', 'Clarify', 'Pressure Test', 'Research', 'Low-Risk Test', 'Build', 'Parked', 'Done'];
  var priorities = seed.priorities || ['High', 'Medium', 'Low'];
  var root = document.getElementById('idea-root');
  var previousFocus = null;

  var state = {
    view: 'command',
    filters: { search: '', category: 'all', status: 'all', priority: 'all', tag: 'all' },
    selectedIdeaId: null,
    dragIdeaId: null,
    data: loadState()
  };

  function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
  function nowIso() { return new Date().toISOString(); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map(function (tag) { return String(tag).trim(); }).filter(Boolean);
    return String(tags || '').split(',').map(function (tag) { return tag.trim(); }).filter(Boolean);
  }
  function scoreIdea(idea) {
    return (Number(idea.valueScore) * 3) - Number(idea.effortScore) - Number(idea.riskScore) - Number(idea.executiveFunctionLoad);
  }
  function defaultIdea() {
    var stamp = nowIso();
    return {
      id: uid('idea'), title: 'Untitled Idea', rawIdea: '', category: 'Other', status: 'Raw Idea', priority: 'Medium', tags: [], goal: '',
      howItCouldWork: '', realLifeImpact: '', benefits: '', frictionRisks: '', realityCheck: '', unknowns: '', bestVersion: '',
      lowRiskTest: '', recommendation: '', nextAction: '', valueScore: 3, effortScore: 3, riskScore: 3, executiveFunctionLoad: 3,
      moneyImpact: '', parentingImpact: '', workImpact: '', notes: '', createdAt: stamp, updatedAt: stamp
    };
  }
  function seedState() {
    var fresh = clone(seed);
    fresh.ideas = (fresh.ideas || []).map(function (idea) { return Object.assign(defaultIdea(), idea); });
    fresh.notes = fresh.notes || [];
    fresh.statuses = fresh.statuses || statuses;
    fresh.categories = fresh.categories || [];
    fresh.priorities = fresh.priorities || priorities;
    return fresh;
  }
  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.ideas)) return parsed;
      }
    } catch (err) {
      console.warn('Unable to load saved idea dashboard state.', err);
    }
    return seedState();
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }
  function categories() {
    var map = {};
    (state.data.categories || []).forEach(function (cat) { map[cat] = true; });
    state.data.ideas.forEach(function (idea) { if (idea.category) map[idea.category] = true; });
    return Object.keys(map).sort();
  }
  function allTags() {
    var map = {};
    state.data.ideas.forEach(function (idea) { normalizeTags(idea.tags).forEach(function (tag) { map[tag] = true; }); });
    return Object.keys(map).sort();
  }
  function ideaById(id) { return state.data.ideas.find(function (idea) { return idea.id === id; }); }
  function notesForIdea(id) { return state.data.notes.filter(function (note) { return note.ideaId === id; }); }
  function filteredIdeas() {
    var f = state.filters;
    var q = f.search.trim().toLowerCase();
    return state.data.ideas.filter(function (idea) {
      var tags = normalizeTags(idea.tags);
      var haystack = [idea.title, idea.rawIdea, idea.notes, tags.join(' ')].join(' ').toLowerCase();
      return (!q || haystack.indexOf(q) !== -1) &&
        (f.category === 'all' || idea.category === f.category) &&
        (f.status === 'all' || idea.status === f.status) &&
        (f.priority === 'all' || idea.priority === f.priority) &&
        (f.tag === 'all' || tags.indexOf(f.tag) !== -1);
    });
  }
  function recommendedIdeas() {
    return state.data.ideas.filter(function (idea) { return idea.status !== 'Done' && idea.status !== 'Parked'; })
      .slice().sort(function (a, b) { return scoreIdea(b) - scoreIdea(a); });
  }

  function render() {
    if (!root) return;
    root.innerHTML = '<main class="idea-shell" aria-label="Idea Hub Command Dashboard">' + renderNav() + renderViews() + '</main><div id="toast-region" aria-live="polite"></div>';
    bindEvents();
  }
  function renderNav() {
    var views = [
      ['command', 'Command Center'], ['board', 'Idea Board'], ['pressure', 'Pressure Test'], ['notes', 'Notes'], ['export', 'Export Center'], ['backup', 'Data Backup']
    ];
    return '<nav class="top-nav" aria-label="Dashboard views"><div class="brand-mark"><span>IH</span><strong>Idea Hub</strong></div><div class="nav-tabs">' +
      views.map(function (view) { return '<button class="nav-pill ' + (state.view === view[0] ? 'is-active' : '') + '" data-view="' + view[0] + '" aria-pressed="' + (state.view === view[0]) + '">' + view[1] + '</button>'; }).join('') +
      '</div><div class="nav-actions"><button class="btn primary" data-action="new-idea">New Idea</button><button class="btn" data-action="reset-seed">Reset Seed</button></div></nav>';
  }
  function renderViews() {
    if (state.view === 'board') return renderBoard();
    if (state.view === 'pressure') return renderPressure();
    if (state.view === 'notes') return renderNotes();
    if (state.view === 'export') return renderExport();
    if (state.view === 'backup') return renderBackup();
    return renderCommand();
  }
  function viewClass(name) { return 'view ' + (state.view === name ? 'is-active' : ''); }
  function renderCommand() {
    var ideas = state.data.ideas;
    var active = ideas.filter(function (idea) { return idea.status !== 'Done' && idea.status !== 'Parked'; }).length;
    var top = recommendedIdeas().slice(0, 3);
    return '<section class="' + viewClass('command') + '"><div class="hero-grid"><section class="hero glass-panel"><p class="eyebrow">Command Center</p><h1>Capture, pressure-test, and move the best ideas forward.</h1><p class="lede">This offline dashboard keeps seed data replaceable while saving your edits in localStorage. Score ideas transparently: (Value × 3) − Effort − Risk − Executive Function Load.</p><div class="metric-grid">' +
      metric('Total Ideas', ideas.length) + metric('Active', active) + metric('Done', ideas.filter(function (i) { return i.status === 'Done'; }).length) + metric('Notes', state.data.notes.length) +
      '</div></section><aside class="next-panel glass-panel"><p class="eyebrow">Top 3 Next Best Moves</p><h2>Recommended now</h2><div class="next-list">' + (top.length ? top.map(renderNextItem).join('') : '<div class="empty">No recommended ideas yet.</div>') + '</div></aside></div><section class="section-card glass-panel"><p class="eyebrow">Pipeline</p><div class="metric-grid">' + statuses.map(function (status) { return metric(status, ideas.filter(function (idea) { return idea.status === status; }).length); }).join('') + '</div></section></section>';
  }
  function metric(label, value) { return '<div class="metric-card"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>'; }
  function renderNextItem(idea) {
    return '<article class="next-item"><div class="card-top"><h3>' + escapeHtml(idea.title) + '</h3><span class="score-badge" title="Next Best Move score">' + scoreIdea(idea) + '</span></div><p class="muted">' + escapeHtml(idea.nextAction || idea.recommendation || idea.rawIdea || 'No next action yet.') + '</p><div class="card-actions"><button class="btn small" data-action="open-pressure" data-id="' + idea.id + '">Pressure test</button><button class="btn small" data-action="edit-idea" data-id="' + idea.id + '">Edit</button></div></article>';
  }
  function renderFilters() {
    return '<div class="toolbar"><div class="field"><label for="searchIdeas">Search</label><input id="searchIdeas" data-filter="search" type="search" value="' + escapeHtml(state.filters.search) + '" placeholder="Title, raw idea, tags, notes" /></div>' +
      selectFilter('category', 'Category', categories()) + selectFilter('status', 'Status', statuses) + selectFilter('priority', 'Priority', priorities) + selectFilter('tag', 'Tag', allTags()) + '</div>';
  }
  function selectFilter(key, label, options) {
    return '<div class="field"><label for="filter-' + key + '">' + label + '</label><select id="filter-' + key + '" data-filter="' + key + '"><option value="all">All</option>' + options.map(function (option) { return '<option value="' + escapeHtml(option) + '" ' + (state.filters[key] === option ? 'selected' : '') + '>' + escapeHtml(option) + '</option>'; }).join('') + '</select></div>';
  }
  function renderBoard() {
    var ideas = filteredIdeas();
    return '<section class="' + viewClass('board') + '"><section class="section-card glass-panel"><p class="eyebrow">Idea Board</p><h2>Move ideas through the pipeline</h2>' + renderFilters() + '<div class="kanban" aria-label="Ideas grouped by status">' + statuses.map(function (status) {
      var cards = ideas.filter(function (idea) { return idea.status === status; });
      return '<section class="kanban-column" data-status="' + escapeHtml(status) + '" aria-label="' + escapeHtml(status) + ' column"><div class="column-head"><h3>' + escapeHtml(status) + '</h3><span class="score-badge">' + cards.length + '</span></div><div class="card-stack">' + (cards.length ? cards.map(renderIdeaCard).join('') : '<div class="empty">Drop ideas here</div>') + '</div></section>';
    }).join('') + '</div></section></section>';
  }
  function renderIdeaCard(idea) {
    var tags = normalizeTags(idea.tags);
    return '<article class="idea-card" draggable="true" data-id="' + idea.id + '"><div class="card-top"><button class="card-title" data-action="open-pressure" data-id="' + idea.id + '">' + escapeHtml(idea.title) + '</button><span class="score-badge">' + scoreIdea(idea) + '</span></div><p class="muted">' + escapeHtml(idea.rawIdea).slice(0, 180) + '</p><div class="tag-row">' + tags.map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + '</span>'; }).join('') + '</div><div class="card-meta"><span>' + escapeHtml(idea.category) + '</span><strong class="priority-' + escapeHtml(String(idea.priority).toLowerCase()) + '">' + escapeHtml(idea.priority) + '</strong></div><div class="card-actions"><select data-action="move-status" data-id="' + idea.id + '" aria-label="Move ' + escapeHtml(idea.title) + ' to status">' + statuses.map(function (status) { return '<option value="' + escapeHtml(status) + '" ' + (idea.status === status ? 'selected' : '') + '>' + escapeHtml(status) + '</option>'; }).join('') + '</select><button class="btn small" data-action="edit-idea" data-id="' + idea.id + '">Edit</button><button class="btn small danger" data-action="delete-idea" data-id="' + idea.id + '">Delete</button></div></article>';
  }
  function renderPressure() {
    var ideas = filteredIdeas();
    var selected = ideaById(state.selectedIdeaId) || ideas[0] || state.data.ideas[0];
    if (selected && state.selectedIdeaId !== selected.id) state.selectedIdeaId = selected.id;
    return '<section class="' + viewClass('pressure') + '"><div class="detail-grid"><aside class="section-card glass-panel"><p class="eyebrow">Pressure Test</p><h2>Select an idea</h2>' + renderFilters() + '<select class="detail-select" data-action="select-pressure" aria-label="Select idea for pressure test">' + ideas.map(function (idea) { return '<option value="' + idea.id + '" ' + (selected && selected.id === idea.id ? 'selected' : '') + '>' + escapeHtml(idea.title) + '</option>'; }).join('') + '</select><div class="detail-list">' + ideas.map(function (idea) { return '<button class="btn" data-action="open-pressure" data-id="' + idea.id + '">' + escapeHtml(idea.title) + '</button>'; }).join('') + '</div></aside><section class="section-card glass-panel">' + (selected ? renderPressureDetail(selected) : '<div class="empty">Create an idea to pressure-test it.</div>') + '</section></div></section>';
  }
  function renderPressureDetail(idea) {
    var sections = [['IDEA', 'rawIdea'], ['GOAL', 'goal'], ['HOW IT COULD WORK', 'howItCouldWork'], ['WHERE IT HITS REAL LIFE', 'realLifeImpact'], ['BENEFITS', 'benefits'], ['FRICTION / RISKS', 'frictionRisks'], ['REALITY CHECK', 'realityCheck'], ['UNKNOWNS', 'unknowns'], ['BEST VERSION OF THE IDEA', 'bestVersion'], ['LOW-RISK TEST', 'lowRiskTest'], ['RECOMMENDATION', 'recommendation'], ['NEXT ACTION', 'nextAction']];
    return '<div class="card-top"><div><p class="eyebrow">' + escapeHtml(idea.status) + '</p><h2>' + escapeHtml(idea.title) + '</h2></div><button class="btn" data-action="edit-idea" data-id="' + idea.id + '">Edit idea</button></div><div class="score-grid">' + metric('Value', idea.valueScore) + metric('Effort', idea.effortScore) + metric('Risk', idea.riskScore) + metric('EF Load', idea.executiveFunctionLoad) + '</div><p><span class="score-badge">' + scoreIdea(idea) + '</span> Next Best Move score</p>' + sections.map(function (section) { return '<section class="pressure-section"><h3>' + section[0] + '</h3><p>' + escapeHtml(idea[section[1]] || '—') + '</p></section>'; }).join('') + '<section class="pressure-section"><h3>NOTES</h3><p>' + escapeHtml(idea.notes || '—') + '</p>' + notesForIdea(idea.id).map(function (note) { return '<p>• ' + escapeHtml(note.text) + '</p>'; }).join('') + '</section>';
  }
  function renderNotes() {
    var selected = ideaById(state.selectedIdeaId);
    var globals = state.data.notes.filter(function (note) { return !note.ideaId; });
    return '<section class="' + viewClass('notes') + '"><div class="notes-layout"><section class="section-card glass-panel"><p class="eyebrow">Notes</p><h2>Add a note</h2><form data-form="note"><div class="field"><label for="noteIdea">Attach to idea</label><select id="noteIdea" name="ideaId"><option value="">Global note</option>' + state.data.ideas.map(function (idea) { return '<option value="' + idea.id + '" ' + (selected && selected.id === idea.id ? 'selected' : '') + '>' + escapeHtml(idea.title) + '</option>'; }).join('') + '</select></div><div class="field"><label for="noteText">Note text</label><textarea id="noteText" name="text" required></textarea></div><button class="btn primary" type="submit">Save Note</button></form></section><section class="section-card glass-panel"><p class="eyebrow">Notebook</p><h2>Global notes</h2><div class="note-list">' + (globals.length ? globals.map(renderNote).join('') : '<div class="empty">No global notes yet.</div>') + '</div><h2 style="margin-top:22px">Per-idea notes</h2><div class="note-list">' + (state.data.notes.filter(function (n) { return n.ideaId; }).length ? state.data.notes.filter(function (n) { return n.ideaId; }).map(renderNote).join('') : '<div class="empty">No per-idea notes yet.</div>') + '</div></section></div></section>';
  }
  function renderNote(note) {
    var idea = note.ideaId ? ideaById(note.ideaId) : null;
    return '<article class="note-card"><p>' + escapeHtml(note.text) + '</p><time>' + escapeHtml(new Date(note.updatedAt || note.createdAt).toLocaleString()) + (idea ? ' · ' + escapeHtml(idea.title) : ' · Global') + '</time><div class="card-actions"><button class="btn small" data-action="edit-note" data-id="' + note.id + '">Edit</button><button class="btn small danger" data-action="delete-note" data-id="' + note.id + '">Delete</button></div></article>';
  }
  function renderExport() {
    return '<section class="' + viewClass('export') + '"><div class="export-layout"><section class="section-card glass-panel"><p class="eyebrow">Export Center</p><h2>Markdown and JSON</h2><div class="backup-box"><button class="btn primary" data-action="export-md-all">Export all ideas to Markdown</button><div class="field"><label for="exportIdea">Selected idea</label><select id="exportIdea" data-export-select>' + state.data.ideas.map(function (idea) { return '<option value="' + idea.id + '" ' + (state.selectedIdeaId === idea.id ? 'selected' : '') + '>' + escapeHtml(idea.title) + '</option>'; }).join('') + '</select></div><button class="btn" data-action="export-md-one">Export selected idea to Markdown</button><button class="btn" data-action="export-json">Export JSON backup</button></div></section><section class="section-card glass-panel"><p class="eyebrow">Import</p><h2>Restore a JSON backup</h2><p class="muted">Import expects a JSON file exported by this dashboard. It replaces the current localStorage state after confirmation.</p><input class="file-input" type="file" accept="application/json,.json" data-action="import-json" aria-label="Import JSON backup" /></section></div></section>';
  }
  function renderBackup() {
    return '<section class="' + viewClass('backup') + '"><section class="section-card glass-panel"><p class="eyebrow">Data Backup</p><h2>Current local data</h2><div class="card-actions" style="margin:14px 0"><button class="btn" data-action="copy-json">Copy JSON</button><button class="btn" data-action="export-json">Download JSON</button><button class="btn danger" data-action="reset-seed">Reset from seed data</button></div><pre class="backup-code" tabindex="0">' + escapeHtml(JSON.stringify(state.data, null, 2)) + '</pre></section></section>';
  }

  function bindEvents() {
    root.querySelectorAll('[data-view]').forEach(function (button) {
      button.addEventListener('click', function () { state.view = button.getAttribute('data-view'); render(); });
    });
    root.querySelectorAll('[data-filter]').forEach(function (input) {
      input.addEventListener(input.type === 'search' ? 'input' : 'change', function () { state.filters[input.getAttribute('data-filter')] = input.value; render(); });
    });
    root.querySelectorAll('[data-action]').forEach(function (el) {
      var action = el.getAttribute('data-action');
      if (action === 'move-status') el.addEventListener('change', function () { moveIdea(el.getAttribute('data-id'), el.value); });
      else if (action === 'select-pressure') el.addEventListener('change', function () { state.selectedIdeaId = el.value; render(); });
      else if (action === 'import-json') el.addEventListener('change', importJson);
      else el.addEventListener('click', function () { handleAction(action, el); });
    });
    root.querySelectorAll('[data-form="note"]').forEach(function (form) { form.addEventListener('submit', saveNoteFromForm); });
    bindDragAndDrop();
  }
  function handleAction(action, el) {
    var id = el.getAttribute('data-id');
    if (action === 'new-idea') openIdeaModal();
    if (action === 'edit-idea') openIdeaModal(ideaById(id));
    if (action === 'delete-idea') deleteIdea(id);
    if (action === 'open-pressure') { state.selectedIdeaId = id; state.view = 'pressure'; render(); }
    if (action === 'reset-seed') resetSeed();
    if (action === 'export-md-all') download('idea-dashboard-export.md', markdownAll());
    if (action === 'export-md-one') exportSelectedMarkdown();
    if (action === 'export-json') download('idea-dashboard-backup.json', JSON.stringify(state.data, null, 2), 'application/json');
    if (action === 'copy-json') copyJson();
    if (action === 'edit-note') openNoteModal(state.data.notes.find(function (note) { return note.id === id; }));
    if (action === 'delete-note') deleteNote(id);
  }
  function bindDragAndDrop() {
    root.querySelectorAll('.idea-card[draggable="true"]').forEach(function (card) {
      card.addEventListener('dragstart', function () { state.dragIdeaId = card.getAttribute('data-id'); card.classList.add('is-dragging'); });
      card.addEventListener('dragend', function () { state.dragIdeaId = null; card.classList.remove('is-dragging'); });
    });
    root.querySelectorAll('.kanban-column').forEach(function (column) {
      column.addEventListener('dragover', function (event) { event.preventDefault(); column.classList.add('is-over'); });
      column.addEventListener('dragleave', function () { column.classList.remove('is-over'); });
      column.addEventListener('drop', function (event) { event.preventDefault(); column.classList.remove('is-over'); if (state.dragIdeaId) moveIdea(state.dragIdeaId, column.getAttribute('data-status')); });
    });
  }
  function moveIdea(id, status) {
    var idea = ideaById(id);
    if (!idea) return;
    idea.status = status;
    idea.updatedAt = nowIso();
    saveState();
    toast('Moved "' + idea.title + '" to ' + status + '.');
    render();
  }
  function deleteIdea(id) {
    var idea = ideaById(id);
    if (!idea || !confirm('Delete "' + idea.title + '"? This also removes its attached notes.')) return;
    state.data.ideas = state.data.ideas.filter(function (item) { return item.id !== id; });
    state.data.notes = state.data.notes.filter(function (note) { return note.ideaId !== id; });
    if (state.selectedIdeaId === id) state.selectedIdeaId = null;
    saveState(); render(); toast('Idea deleted.');
  }
  function resetSeed() {
    if (!confirm('Reset this dashboard from idea-dashboard-data.js? Your saved local edits will be replaced.')) return;
    state.data = seedState();
    state.selectedIdeaId = null;
    saveState(); render(); toast('Dashboard reset from seed data.');
  }
  function openIdeaModal(idea) {
    previousFocus = document.activeElement;
    var editing = Boolean(idea);
    var model = Object.assign(defaultIdea(), clone(idea || {}));
    var fields = [
      ['title', 'Title', 'input'], ['rawIdea', 'Raw Idea', 'textarea'], ['category', 'Category', 'input'], ['priority', 'Priority', 'priority'], ['status', 'Status', 'status'], ['tags', 'Tags (comma-separated)', 'input'],
      ['goal', 'Goal', 'textarea'], ['howItCouldWork', 'How It Could Work', 'textarea'], ['realLifeImpact', 'Where It Hits Real Life', 'textarea'], ['benefits', 'Benefits', 'textarea'],
      ['frictionRisks', 'Friction / Risks', 'textarea'], ['realityCheck', 'Reality Check', 'textarea'], ['unknowns', 'Unknowns', 'textarea'], ['bestVersion', 'Best Version of the Idea', 'textarea'],
      ['lowRiskTest', 'Low-Risk Test', 'textarea'], ['recommendation', 'Recommendation', 'textarea'], ['nextAction', 'Next Action', 'textarea'],
      ['valueScore', 'Value Score', 'score'], ['effortScore', 'Effort Score', 'score'], ['riskScore', 'Risk Score', 'score'], ['executiveFunctionLoad', 'Executive Function Load', 'score'],
      ['moneyImpact', 'Money Impact', 'textarea'], ['parentingImpact', 'Parenting Impact', 'textarea'], ['workImpact', 'Work Impact', 'textarea'], ['notes', 'Idea Notes', 'textarea']
    ];
    openModal('<div class="modal-head"><div><p class="eyebrow">' + (editing ? 'Edit Idea' : 'New Idea') + '</p><h2 id="modal-title">' + (editing ? 'Edit ' + escapeHtml(model.title) : 'Create a new idea') + '</h2></div><button class="btn" data-close-modal aria-label="Close dialog">Close</button></div><form data-form="idea"><div class="form-grid">' + fields.map(function (field) { return renderFormField(field, model); }).join('') + '</div><div class="modal-actions"><button class="btn" type="button" data-close-modal>Cancel</button><button class="btn primary" type="submit">Save Idea</button></div></form>', function (modal) {
      modal.querySelector('[data-form="idea"]').addEventListener('submit', function (event) {
        event.preventDefault();
        var form = event.currentTarget;
        fields.forEach(function (field) {
          var name = field[0];
          var input = form.elements[name];
          if (!input) return;
          model[name] = name === 'tags' ? normalizeTags(input.value) : input.value;
          if (field[2] === 'score') model[name] = Math.max(1, Math.min(5, Number(input.value) || 1));
        });
        model.updatedAt = nowIso();
        if (editing) state.data.ideas = state.data.ideas.map(function (item) { return item.id === model.id ? model : item; });
        else state.data.ideas.unshift(model);
        if (state.data.categories.indexOf(model.category) === -1) state.data.categories.push(model.category);
        state.selectedIdeaId = model.id;
        saveState(); closeModal(); render(); toast('Idea saved.');
      });
    });
  }
  function renderFormField(field, model) {
    var name = field[0], label = field[1], type = field[2], value = name === 'tags' ? normalizeTags(model[name]).join(', ') : (model[name] || '');
    var wide = type === 'textarea' ? ' wide' : '';
    if (type === 'textarea') return '<div class="field' + wide + '"><label for="idea-' + name + '">' + label + '</label><textarea id="idea-' + name + '" name="' + name + '">' + escapeHtml(value) + '</textarea></div>';
    if (type === 'priority') return '<div class="field"><label for="idea-' + name + '">' + label + '</label><select id="idea-' + name + '" name="' + name + '">' + priorities.map(function (p) { return '<option ' + (value === p ? 'selected' : '') + '>' + p + '</option>'; }).join('') + '</select></div>';
    if (type === 'status') return '<div class="field"><label for="idea-' + name + '">' + label + '</label><select id="idea-' + name + '" name="' + name + '">' + statuses.map(function (s) { return '<option ' + (value === s ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>';
    if (type === 'score') return '<div class="field"><label for="idea-' + name + '">' + label + '</label><input id="idea-' + name + '" name="' + name + '" type="number" min="1" max="5" value="' + escapeHtml(value) + '" /></div>';
    return '<div class="field"><label for="idea-' + name + '">' + label + '</label><input id="idea-' + name + '" name="' + name + '" value="' + escapeHtml(value) + '" /></div>';
  }
  function saveNoteFromForm(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var stamp = nowIso();
    state.data.notes.unshift({ id: uid('note'), text: form.elements.text.value.trim(), ideaId: form.elements.ideaId.value || null, createdAt: stamp, updatedAt: stamp });
    saveState(); render(); toast('Note saved.');
  }
  function openNoteModal(note) {
    if (!note) return;
    previousFocus = document.activeElement;
    openModal('<div class="modal-head"><div><p class="eyebrow">Edit Note</p><h2 id="modal-title">Update note</h2></div><button class="btn" data-close-modal aria-label="Close dialog">Close</button></div><form data-form="edit-note"><div class="field"><label for="editNoteText">Note text</label><textarea id="editNoteText" name="text" required>' + escapeHtml(note.text) + '</textarea></div><div class="modal-actions"><button class="btn" type="button" data-close-modal>Cancel</button><button class="btn primary" type="submit">Save Note</button></div></form>', function (modal) {
      modal.querySelector('form').addEventListener('submit', function (event) { event.preventDefault(); note.text = event.currentTarget.elements.text.value.trim(); note.updatedAt = nowIso(); saveState(); closeModal(); render(); toast('Note updated.'); });
    });
  }
  function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    state.data.notes = state.data.notes.filter(function (note) { return note.id !== id; });
    saveState(); render(); toast('Note deleted.');
  }
  function openModal(html, afterOpen) {
    var backdrop = document.createElement('div');
    backdrop.className = 'overlay-backdrop';
    backdrop.innerHTML = '<section class="modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">' + html + '</section>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (event) { if (event.target === backdrop) closeModal(); });
    backdrop.querySelectorAll('[data-close-modal]').forEach(function (button) { button.addEventListener('click', closeModal); });
    document.addEventListener('keydown', modalKeydown);
    if (afterOpen) afterOpen(backdrop);
    var first = backdrop.querySelector('input, textarea, select, button');
    if (first) first.focus();
  }
  function modalKeydown(event) {
    if (event.key === 'Escape') closeModal();
    if (event.key !== 'Tab') return;
    var modal = document.querySelector('.overlay-backdrop .modal');
    if (!modal) return;
    var focusables = Array.prototype.slice.call(modal.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(function (el) { return !el.disabled; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function closeModal() {
    var backdrop = document.querySelector('.overlay-backdrop');
    if (backdrop) backdrop.remove();
    document.removeEventListener('keydown', modalKeydown);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }
  function markdownIdea(idea) {
    var noteText = notesForIdea(idea.id).map(function (note) { return '- ' + note.text; }).join('\n') || '—';
    return '## ' + idea.title + '\n\n- Category: ' + idea.category + '\n- Priority: ' + idea.priority + '\n- Status: ' + idea.status + '\n- Scores: Value ' + idea.valueScore + ', Effort ' + idea.effortScore + ', Risk ' + idea.riskScore + ', Executive Function Load ' + idea.executiveFunctionLoad + ', Next Best Move ' + scoreIdea(idea) + '\n\n### Raw idea\n' + (idea.rawIdea || '—') + '\n\n### Pressure-test sections\n- IDEA: ' + (idea.rawIdea || '—') + '\n- GOAL: ' + (idea.goal || '—') + '\n- HOW IT COULD WORK: ' + (idea.howItCouldWork || '—') + '\n- WHERE IT HITS REAL LIFE: ' + (idea.realLifeImpact || '—') + '\n- BENEFITS: ' + (idea.benefits || '—') + '\n- FRICTION / RISKS: ' + (idea.frictionRisks || '—') + '\n- REALITY CHECK: ' + (idea.realityCheck || '—') + '\n- UNKNOWNS: ' + (idea.unknowns || '—') + '\n- BEST VERSION OF THE IDEA: ' + (idea.bestVersion || '—') + '\n- LOW-RISK TEST: ' + (idea.lowRiskTest || '—') + '\n- RECOMMENDATION: ' + (idea.recommendation || '—') + '\n- NEXT ACTION: ' + (idea.nextAction || '—') + '\n\n### Notes\n' + (idea.notes || '—') + '\n' + noteText + '\n\n### Next action\n' + (idea.nextAction || '—') + '\n';
  }
  function markdownAll() {
    return '# Idea Hub Command Dashboard Export\n\nGenerated date: ' + new Date().toLocaleString() + '\n\n## Summary\n- Total ideas: ' + state.data.ideas.length + '\n- Notes: ' + state.data.notes.length + '\n\n' + statuses.map(function (status) {
      var group = state.data.ideas.filter(function (idea) { return idea.status === status; });
      return '# ' + status + '\n\n' + (group.length ? group.map(markdownIdea).join('\n') : '_No ideas._\n');
    }).join('\n');
  }
  function exportSelectedMarkdown() {
    var select = root.querySelector('[data-export-select]');
    var idea = ideaById((select && select.value) || state.selectedIdeaId);
    if (!idea) return toast('No idea selected.');
    download(slug(idea.title) + '.md', '# Idea Hub Command Dashboard Export\n\nGenerated date: ' + new Date().toLocaleString() + '\n\n## Summary\nSelected idea export.\n\n' + markdownIdea(idea));
  }
  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast('Downloaded ' + filename + '.');
  }
  function importJson(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.ideas) || !Array.isArray(parsed.notes)) throw new Error('Backup must include ideas and notes arrays.');
        if (!confirm('Import this backup and replace current saved dashboard data?')) return;
        state.data = parsed; saveState(); render(); toast('Backup imported.');
      } catch (err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
  }
  function copyJson() {
    var text = JSON.stringify(state.data, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('JSON copied.'); });
    else { window.prompt('Copy this JSON backup:', text); }
  }
  function slug(text) { return String(text || 'idea').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'idea'; }
  function toast(message) {
    var region = document.getElementById('toast-region');
    if (!region) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    region.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  render();
}());
