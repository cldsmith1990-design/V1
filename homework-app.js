/* global window, document, HOMEWORK_DATA */
(function () {
  "use strict";

  var data = window.HOMEWORK_DATA;
  if (!data) {
    document.getElementById("main").innerHTML =
      "<section class='empty-state'><h2>Missing homework-data.js</h2><p>Could not load problem data.</p></section>";
    return;
  }

  var STORAGE_KEY = data.meta.storageKey;
  var state; // { answers: {id: string}, checked: {id: bool} }
  var activeSectionId = data.sections[0].id;

  // ─── Persistence ────────────────────────────────────────────────────────────

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.answers === "object") return parsed;
      }
    } catch (e) { /* ignore */ }
    return { answers: {}, checked: {} };
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function totalProblems() {
    return data.sections.reduce(function (sum, s) { return sum + s.problems.length; }, 0);
  }

  function totalCorrect() {
    var count = 0;
    data.sections.forEach(function (s) {
      s.problems.forEach(function (p) {
        if (state.checked[p.id] === true) count++;
      });
    });
    return count;
  }

  function sectionCorrect(section) {
    return section.problems.filter(function (p) { return state.checked[p.id] === true; }).length;
  }

  function normalise(str) {
    return (str || "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9.+\-*/^()√∛∜≥≤]/gi, "");
  }

  function isCorrect(problem, answer) {
    return normalise(answer) === normalise(problem.answer);
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────

  function toast(msg, type) {
    var container = document.getElementById("toastContainer");
    var el = document.createElement("div");
    el.className = "toast toast-" + (type || "info");
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("toast-visible"); });
    setTimeout(function () {
      el.classList.remove("toast-visible");
      setTimeout(function () { el.remove(); }, 300);
    }, 2800);
  }

  // ─── Render tabs ─────────────────────────────────────────────────────────────

  function renderTabs() {
    var container = document.getElementById("sectionTabs");
    container.innerHTML = "";
    data.sections.forEach(function (section) {
      var correct = sectionCorrect(section);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab-btn" + (section.id === activeSectionId ? " active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", section.id === activeSectionId ? "true" : "false");
      btn.setAttribute("aria-controls", "problemArea");
      btn.dataset.sectionId = section.id;

      btn.innerHTML =
        '<span class="tab-title">' + escHtml(section.title) + '</span>' +
        '<span class="tab-badge' + (correct === section.problems.length ? " badge-done" : "") + '">' +
          correct + "/" + section.problems.length +
        '</span>';

      btn.addEventListener("click", function () {
        activeSectionId = section.id;
        render();
      });

      container.appendChild(btn);
    });
  }

  // ─── Render problems ─────────────────────────────────────────────────────────

  function renderProblems() {
    var section = data.sections.find(function (s) { return s.id === activeSectionId; });
    var area = document.getElementById("problemArea");
    if (!section) { area.innerHTML = ""; return; }

    area.innerHTML = "";

    section.problems.forEach(function (problem, idx) {
      var checked = state.checked[problem.id];
      var correct = checked === true;
      var wrong = checked === false;
      var savedAnswer = state.answers[problem.id] || "";

      var card = document.createElement("article");
      card.className = "problem-card" + (correct ? " card-correct" : wrong ? " card-wrong" : "");
      card.id = "problem-" + problem.id;

      var statusIcon = correct
        ? '<span class="status-icon correct" aria-label="Correct">✓</span>'
        : wrong
        ? '<span class="status-icon wrong" aria-label="Incorrect">✗</span>'
        : '<span class="status-icon pending" aria-label="Unanswered">' + (idx + 1) + '</span>';

      var inputHtml = problem.type === "choice"
        ? renderChoices(problem, savedAnswer, checked !== undefined)
        : renderInput(problem, savedAnswer, checked !== undefined);

      var explanationHtml = checked !== undefined
        ? '<div class="explanation ' + (correct ? "explanation-correct" : "explanation-wrong") + '">' +
            '<strong>' + (correct ? "Correct!" : "Not quite.") + '</strong> ' +
            escHtml(problem.explanation) +
          '</div>'
        : "";

      card.innerHTML =
        '<header class="card-header">' +
          statusIcon +
          '<div class="card-meta">' +
            '<span class="problem-num">Problem ' + (idx + 1) + '</span>' +
          '</div>' +
        '</header>' +
        '<div class="card-body">' +
          '<p class="problem-prompt">' + escHtml(problem.prompt) + '</p>' +
          (checked === undefined
            ? '<button type="button" class="hint-toggle" data-id="' + problem.id + '" aria-expanded="false">Show hint</button>' +
              '<p class="hint-text" id="hint-' + problem.id + '" hidden>' + escHtml(problem.hint) + '</p>'
            : "") +
          inputHtml +
          explanationHtml +
        '</div>';

      area.appendChild(card);
    });

    // Event delegation for cards
    area.addEventListener("click", handleAreaClick);
    area.addEventListener("keydown", handleAreaKeydown);
    area.addEventListener("change", handleChoiceChange);
  }

  function renderInput(problem, savedAnswer, isChecked) {
    return '<div class="answer-row">' +
      '<input type="text" class="answer-input" id="input-' + problem.id + '"' +
        ' data-id="' + problem.id + '"' +
        ' value="' + escAttr(savedAnswer) + '"' +
        (isChecked ? ' readonly aria-readonly="true"' : '') +
        ' placeholder="Your answer…"' +
        ' aria-label="Answer for problem"' +
      '/>' +
      (!isChecked
        ? '<button type="button" class="btn check-btn" data-id="' + problem.id + '" data-type="short">Check</button>'
        : "") +
    '</div>';
  }

  function renderChoices(problem, savedAnswer, isChecked) {
    var html = '<fieldset class="choice-group" ' + (isChecked ? 'disabled' : '') + '>' +
      '<legend class="sr-only">Select an answer</legend>';
    problem.choices.forEach(function (choice) {
      var inputId = "choice-" + problem.id + "-" + normalise(choice);
      html += '<label class="choice-label' +
        (savedAnswer === choice && isChecked ? (savedAnswer === problem.answer ? " choice-correct" : " choice-wrong") : "") +
        (choice === problem.answer && isChecked ? " choice-correct" : "") +
        '">' +
        '<input type="radio" name="choice-' + problem.id + '" id="' + inputId + '"' +
          ' value="' + escAttr(choice) + '"' +
          ' data-id="' + problem.id + '" data-type="choice"' +
          (savedAnswer === choice ? " checked" : "") +
          (isChecked ? " disabled" : "") +
        '/>' +
        escHtml(choice) +
      '</label>';
    });
    html += '</fieldset>';
    if (!isChecked) {
      html += '<button type="button" class="btn check-btn" data-id="' + problem.id + '" data-type="choice" style="margin-top:8px">Check</button>';
    }
    return html;
  }

  // ─── Event handlers ───────────────────────────────────────────────────────────

  function handleAreaClick(e) {
    // Hint toggle
    if (e.target.classList.contains("hint-toggle")) {
      var id = e.target.dataset.id;
      var hintEl = document.getElementById("hint-" + id);
      var shown = !hintEl.hidden;
      hintEl.hidden = shown;
      e.target.textContent = shown ? "Show hint" : "Hide hint";
      e.target.setAttribute("aria-expanded", String(!shown));
      return;
    }

    // Check button
    if (e.target.classList.contains("check-btn")) {
      checkProblem(e.target.dataset.id, e.target.dataset.type);
    }
  }

  function handleAreaKeydown(e) {
    if (e.key === "Enter" && e.target.classList.contains("answer-input")) {
      checkProblem(e.target.dataset.id, "short");
    }
  }

  function handleChoiceChange() {
    // Nothing needed — selection persists via checked attribute
  }

  function checkProblem(id, type) {
    var problem = findProblem(id);
    if (!problem || state.checked[id] !== undefined) return;

    var answer;
    if (type === "choice") {
      var selected = document.querySelector('input[name="choice-' + id + '"]:checked');
      answer = selected ? selected.value : "";
    } else {
      var input = document.getElementById("input-" + id);
      answer = input ? input.value.trim() : "";
    }

    if (!answer) {
      toast("Please enter an answer first.", "warn");
      return;
    }

    var correct = isCorrect(problem, answer);
    state.answers[id] = answer;
    state.checked[id] = correct;
    saveState();

    if (correct) {
      toast("Correct! Well done.", "success");
    } else {
      toast("Not quite — see the explanation below.", "error");
    }

    render();
    // Scroll the updated card into view
    setTimeout(function () {
      var card = document.getElementById("problem-" + id);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function findProblem(id) {
    for (var i = 0; i < data.sections.length; i++) {
      var found = data.sections[i].problems.find(function (p) { return p.id === id; });
      if (found) return found;
    }
    return null;
  }

  // ─── Progress bar ─────────────────────────────────────────────────────────────

  function updateProgress() {
    var correct = totalCorrect();
    var total = totalProblems();
    var label = document.getElementById("progressLabel");
    if (label) label.textContent = correct + " / " + total + " done";

    var chip = document.getElementById("progressChip");
    if (chip) {
      chip.classList.toggle("chip-done", correct === total && total > 0);
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────────

  document.getElementById("btnReset").addEventListener("click", function () {
    if (!window.confirm("Reset all progress? This cannot be undone.")) return;
    state = { answers: {}, checked: {} };
    saveState();
    toast("Progress reset.", "info");
    render();
  });

  // ─── Render orchestrator ─────────────────────────────────────────────────────

  function render() {
    renderTabs();
    renderProblems();
    updateProgress();
  }

  // ─── Escape utilities ─────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  state = loadState();
  document.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();

})();
