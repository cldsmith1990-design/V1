// Kids Chore Dashboard seed data.
// This file is intentionally static and local-first: no imports, network calls, or build tools.
window.CHORE_DASHBOARD_DATA = {
  meta: {
    schemaVersion: "1.0.0",
    productName: "Kids Chore Dashboard",
    localStorageKey: "chore_dashboard_state_v1"
  },
  children: [
    {
      id: "lily",
      name: "Lily",
      colorKey: "violet"
    },
    {
      id: "cole",
      name: "Cole",
      colorKey: "blue"
    },
    {
      id: "mason",
      name: "Mason",
      colorKey: "green"
    }
  ],
  chores: [
    {
      id: "lily_make_bed",
      title: "Make bed before school",
      childId: "lily",
      value: 1.5,
      status: "todo"
    },
    {
      id: "lily_feed_pet",
      title: "Feed the family pet",
      childId: "lily",
      value: 2,
      status: "approval"
    },
    {
      id: "lily_clear_table",
      title: "Clear dinner table",
      childId: "lily",
      value: 2.5,
      status: "approved"
    },
    {
      id: "cole_take_trash",
      title: "Take trash to the bin",
      childId: "cole",
      value: 2,
      status: "todo"
    },
    {
      id: "cole_backpack",
      title: "Empty and hang backpack",
      childId: "cole",
      value: 1,
      status: "approval"
    },
    {
      id: "cole_dishes",
      title: "Load dishwasher after dinner",
      childId: "cole",
      value: 3,
      status: "approved"
    },
    {
      id: "mason_laundry",
      title: "Put clean laundry away",
      childId: "mason",
      value: 3,
      status: "todo"
    },
    {
      id: "mason_room",
      title: "Ten-minute bedroom reset",
      childId: "mason",
      value: 2,
      status: "approval"
    },
    {
      id: "mason_water_plants",
      title: "Water indoor plants",
      childId: "mason",
      value: 1.5,
      status: "approved"
    }
  ]
};
