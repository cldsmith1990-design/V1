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
      empty: "No chores waiting. Nice!",
      colorVar: "var(--todo)"
    },
    {
      id: STATUS.APPROVAL,
      title: "Parent Approval",
      empty: "No chores need parent review.",
      colorVar: "var(--approval)"
    },
    {
      id: STATUS.APPROVED,
      title: "Approved",
      empty: "Approved chores will show up here.",
      colorVar: "var(--approved)"
    }
  ];

  var COLOR_MAP = {
    violet: "var(--violet)",
    blue: "var(--blue)",
    green: "var(--green)",
    pink: "var(--pink)",
    orange: "var(--orange)"
  };

  // Hex equivalents used for canvas / SVG strokes
  var RAW_COLOR_MAP = {
    violet: "#b69cff",
    blue: "#69c9ff",
    green: "#7dffb2",
    pink: "#ff9ce4",
    orange: "#ffbd73"
  };

  var seed = window.CHORE_DASHBOARD_DATA || null;
  var storageKey = seed && seed.meta && seed.meta.localStorageKey ? seed.meta.localStorageKey : "chore_dashboard_state_v1";
  var state = loadState();
  var activeColByChild = {};
  var lastChoreIds = {};

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
    bindMobileTabs();
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
    var activeCol = activeColByChild[child.id] || STATUS.TODO;

    return "<article class=\"child-dashboard glass-panel\" style=\"--child-color: " + color + "\" aria-labelledby=\"child-" + escapeHtml(child.id) + "\">" +
      "<header class=\"child-header\">" +
        buildEarningsRing(child, childChores) +
        "<div class=\"child-title\"><span class=\"child-dot\" aria-hidden=\"true\"></span><div><span class=\"eyebrow\">Kid dashboard</span><h2 id=\"child-" + escapeHtml(child.id) + "\">" + escapeHtml(child.name) + "</h2></div></div>" +
        "<p class=\"child-total\">Approved this week: <strong>" + formatCurrency(approvedTotal) + "</strong></p>" +
      "</header>" +
      "<div class=\"kanban-tab-bar\" role=\"tablist\" aria-label=\"" + escapeHtml(child.name) + " column tabs\">" +
        COLUMNS.map(function (column) {
          var count = childChores.filter(function (c) { return c.status === column.id; }).length;
          return "<button type=\"button\" class=\"kanban-tab " + (activeCol === column.id ? "active" : "") + "\"" +
            " data-tab-col=\"" + escapeHtml(column.id) + "\" data-child-id=\"" + escapeHtml(child.id) + "\"" +
            " role=\"tab\" aria-selected=\"" + (activeCol === column.id ? "true" : "false") + "\">" +
            escapeHtml(column.title) + " (" + count + ")</button>";
        }).join("") +
      "</div>" +
      "<div class=\"kanban\" data-active-col=\"" + escapeHtml(activeCol) + "\" aria-label=\"" + escapeHtml(child.name) + " chore pipeline\">" +
        COLUMNS.map(function (column) { return renderColumn(column, child, childChores); }).join("") +
      "</div>" +
    "</article>";
  }

  function buildEarningsRing(child, childChores) {
    var approved = sumChores(childChores.filter(function (c) { return c.status === STATUS.APPROVED; }));
    var totalPossible = sumChores(childChores);
    var pct = totalPossible > 0 ? Math.min(approved / totalPossible, 1) : 0;
    var r = 22;
    var circ = 2 * Math.PI * r;
    var offset = circ * (1 - pct);
    var color = RAW_COLOR_MAP[child.colorKey] || "#72e5ff";

    return "<div class=\"child-ring-wrap\" aria-label=\"Earnings ring\">" +
      "<svg viewBox=\"0 0 60 60\" aria-hidden=\"true\">" +
        "<circle class=\"child-ring-track\" cx=\"30\" cy=\"30\" r=\"" + r + "\"></circle>" +
        "<circle class=\"child-ring-bar\" cx=\"30\" cy=\"30\" r=\"" + r + "\"" +
          " stroke=\"" + color + "\"" +
          " stroke-dasharray=\"" + circ.toFixed(2) + "\"" +
          " stroke-dashoffset=\"" + offset.toFixed(2) + "\"></circle>" +
      "</svg>" +
      "<span class=\"child-ring-label\">$" + Math.round(approved) + "</span>" +
    "</div>";
  }

  function renderColumn(column, child, childChores) {
    var headingId = "column-" + child.id + "-" + column.id;
    var chores = childChores.filter(function (chore) {
      return chore.status === column.id;
    });
    var key = child.id + ":" + column.id;
    var prevIds = lastChoreIds[key] || {};
    var currentIds = {};

    var cardsHtml = chores.map(function (chore) {
      currentIds[chore.id] = true;
      var isNew = !prevIds[chore.id];
      return renderChoreCard(chore, isNew);
    }).join("");

    lastChoreIds[key] = currentIds;

    return "<section class=\"column\" data-col=\"" + escapeHtml(column.id) + "\" aria-labelledby=\"" + headingId + "\">" +
      "<div class=\"column-header\">" +
        "<h3 id=\"" + headingId + "\">" +
          "<span class=\"column-status-dot\" style=\"--col-color: " + column.colorVar + "\" aria-hidden=\"true\"></span>" +
          column.title +
        "</h3>" +
        "<span class=\"count-pill\">" + chores.length + "</span>" +
      "</div>" +
      "<div class=\"card-list\">" +
        (chores.length ? cardsHtml : "<div class=\"empty-state\">" + column.empty + "</div>") +
      "</div>" +
    "</section>";
  }

  function renderChoreCard(chore, isNew) {
    return "<article class=\"chore-card" + (isNew ? " card-entering" : "") + "\">" +
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

  function bindMobileTabs() {
    var container = document.getElementById("childrenDashboards");
    var tabs = container.querySelectorAll(".kanban-tab");
    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var childId = btn.getAttribute("data-child-id");
        var colId = btn.getAttribute("data-tab-col");
        activeColByChild[childId] = colId;
        render();
      });
    });
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

    if (approved.length > 0) {
      launchConfetti();
    }

    window.alert("End-of-week payout total: " + formatCurrency(total));

    approved.forEach(function (chore) {
      chore.status = STATUS.TODO;
    });

    saveState();
    render();
    announce("Payout processed. Approved chores reset to To Do for next week.");
  }

  function launchConfetti() {
    var canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var colors = ["#7dffb2", "#72e5ff", "#ffd166", "#ff9ce4", "#b69cff"];
    var particles = [];
    var count = 150;
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        w: 4 + Math.random() * 10,
        h: 3 + Math.random() * 5,
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vr: -0.2 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    var start = Date.now();
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = 0;
      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.rot += p.vr;
        if (p.y < canvas.height + 30) alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive > 0 && Date.now() - start < 5000) {
        requestAnimationFrame(tick);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(tick);
  }

  function resetSeed() {
    var confirmed = window.confirm("Reset the dashboard to seed data and wipe saved local browser state?");
    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(storageKey);
    state = clone(seed);
    lastChoreIds = {};
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
