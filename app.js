(function () {
  "use strict";

  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var TIMES = ["Morning", "Day", "Evening"];
  var STATUS_ORDER = ["not_done", "done", "fix_needed"];
  var STATUS_LABELS = {
    not_done: "Not Done",
    done: "Done",
    fix_needed: "Fix Needed"
  };
  var STATUS_ICONS = {
    not_done: "○",
    done: "✓",
    fix_needed: "⚠"
  };
  var COLOR_MAP = {
    violet: "var(--violet)",
    blue: "var(--blue)",
    green: "var(--green)",
    pink: "var(--pink)",
    orange: "var(--orange)"
  };

  var seed = window.CHORE_DASHBOARD_DATA || null;
  var storageKey = seed && seed.meta && seed.meta.localStorageKey ? seed.meta.localStorageKey : "chore_dashboard_state_v2";
  var state = loadState();

  document.addEventListener("DOMContentLoaded", function () {
    if (!seed) {
      document.body.innerHTML = "<main class='shell'><section class='glass-panel hero'><h1>Missing chore-data.js</h1><p>The dashboard needs window.CHORE_DASHBOARD_DATA to load.</p></section></main>";
      return;
    }

    document.getElementById("childrenDashboards").addEventListener("click", handleDashboardClick);
    document.getElementById("childrenDashboards").addEventListener("keydown", handleDashboardKeydown);
    document.getElementById("payoutButton").addEventListener("click", processPayout);
    document.getElementById("resetSeedButton").addEventListener("click", resetSeed);
    document.getElementById("printButton").addEventListener("click", printDashboard);
    document.getElementById("exportButton").addEventListener("click", exportMarkdown);
    document.getElementById("syncButton").addEventListener("click", configureAirtableSync);
    render();
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    var fallback = normalizeState(clone(seed || { meta: {}, children: [], chores: [] }));

    try {
      var saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        return fallback;
      }

      var parsed = normalizeState(JSON.parse(saved));
      if (!isValidState(parsed)) {
        return fallback;
      }

      return parsed;
    } catch (error) {
      console.warn("Unable to load saved dashboard state. Falling back to seed data.", error);
      return fallback;
    }
  }

  function normalizeState(raw) {
    var normalized = raw || { meta: {}, children: [], chores: [] };
    normalized.meta = normalized.meta || {};
    normalized.children = Array.isArray(normalized.children) ? normalized.children : [];
    normalized.chores = Array.isArray(normalized.chores) ? normalized.chores : [];
    normalized.chores = normalized.chores.map(function (chore, index) {
      var copy = Object.assign({}, chore);
      copy.id = copy.id || "chore_" + index + "_" + Date.now();
      copy.day = DAYS.indexOf(copy.day) >= 0 ? copy.day : DAYS[index % DAYS.length];
      copy.time = TIMES.indexOf(copy.time) >= 0 ? copy.time : TIMES[index % TIMES.length];
      copy.status = STATUS_ORDER.indexOf(copy.status) >= 0 ? copy.status : migrateStatus(copy.status);
      copy.notes = typeof copy.notes === "string" ? copy.notes : "";
      copy.isExtra = Boolean(copy.isExtra);
      copy.value = Number(copy.value || (copy.isExtra ? getExtraChoreValue() : 0));
      return copy;
    });
    return normalized;
  }

  function migrateStatus(status) {
    if (status === "approved") return "done";
    if (status === "approval") return "fix_needed";
    return "not_done";
  }

  function isValidState(value) {
    return Boolean(value && value.meta && Array.isArray(value.children) && Array.isArray(value.chores));
  }

  function saveState() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Unable to save dashboard state.", error);
      announce("Changes could not be saved in this browser session.");
    }
  }

  function render() {
    renderTotals();
    renderChildren();
  }

  function renderTotals() {
    var combinedTarget = getWeeklyTarget() * state.children.length;
    var total = sumChores(state.chores.filter(isEarned));
    var doneCount = state.chores.filter(isEarned).length;
    var difference = total - combinedTarget;
    var summary = total >= combinedTarget
      ? formatCurrency(Math.max(difference, 0)) + " extra beyond " + formatCurrency(combinedTarget) + " target"
      : formatCurrency(Math.abs(difference)) + " short of " + formatCurrency(combinedTarget) + " target";

    document.getElementById("totalEarnings").textContent = formatCurrency(total);
    document.getElementById("targetSummary").textContent = doneCount + " done " + pluralize(doneCount, "chore", "chores") + " · " + summary;
    document.getElementById("combinedProgress").style.width = progressPercent(total, combinedTarget) + "%";
  }

  function renderChildren() {
    document.getElementById("childrenDashboards").innerHTML = state.children.map(renderChildDashboard).join("");
  }

  function renderChildDashboard(child) {
    var childChores = choresForChild(child.id);
    var earnedChores = childChores.filter(isEarned);
    var total = sumChores(earnedChores);
    var target = getWeeklyTarget();
    var color = COLOR_MAP[child.colorKey] || "var(--todo)";
    var shortfall = Math.max(target - total, 0);
    var extra = Math.max(total - target, 0);

    return "<article class=\"child-dashboard glass-panel\" style=\"--child-color: " + color + "\" aria-labelledby=\"child-" + escapeHtml(child.id) + "\">" +
      "<header class=\"child-header\">" +
        "<div class=\"child-title\"><span class=\"child-dot\" aria-hidden=\"true\"></span><div><span class=\"eyebrow\">Kid dashboard</span><h2 id=\"child-" + escapeHtml(child.id) + "\">" + escapeHtml(child.name) + "</h2></div></div>" +
        "<div class=\"child-earnings\"><span>Weekly total</span><strong>" + formatCurrency(total) + "</strong><em>" + formatCurrency(total) + " of " + formatCurrency(target) + (extra > 0 ? " · " + formatCurrency(extra) + " extra" : " · " + formatCurrency(shortfall) + " short") + "</em><div class=\"progress-track\" aria-hidden=\"true\"><span style=\"width: " + progressPercent(total, target) + "%\"></span></div></div>" +
      "</header>" +
      renderWeeklyTable(child, childChores) +
      renderExtraChores(child, childChores) +
    "</article>";
  }

  function renderWeeklyTable(child, childChores) {
    var html = "<div class=\"weekly-table-wrap\"><table class=\"weekly-table\" aria-label=\"" + escapeHtml(child.name) + " weekly chore schedule\"><thead><tr><th scope=\"col\" class=\"time-heading\">Time</th>";

    DAYS.forEach(function (day) {
      html += "<th scope=\"col\" class=\"day-header\">" + day + "</th>";
    });

    html += "</tr></thead><tbody>";
    TIMES.forEach(function (time) {
      html += "<tr><th scope=\"row\" class=\"time-label\">" + time + "</th>";
      DAYS.forEach(function (day) {
        var chores = childChores.filter(function (chore) {
          return !chore.isExtra && chore.day === day && chore.time === time;
        });
        html += "<td class=\"time-slot\" data-day=\"" + day + "\" data-time=\"" + time + "\"><span class=\"mobile-slot-label\">" + day + " · " + time + "</span>" +
          (chores.length ? chores.map(renderChoreCard).join("") : "<span class=\"empty-slot\">–</span>") +
        "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  function renderExtraChores(child, childChores) {
    var extras = childChores.filter(function (chore) { return chore.isExtra; });
    return "<section class=\"extra-panel\" aria-labelledby=\"extra-" + escapeHtml(child.id) + "\">" +
      "<div class=\"extra-header\"><div><span class=\"eyebrow\">Optional paid work</span><h3 id=\"extra-" + escapeHtml(child.id) + "\">Extra Chores</h3><p>One-off tasks are worth " + formatCurrency(getExtraChoreValue()) + " each.</p></div>" +
      "<button type=\"button\" class=\"button small\" data-action=\"add-extra\" data-child-id=\"" + escapeHtml(child.id) + "\">+ Extra Chore</button></div>" +
      "<div class=\"extra-list\">" + (extras.length ? extras.map(renderChoreCard).join("") : "<p class=\"empty-extra\">No extra paid chores yet.</p>") + "</div>" +
    "</section>";
  }

  function renderChoreCard(chore) {
    var status = STATUS_LABELS[chore.status] || STATUS_LABELS.not_done;
    var note = chore.notes ? "<p class=\"note-preview\"><strong>Note:</strong> " + escapeHtml(chore.notes) + "</p>" : "";
    var noteButton = chore.status === "fix_needed"
      ? "<button type=\"button\" class=\"note-button\" data-action=\"note\" data-chore-id=\"" + escapeHtml(chore.id) + "\" aria-label=\"Add or edit note for " + escapeHtml(chore.title) + "\">📝</button>"
      : "";

    return "<article class=\"chore-card status-" + chore.status.replace("_", "-") + (chore.isExtra ? " extra-chore" : "") + "\" role=\"button\" tabindex=\"0\" data-action=\"cycle\" data-chore-id=\"" + escapeHtml(chore.id) + "\" aria-label=\"" + escapeHtml(chore.title) + ", " + status + ", " + formatCurrency(chore.value) + ". Activate to change status.\">" +
      "<div class=\"chore-topline\"><h4>" + escapeHtml(chore.title) + "</h4><span class=\"status-badge\" aria-hidden=\"true\">" + STATUS_ICONS[chore.status] + "</span></div>" +
      "<div class=\"chore-meta\"><span>Allowance value <strong>" + formatCurrency(chore.value) + "</strong></span><span>" + status + "</span></div>" +
      (chore.isExtra ? "<span class=\"extra-flag\">Extra paid chore</span>" : "") +
      note +
      noteButton +
    "</article>";
  }

  function handleDashboardClick(event) {
    var actionButton = event.target.closest("[data-action='add-extra'], [data-action='note']");
    if (actionButton) {
      event.preventDefault();
      event.stopPropagation();
      if (actionButton.getAttribute("data-action") === "add-extra") {
        addExtraChore(actionButton.getAttribute("data-child-id"));
      } else {
        editNote(actionButton.getAttribute("data-chore-id"));
      }
      return;
    }

    var card = event.target.closest(".chore-card[data-action='cycle']");
    if (card) {
      cycleChoreStatus(card.getAttribute("data-chore-id"));
    }
  }

  function handleDashboardKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    var card = event.target.closest(".chore-card[data-action='cycle']");
    if (!card) {
      return;
    }

    event.preventDefault();
    cycleChoreStatus(card.getAttribute("data-chore-id"));
  }

  function cycleChoreStatus(choreId) {
    var chore = findChore(choreId);
    if (!chore) return;

    var currentIndex = STATUS_ORDER.indexOf(chore.status);
    chore.status = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
    if (chore.status !== "fix_needed") {
      chore.notes = "";
    } else if (!chore.notes) {
      var note = window.prompt("What needs to be fixed for this chore?", "");
      if (note !== null) {
        chore.notes = note.trim();
      }
    }

    saveState();
    render();
    announce(chore.title + " is now " + STATUS_LABELS[chore.status] + ".");
  }

  function editNote(choreId) {
    var chore = findChore(choreId);
    if (!chore) return;

    var note = window.prompt("Enter note for this chore:", chore.notes || "");
    if (note === null) return;

    chore.notes = note.trim();
    if (chore.status !== "fix_needed") {
      chore.status = "fix_needed";
    }
    saveState();
    render();
    announce("Note saved for " + chore.title + ".");
  }

  function addExtraChore(childId) {
    var title = window.prompt("Extra chore title:", "Bonus helper task");
    if (title === null || !title.trim()) return;

    state.chores.push({
      id: "extra_" + childId + "_" + Date.now(),
      title: title.trim(),
      childId: childId,
      day: "Sun",
      time: "Day",
      value: getExtraChoreValue(),
      status: "not_done",
      notes: "",
      isExtra: true
    });
    saveState();
    render();
    announce("Extra chore added.");
  }

  function processPayout() {
    var earned = state.chores.filter(isEarned);
    var total = sumChores(earned);
    window.alert("End-of-week payout total: " + formatCurrency(total));

    earned.forEach(function (chore) {
      chore.status = "not_done";
      chore.notes = "";
    });

    saveState();
    render();
    announce("Payout processed. Done chores reset to Not Done for next week.");
  }

  function resetSeed() {
    if (!window.confirm("Reset the dashboard to seed data and wipe saved local browser state?")) return;

    window.localStorage.removeItem(storageKey);
    state = normalizeState(clone(seed));
    render();
    announce("Seed data restored.");
  }

  function printDashboard() {
    window.print();
    announce("Print dialog opened.");
  }

  function exportMarkdown() {
    var markdown = buildMarkdownReport();
    var blob = new Blob([markdown], { type: "text/markdown" });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "weekly-chore-report.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    announce("Markdown report exported.");
  }

  function buildMarkdownReport() {
    var total = sumChores(state.chores.filter(isEarned));
    var markdown = "# Weekly Chore Report\n\n";
    markdown += "**Combined earned:** " + formatCurrency(total) + "\n\n";

    state.children.forEach(function (child) {
      var childChores = choresForChild(child.id);
      var childTotal = sumChores(childChores.filter(isEarned));
      markdown += "## " + child.name + "\n\n";
      markdown += "**Total earned:** " + formatCurrency(childTotal) + " of " + formatCurrency(getWeeklyTarget()) + "\n\n";
      childChores.forEach(function (chore) {
        markdown += "- **" + chore.title + "** [" + chore.day + " " + chore.time + "]: " + formatCurrency(chore.value) + " — " + STATUS_LABELS[chore.status] + (chore.isExtra ? " — Extra" : "") + "\n";
        if (chore.notes) {
          markdown += "  - Note: " + chore.notes + "\n";
        }
      });
      markdown += "\n";
    });

    return markdown;
  }

  function configureAirtableSync() {
    var baseId = window.prompt("Airtable base ID (leave blank to cancel):", state.meta.airtableBaseId || "");
    if (!baseId) return;
    var tableName = window.prompt("Airtable table name:", state.meta.airtableTableName || "Chores");
    if (!tableName) return;
    var apiKey = window.prompt("Airtable personal access token. It is saved only in this browser's localStorage:", state.meta.airtableApiKey || "");
    if (!apiKey) return;

    state.meta.airtableBaseId = baseId.trim();
    state.meta.airtableTableName = tableName.trim();
    state.meta.airtableApiKey = apiKey.trim();
    saveState();
    syncToAirtable();
  }

  function syncToAirtable() {
    var meta = state.meta || {};
    if (!meta.airtableBaseId || !meta.airtableTableName || !meta.airtableApiKey) {
      announce("Airtable sync needs a base ID, table name, and token.");
      return;
    }

    var endpoint = "https://api.airtable.com/v0/" + encodeURIComponent(meta.airtableBaseId) + "/" + encodeURIComponent(meta.airtableTableName);
    var records = state.chores.slice(0, 10).map(function (chore) {
      return {
        fields: {
          ID: chore.id,
          Child: chore.childId,
          Title: chore.title,
          Day: chore.day,
          Time: chore.time,
          Value: chore.value,
          Status: chore.status,
          Notes: chore.notes,
          IsExtra: chore.isExtra
        }
      };
    });

    window.fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + meta.airtableApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ records: records, typecast: true })
    }).then(function (response) {
      if (!response.ok) throw new Error("Airtable returned " + response.status);
      return response.json();
    }).then(function () {
      announce("Airtable sync completed for the first " + records.length + " chores.");
    }).catch(function (error) {
      console.warn(error);
      announce("Airtable sync failed. Check your credentials and table fields.");
      window.alert("Airtable sync failed: " + error.message);
    });
  }

  function choresForChild(childId) {
    return state.chores.filter(function (chore) {
      return chore.childId === childId;
    });
  }

  function findChore(choreId) {
    return state.chores.find(function (chore) {
      return chore.id === choreId;
    });
  }

  function isEarned(chore) {
    return chore.status === "done";
  }

  function sumChores(chores) {
    return chores.reduce(function (total, chore) {
      return total + Number(chore.value || 0);
    }, 0);
  }

  function getWeeklyTarget() {
    return Number(state.meta.weeklyTargetPerChild || 50);
  }

  function getExtraChoreValue() {
    var meta = state && state.meta ? state.meta : seed && seed.meta ? seed.meta : {};
    return Number(meta.extraChoreValue || 20);
  }

  function progressPercent(value, target) {
    if (!target) return 0;
    return Math.min(100, Math.round((value / target) * 100));
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value || 0);
  }

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  }

  function announce(message) {
    var status = document.getElementById("statusMessage");
    if (status) status.textContent = message;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}());
