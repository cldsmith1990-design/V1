(function () {
  "use strict";

  var seed = window.SMART_GOAL_DASHBOARD_DATA;
  var storageKey = seed.meta.localStorageKey;
  var state = loadState();
  var selectedGoalId = "overview";

  var accentMap = {
    sky: "#38bdf8",
    gold: "#d4af37",
    green: "#4ade80",
    purple: "#c084fc",
    rose: "#fb7185"
  };

  document.addEventListener("DOMContentLoaded", function () {
    bindShellActions();
    render();
    showToast("Dashboard upgraded and ready.");
  });

  function bindShellActions() {
    document.getElementById("resetButton").addEventListener("click", function () {
      state = clone(seed);
      persist();
      selectedGoalId = "overview";
      render();
      showToast("Dashboard reset to the curated 2026 seed.");
    });

    document.getElementById("printButton").addEventListener("click", function () {
      window.print();
    });

    document.getElementById("exportButton").addEventListener("click", exportReport);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      var saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        return clone(seed);
      }

      var parsed = JSON.parse(saved);
      if (!parsed || !parsed.meta || !Array.isArray(parsed.goals)) {
        return clone(seed);
      }

      return mergeSeedWithSaved(clone(seed), parsed);
    } catch (error) {
      console.warn("Unable to load SMART goal dashboard state.", error);
      return clone(seed);
    }
  }

  function mergeSeedWithSaved(fresh, saved) {
    fresh.goals.forEach(function (goal) {
      var savedGoal = saved.goals.find(function (candidate) { return candidate.id === goal.id; });
      if (!savedGoal) return;

      if (Array.isArray(goal.months) && Array.isArray(savedGoal.months)) {
        goal.months.forEach(function (month) {
          var savedMonth = savedGoal.months.find(function (candidate) { return candidate.id === month.id; });
          if (savedMonth) month.value = savedMonth.value;
        });
      }

      ["items", "evidence"].forEach(function (collection) {
        if (!Array.isArray(goal[collection]) || !Array.isArray(savedGoal[collection])) return;
        goal[collection].forEach(function (item) {
          var savedItem = savedGoal[collection].find(function (candidate) { return candidate.id === item.id; });
          if (!savedItem) return;
          if (Object.prototype.hasOwnProperty.call(savedItem, "state")) item.state = savedItem.state;
          if (Object.prototype.hasOwnProperty.call(savedItem, "done")) item.done = savedItem.done;
          if (Object.prototype.hasOwnProperty.call(savedItem, "evidence")) item.evidence = savedItem.evidence;
          if (Object.prototype.hasOwnProperty.call(savedItem, "note")) item.note = savedItem.note;
        });
      });
    });

    return fresh;
  }

  function persist() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Unable to save SMART goal dashboard state.", error);
      showToast("Browser storage is unavailable; changes may not persist.");
    }
  }

  function render() {
    renderMeta();
    renderSummary();
    renderTabs();
    renderGoalCards();
    renderPane();
  }

  function renderMeta() {
    document.getElementById("orgName").textContent = state.meta.organization;
    document.getElementById("heroMeta").textContent = state.meta.employee + " • Supervisor: " + state.meta.supervisor + " • Last audited " + formatDate(state.meta.auditDate);
  }

  function renderSummary() {
    var totalWeight = state.goals.reduce(function (sum, goal) { return sum + goal.weight; }, 0);
    var weightedProgress = getWeightedProgress();
    var evidence = getEvidenceStats();
    var ticketAverage = getTicketAverage(getGoal("tickets"));

    document.getElementById("totalWeight").textContent = totalWeight + "%";
    document.getElementById("overallScore").textContent = Math.round(weightedProgress) + "%";
    document.getElementById("overallRing").style.setProperty("--score", Math.round(weightedProgress) + "%");
    document.getElementById("evidenceScore").textContent = Math.round(evidence.percent) + "%";
    document.getElementById("evidenceCount").textContent = evidence.done + " of " + evidence.total + " items";
    document.getElementById("openActions").textContent = evidence.total - evidence.done;
    document.getElementById("ticketAverage").textContent = ticketAverage.average ? Math.round(ticketAverage.average) + "/mo" : "—";
  }

  function renderTabs() {
    var tabs = [{ id: "overview", shortTitle: "Overview", icon: "⌘" }].concat(state.goals);
    document.getElementById("tabs").innerHTML = tabs.map(function (tab) {
      var isActive = selectedGoalId === tab.id;
      return "<button type=\"button\" class=\"tab " + (isActive ? "active" : "") + "\" data-tab=\"" + escapeHtml(tab.id) + "\"><span>" + escapeHtml(tab.icon) + "</span>" + escapeHtml(tab.shortTitle) + "</button>";
    }).join("");

    document.getElementById("tabs").querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", function () {
        selectedGoalId = button.dataset.tab;
        render();
      });
    });
  }

  function renderGoalCards() {
    document.getElementById("goalCards").innerHTML = state.goals.map(function (goal, index) {
      var progress = getGoalProgress(goal);
      var evidence = getGoalEvidenceStats(goal);
      var accent = accentMap[goal.accent] || accentMap.sky;
      var span = index === 0 ? "wide" : "";
      return "<article class=\"goal-card glass " + span + "\" style=\"--accent:" + accent + "\" data-goal=\"" + escapeHtml(goal.id) + "\" tabindex=\"0\">" +
        "<div class=\"goal-topline\"><span class=\"goal-icon\">" + escapeHtml(goal.icon) + "</span><span class=\"status " + getStatusTone(goal.status) + "\">" + escapeHtml(goal.status) + "</span></div>" +
        "<h3>" + escapeHtml(goal.title) + "</h3>" +
        "<p>" + escapeHtml(goal.summary) + "</p>" +
        "<div class=\"metric-row\"><span>Weight " + goal.weight + "%</span><strong>" + Math.round(progress) + "%</strong></div>" +
        "<div class=\"progress\"><span style=\"width:" + clamp(progress, 0, 100) + "%\"></span></div>" +
        "<footer><span>Target: " + escapeHtml(goal.targetLabel) + "</span><span>Evidence " + evidence.done + "/" + evidence.total + "</span></footer>" +
      "</article>";
    }).join("");

    document.getElementById("goalCards").querySelectorAll(".goal-card").forEach(function (card) {
      card.addEventListener("click", function () { selectedGoalId = card.dataset.goal; render(); });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectedGoalId = card.dataset.goal;
          render();
        }
      });
    });
  }

  function renderPane() {
    var overview = document.getElementById("overviewPane");
    var detail = document.getElementById("detailPane");
    if (selectedGoalId === "overview") {
      overview.classList.add("active");
      detail.classList.remove("active");
      detail.innerHTML = "";
      return;
    }

    var goal = getGoal(selectedGoalId);
    overview.classList.remove("active");
    detail.classList.add("active");
    detail.innerHTML = renderGoalDetail(goal);
    bindDetailActions(goal);
  }

  function renderGoalDetail(goal) {
    var progress = getGoalProgress(goal);
    return "<article class=\"detail glass\" style=\"--accent:" + (accentMap[goal.accent] || accentMap.sky) + "\">" +
      "<header class=\"detail-header\"><button class=\"button ghost\" type=\"button\" id=\"backToOverview\">← Overview</button><div><span class=\"eyebrow\">" + goal.weight + "% weight • " + escapeHtml(goal.targetLabel) + "</span><h2>" + escapeHtml(goal.icon + " " + goal.title) + "</h2><p>" + escapeHtml(goal.summary) + "</p></div><strong class=\"detail-score\">" + Math.round(progress) + "%</strong></header>" +
      (goal.months ? renderTicketTracker(goal) : renderItemTracker(goal)) +
      renderEvidence(goal) +
    "</article>";
  }

  function renderTicketChart(goal) {
    var target = 130;
    var values = goal.months.map(function (m) {
      return { label: m.label.slice(0, 3), value: m.value, locked: m.locked };
    });
    var nums = values.map(function (v) { return v.value || 0; });
    var maxVal = Math.max.apply(null, [target * 1.2].concat(nums));

    var bars = values.map(function (m) {
      if (m.locked || m.value === null || m.value === undefined) {
        return "<div class=\"ticket-bar-col\">" +
          "<div class=\"ticket-bar bar-future\" style=\"height:4px\"></div>" +
          "<span class=\"ticket-bar-label\">" + escapeHtml(m.label) + "</span>" +
        "</div>";
      }
      var h = Math.max(4, Math.round((m.value / maxVal) * 64));
      var cls = m.value >= target ? "ticket-bar" : "ticket-bar bar-below";
      return "<div class=\"ticket-bar-col\">" +
        "<span class=\"ticket-bar-value\">" + m.value + "</span>" +
        "<div class=\"" + cls + "\" style=\"height:" + h + "px\"></div>" +
        "<span class=\"ticket-bar-label\">" + escapeHtml(m.label) + "</span>" +
      "</div>";
    }).join("");

    return "<div class=\"ticket-chart\">" + bars + "</div>";
  }

  function renderTicketTracker(goal) {
    var stats = getTicketAverage(goal);
    return "<section class=\"detail-grid\"><div class=\"panel\"><div class=\"panel-heading\"><h3>Monthly scorecard</h3><span>Average " + (stats.average ? Math.round(stats.average) : 0) + " / 130</span></div>" +
      renderTicketChart(goal) +
      "<div class=\"month-grid\">" +
      goal.months.map(function (month) {
        var value = month.value === null || month.value === undefined ? "" : month.value;
        return "<label class=\"month-card " + (month.locked ? "locked" : "") + "\"><span>" + escapeHtml(month.label) + "</span><input type=\"number\" min=\"0\" inputmode=\"numeric\" data-month=\"" + escapeHtml(month.id) + "\" value=\"" + escapeHtml(value) + "\" placeholder=\"0\" " + (month.locked ? "disabled" : "") + "><small>" + escapeHtml(month.evidence) + "</small></label>";
      }).join("") +
      "</div></div><div class=\"panel insights\"><h3>Next-best actions</h3>" + renderActionList(goal) + "</div></section>";
  }

  function renderItemTracker(goal) {
    return "<section class=\"detail-grid\"><div class=\"panel\"><div class=\"panel-heading\"><h3>Work tracker</h3><span>" + getCompletedItemCount(goal) + " / " + goal.targetCount + " complete</span></div><div class=\"item-list\">" +
      goal.items.map(function (item) {
        return "<article class=\"work-item\"><div><strong>" + escapeHtml(item.title) + "</strong><small>" + escapeHtml(item.evidence || item.note || item.owner || "Evidence pending") + "</small></div>" + renderStateControl(goal, item) + "</article>";
      }).join("") +
      "</div></div><div class=\"panel insights\"><h3>Next-best actions</h3>" + renderActionList(goal) + "</div></section>";
  }

  function renderStateControl(goal, item) {
    var states = getStatesForGoal(goal.id);
    return "<select data-item=\"" + escapeHtml(item.id) + "\" aria-label=\"Status for " + escapeHtml(item.title) + "\">" + states.map(function (stateOption) {
      return "<option value=\"" + stateOption.value + "\" " + (item.state === stateOption.value ? "selected" : "") + ">" + stateOption.label + "</option>";
    }).join("") + "</select>";
  }

  function renderEvidence(goal) {
    return "<section class=\"panel evidence-panel\"><div class=\"panel-heading\"><h3>ELT evidence readiness</h3><span>" + getGoalEvidenceStats(goal).done + " / " + getGoalEvidenceStats(goal).total + " ready</span></div><div class=\"evidence-list\">" +
      goal.evidence.map(function (item) {
        return "<label class=\"evidence-item\"><input type=\"checkbox\" data-evidence=\"" + escapeHtml(item.id) + "\" " + (item.done ? "checked" : "") + "><span>" + escapeHtml(item.label) + "</span></label>";
      }).join("") +
    "</div></section>";
  }

  function renderActionList(goal) {
    var actions = goal.evidence.filter(function (item) { return !item.done; }).slice(0, 4);
    if (!actions.length) return "<p class=\"empty\">All evidence actions are ready. Maintain the cadence.</p>";
    return "<ol class=\"action-list\">" + actions.map(function (action) { return "<li>" + escapeHtml(action.label) + "</li>"; }).join("") + "</ol>";
  }

  function bindDetailActions(goal) {
    document.getElementById("backToOverview").addEventListener("click", function () {
      selectedGoalId = "overview";
      render();
    });

    document.querySelectorAll("[data-month]").forEach(function (input) {
      input.addEventListener("input", function () {
        var month = goal.months.find(function (candidate) { return candidate.id === input.dataset.month; });
        month.value = input.value === "" ? null : Number(input.value);
        persist();
        renderSummary();
        showToast("Ticket scorecard saved.");
      });
    });

    document.querySelectorAll("[data-item]").forEach(function (select) {
      select.addEventListener("change", function () {
        var item = goal.items.find(function (candidate) { return candidate.id === select.dataset.item; });
        item.state = select.value;
        persist();
        render();
        showToast("Goal status updated.");
      });
    });

    document.querySelectorAll("[data-evidence]").forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        var item = goal.evidence.find(function (candidate) { return candidate.id === checkbox.dataset.evidence; });
        item.done = checkbox.checked;
        persist();
        render();
        showToast("Evidence readiness updated.");
      });
    });
  }

  function getStatesForGoal(goalId) {
    if (goalId === "learning") {
      return [
        { value: "planning", label: "Planning" },
        { value: "approved", label: "Approved" },
        { value: "complete", label: "Complete" },
        { value: "overdue", label: "Overdue" }
      ];
    }

    return [
      { value: "not-started", label: "Not Started" },
      { value: "pending", label: "Pending" },
      { value: "drafting", label: "Drafting" },
      { value: "active", label: "Active" },
      { value: "complete", label: "Complete" },
      { value: "approved", label: "Approved" }
    ];
  }

  function getGoal(id) {
    return state.goals.find(function (goal) { return goal.id === id; });
  }

  function getWeightedProgress() {
    var totalWeight = state.goals.reduce(function (sum, goal) { return sum + goal.weight; }, 0);
    var weighted = state.goals.reduce(function (sum, goal) { return sum + (getGoalProgress(goal) * goal.weight); }, 0);
    return totalWeight ? weighted / totalWeight : 0;
  }

  function getGoalProgress(goal) {
    if (goal.months) {
      var stats = getTicketAverage(goal);
      return stats.months ? clamp((stats.average / 130) * 100, 0, 100) : 0;
    }

    var denominator = goal.targetCount || goal.items.length || 1;
    return clamp((getCompletedItemCount(goal) / denominator) * 100, 0, 100);
  }

  function getCompletedItemCount(goal) {
    if (!goal.items) return 0;
    return goal.items.filter(function (item) {
      return ["approved", "complete", "active"].indexOf(item.state) !== -1;
    }).length;
  }

  function getTicketAverage(goal) {
    var values = goal.months.filter(function (month) {
      return typeof month.value === "number" && !Number.isNaN(month.value) && month.value > 0;
    }).map(function (month) { return month.value; });
    var total = values.reduce(function (sum, value) { return sum + value; }, 0);
    return { average: values.length ? total / values.length : 0, months: values.length };
  }

  function getEvidenceStats() {
    var total = 0;
    var done = 0;
    state.goals.forEach(function (goal) {
      total += goal.evidence.length;
      done += goal.evidence.filter(function (item) { return item.done; }).length;
    });
    return { total: total, done: done, percent: total ? (done / total) * 100 : 0 };
  }

  function getGoalEvidenceStats(goal) {
    var total = goal.evidence.length;
    var done = goal.evidence.filter(function (item) { return item.done; }).length;
    return { total: total, done: done };
  }

  function exportReport() {
    var rows = [["Goal", "Weight", "Progress%", "EvidenceDone", "EvidenceTotal", "Status"]];
    state.goals.forEach(function (goal) {
      var ev = getGoalEvidenceStats(goal);
      rows.push([
        goal.title,
        goal.weight,
        Math.round(getGoalProgress(goal)),
        ev.done,
        ev.total,
        goal.status
      ]);
    });
    rows.push([]);
    rows.push(["Overall Progress", Math.round(getWeightedProgress()) + "%"]);
    rows.push(["Employee", state.meta.employee]);
    rows.push(["Supervisor", state.meta.supervisor]);
    rows.push(["Generated", new Date().toISOString()]);

    var csv = rows.map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\n");

    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "smart-goal-elt-report-2026.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("ELT report exported as CSV.");
  }

  function csvCell(value) {
    if (value === null || value === undefined) return "";
    var str = String(value);
    if (/[",\n]/.test(str)) {
      return "\"" + str.replace(/"/g, "\"\"") + "\"";
    }
    return str;
  }

  function showToast(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.classList.remove("visible"); }, 2200);
  }

  function getStatusTone(status) {
    var normalized = status.toLowerCase();
    if (normalized.indexOf("required") !== -1 || normalized.indexOf("unverified") !== -1) return "danger";
    if (normalized.indexOf("approval") !== -1 || normalized.indexOf("active") !== -1) return "warning";
    return "good";
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value + "T00:00:00"));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character];
    });
  }
})();
