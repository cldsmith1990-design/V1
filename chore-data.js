// Kids Chore Dashboard seed data.
// This file is intentionally static and local-first: no imports, network calls, or build tools.
window.CHORE_DASHBOARD_DATA = {
  meta: {
    schemaVersion: "2.0.0",
    productName: "Kids Chore Dashboard",
    localStorageKey: "chore_dashboard_state_v2",
    weeklyTargetPerChild: 50,
    extraChoreValue: 20,
    airtable: {
      enabled: false,
      tableName: "Chores"
    }
  },
  children: [
    { id: "lily", name: "Lily", colorKey: "violet" },
    { id: "cole", name: "Cole", colorKey: "blue" },
    { id: "mason", name: "Mason", colorKey: "green" }
  ],
  chores: [
    { id: "lily_bed_mon_morning", title: "Make bed", childId: "lily", day: "Mon", time: "Morning", value: 2, status: "not_done", notes: "", isExtra: false },
    { id: "lily_pet_mon_evening", title: "Feed the pet", childId: "lily", day: "Mon", time: "Evening", value: 3, status: "done", notes: "", isExtra: false },
    { id: "lily_table_tue_evening", title: "Clear dinner table", childId: "lily", day: "Tue", time: "Evening", value: 3, status: "fix_needed", notes: "Wipe crumbs from the chairs too.", isExtra: false },
    { id: "lily_backpack_wed_morning", title: "Pack backpack", childId: "lily", day: "Wed", time: "Morning", value: 2, status: "not_done", notes: "", isExtra: false },
    { id: "lily_laundry_fri_day", title: "Put laundry away", childId: "lily", day: "Fri", time: "Day", value: 5, status: "not_done", notes: "", isExtra: false },
    { id: "lily_room_sat_day", title: "Bedroom reset", childId: "lily", day: "Sat", time: "Day", value: 4, status: "done", notes: "", isExtra: false },

    { id: "cole_trash_mon_evening", title: "Take trash out", childId: "cole", day: "Mon", time: "Evening", value: 4, status: "not_done", notes: "", isExtra: false },
    { id: "cole_bed_tue_morning", title: "Make bed", childId: "cole", day: "Tue", time: "Morning", value: 2, status: "done", notes: "", isExtra: false },
    { id: "cole_dishes_wed_evening", title: "Load dishwasher", childId: "cole", day: "Wed", time: "Evening", value: 5, status: "not_done", notes: "", isExtra: false },
    { id: "cole_homework_thu_day", title: "Homework station reset", childId: "cole", day: "Thu", time: "Day", value: 3, status: "fix_needed", notes: "Put pencils back in the cup.", isExtra: false },
    { id: "cole_pet_fri_morning", title: "Refresh pet water", childId: "cole", day: "Fri", time: "Morning", value: 2, status: "not_done", notes: "", isExtra: false },
    { id: "cole_yard_sun_day", title: "Pick up yard toys", childId: "cole", day: "Sun", time: "Day", value: 4, status: "done", notes: "", isExtra: false },

    { id: "mason_plants_mon_day", title: "Water plants", childId: "mason", day: "Mon", time: "Day", value: 3, status: "done", notes: "", isExtra: false },
    { id: "mason_bed_wed_morning", title: "Make bed", childId: "mason", day: "Wed", time: "Morning", value: 2, status: "not_done", notes: "", isExtra: false },
    { id: "mason_laundry_thu_day", title: "Sort clean laundry", childId: "mason", day: "Thu", time: "Day", value: 5, status: "not_done", notes: "", isExtra: false },
    { id: "mason_table_fri_evening", title: "Set dinner table", childId: "mason", day: "Fri", time: "Evening", value: 3, status: "fix_needed", notes: "Forks go on the left.", isExtra: false },
    { id: "mason_bathroom_sat_morning", title: "Bathroom counter wipe", childId: "mason", day: "Sat", time: "Morning", value: 4, status: "not_done", notes: "", isExtra: false },
    { id: "mason_shoes_sun_evening", title: "Line up school shoes", childId: "mason", day: "Sun", time: "Evening", value: 2, status: "done", notes: "", isExtra: false }
  ]
};
