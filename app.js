(function () {
  "use strict";

  var STATUS = {
    TODO: "todo",
    APPROVAL: "approval",
    APPROVED: "approved"
  };

  var COLUMNS = [
    {
      id: STATUS.TODO,
      title: "To Do",
      empty: "No chores waiting. Nice!"
    },
    {
      id: STATUS.APPROVAL,
      title: "Parent Approval",
      empty: "No chores need parent review."
    },
    {
      id: STATUS.APPROVED,
      title: "Approved",
      empty: "Approved chores will show up here."
    }
  ];

  var COLOR_MAP = {
    violet: "var(--violet)",
    blue: "var(--blue)",
    green: "var(--green)",
    pink: "var(--pink)",
    orange: "var(--orange)"
  };

  var seed = window.CHORE_DASHBOARD_DATA || null;
  var storageKey = seed && seed.meta && seed.meta.localStorageKey ? seed.meta.localStorageKey : "chore_dashboard_state_v1";
  var state = loadState();

  document.addEventListener("DOMContentLoaded", function () {
    if (!seed) {
      document.body.innerHTML = "<main class='shell'><section class='glass-panel hero'><h1>Missing chore-data.js</h1><p>The dashboard needs window.CHORE_DASHBOARD_DATA to load.</p></section></main>";
      return;
    }

    document.getElementById("childrenDashboards").addEventListener("click", handleBoardClick);
    document.getElementById("payoutButton").addEventListener("click", processPayout);
    document.getElementById("resetSeedButton").addEventListener("click", resetSeed);
    render();
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    var fallback = clone(seed || { meta: {}, children: [], chores: [] });

    try {
      var saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        return fallback;
      }

      var parsed = JSON.parse(saved);
      if (!isValidState(parsed)) {
        return fallback;
      }

      return parsed;
    } catch (error) {
      console.warn("Unable to load saved dashboard state. Falling back to seed data.", error);
      return fallback;
    }
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
    var approvedChores = state.chores.filter(function (chore) {
      return chore.status === STATUS.APPROVED;
    });
    var total = sumChores(approvedChores);

    document.getElementById("totalEarnings").textContent = formatCurrency(total);
    document.getElementById("approvedCount").textContent = approvedChores.length + " approved " + pluralize(approvedChores.length, "chore", "chores");
  }

  function renderChildren() {
    var container = document.getElementById("childrenDashboards");
    container.innerHTML = state.children.map(renderChildDashboard).join("");
  }

  function renderChildDashboard(child) {
    var childChores = choresForChild(child.id);
    var approvedTotal = sumChores(childChores.filter(function (chore) {
      return chore.status === STATUS.APPROVED;
    }));
    var color = COLOR_MAP[child.colorKey] || "var(--todo)";

    return "<article class=\"child-dashboard glass-panel\" style=\"--child-color: " + color + "\" aria-labelledby=\"child-" + escapeHtml(child.id) + "\">" +
      "<header class=\"child-header\">" +
        "<div class=\"child-title\"><span class=\"child-dot\" aria-hidden=\"true\"></span><div><span class=\"eyebrow\">Kid dashboard</span><h2 id=\"child-" + escapeHtml(child.id) + "\">" + escapeHtml(child.name) + "</h2></div></div>" +
        "<p class=\"child-total\">Approved this week: <strong>" + formatCurrency(approvedTotal) + "</strong></p>" +
      "</header>" +
      "<div class=\"kanban\" aria-label=\"" + escapeHtml(child.name) + " chore pipeline\">" +
        COLUMNS.map(function (column) { return renderColumn(column, child, childChores); }).join("") +
      "</div>" +
    "</article>";
  }

  function renderColumn(column, child, childChores) {
    var headingId = "column-" + child.id + "-" + column.id;
    var chores = childChores.filter(function (chore) {
      return chore.status === column.id;
    });

    return "<section class=\"column\" aria-labelledby=\"" + headingId + "\">" +
      "<div class=\"column-header\"><h3 id=\"" + headingId + "\">" + column.title + "</h3><span class=\"count-pill\">" + chores.length + "</span></div>" +
      "<div class=\"card-list\">" +
        (chores.length ? chores.map(renderChoreCard).join("") : "<div class=\"empty-state\">" + column.empty + "</div>") +
      "</div>" +
    "</section>";
  }

  function renderChoreCard(chore) {
    return "<article class=\"chore-card\">" +
      "<h4>" + escapeHtml(chore.title) + "</h4>" +
      "<div class=\"chore-meta\"><span>Allowance value</span><span class=\"value\">" + formatCurrency(chore.value) + "</span></div>" +
      renderActions(chore) +
    "</article>";
  }

  function renderActions(chore) {
    if (chore.status === STATUS.TODO) {
      return "<div class=\"card-actions\"><button type=\"button\" class=\"button small\" data-action=\"did\" data-chore-id=\"" + escapeHtml(chore.id) + "\">I Did This!</button></div>";
    }

    if (chore.status === STATUS.APPROVAL) {
      return "<div class=\"card-actions\"><button type=\"button\" class=\"button primary small\" data-action=\"approve\" data-chore-id=\"" + escapeHtml(chore.id) + "\">Approve</button><button type=\"button\" class=\"button reject small\" data-action=\"reject\" data-chore-id=\"" + escapeHtml(chore.id) + "\">Reject</button></div>";
    }

    return "<div class=\"card-actions\"><span class=\"count-pill\">Ready for payout</span></div>";
  }

  function handleBoardClick(event) {
    var button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    var chore = findChore(button.getAttribute("data-chore-id"));
    if (!chore) {
      return;
    }

    var action = button.getAttribute("data-action");
    if (action === "did") {
      chore.status = STATUS.APPROVAL;
      announce(chore.title + " moved to Parent Approval.");
    } else if (action === "approve") {
      chore.status = STATUS.APPROVED;
      announce(chore.title + " approved.");
    } else if (action === "reject") {
      chore.status = STATUS.TODO;
      announce(chore.title + " returned to To Do.");
    }

    saveState();
    render();
  }

  function processPayout() {
    var approved = state.chores.filter(function (chore) {
      return chore.status === STATUS.APPROVED;
    });
    var total = sumChores(approved);

    window.alert("End-of-week payout total: " + formatCurrency(total));

    approved.forEach(function (chore) {
      chore.status = STATUS.TODO;
    });

    saveState();
    render();
    announce("Payout processed. Approved chores reset to To Do for next week.");
  }

  function resetSeed() {
    var confirmed = window.confirm("Reset the dashboard to seed data and wipe saved local browser state?");
    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(storageKey);
    state = clone(seed);
    render();
    announce("Seed data restored.");
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

  function sumChores(chores) {
    return chores.reduce(function (total, chore) {
      return total + Number(chore.value || 0);
    }, 0);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD"
    }).format(value || 0);
  }

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  }

  function announce(message) {
    var status = document.getElementById("statusMessage");
    if (status) {
      status.textContent = message;
    }
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
