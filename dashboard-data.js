// FAMILY DASHBOARD MANUAL DATA FILE
// Replace this whole file when ChatGPT generates updated dashboard data.
// This file must define window.DASHBOARD_DATA and must not use imports, modules, or fetch.
window.DASHBOARD_DATA = {
  meta: {
    schemaVersion: "1.0.0",
    generatedAt: "2026-05-11T00:00:00-04:00",
    generatedBy: "ChatGPT manual extraction task",
    dataMode: "manual_file",
    timezone: "America/New_York",
    sourceWindow: {
      startDate: "2026-05-11",
      endDate: "2026-06-11"
    },
    sourceTypesReviewed: ["gmail", "calendar", "manual_notes"],
    dashboardInstructions: {
      defaultView: "today",
      showNeedsReviewFirst: true,
      hideArchivedByDefault: true
    }
  },
  children: [
    {
      id: "lily",
      displayName: "Lily",
      colorKey: "purple",
      active: true
    },
    {
      id: "cole",
      displayName: "Cole",
      colorKey: "blue",
      active: true
    }
  ],
  categories: [
    { id: "school", label: "School", visible: true },
    { id: "dance", label: "Dance", visible: true },
    { id: "theater", label: "Theater", visible: true },
    { id: "sports", label: "Sports", visible: true },
    { id: "family", label: "Family", visible: true },
    { id: "other", label: "Other", visible: false }
  ],
  items: [
    {
      id: "sample_school_field_trip",
      type: "event",
      title: "Sample school field trip",
      category: "school",
      childIds: ["lily"],
      childNames: ["Lily"],
      date: "2026-05-26",
      startTime: "08:15",
      endTime: "14:15",
      allDay: false,
      timezone: "America/New_York",
      location: {
        name: "School front entrance",
        address: null,
        notes: "Confirm bus departure details."
      },
      source: {
        sourceType: "manual_notes",
        summary: "Starter sample showing how an event appears.",
        sender: null,
        receivedAt: null,
        subject: null,
        link: null,
        confidence: "needs_review"
      },
      actionNeeded: {
        required: true,
        label: "Replace this sample with real family data",
        dueDate: null,
        assignedTo: "Parent",
        status: "not_started"
      },
      prepItems: [
        { label: "Bag lunch", status: "needed" },
        { label: "Permission slip", status: "needed" }
      ],
      calendarStatus: "not_checked",
      priority: "high",
      reviewStatus: "sample",
      notes: "This is starter data only. Ask ChatGPT to generate a fresh dashboard-data.js file from your current information.",
      tags: ["sample", "school"]
    },
    {
      id: "sample_family_reminder",
      type: "task",
      title: "Sample family reminder",
      category: "family",
      childIds: ["lily", "cole"],
      childNames: ["Lily", "Cole"],
      date: null,
      startTime: null,
      endTime: null,
      allDay: false,
      timezone: "America/New_York",
      location: {
        name: null,
        address: null,
        notes: null
      },
      source: {
        sourceType: "manual_notes",
        summary: "Starter sample for an undated item.",
        sender: null,
        receivedAt: null,
        subject: null,
        link: null,
        confidence: "needs_review"
      },
      actionNeeded: {
        required: false,
        label: null,
        dueDate: null,
        assignedTo: null,
        status: "not_started"
      },
      prepItems: [],
      calendarStatus: "needs_review",
      priority: "normal",
      reviewStatus: "sample",
      notes: "Undated items stay visible without guessing a date.",
      tags: ["sample", "family"]
    }
  ],
  review: {
    overallStatus: "sample_only",
    warnings: ["Starter sample data is loaded. Replace dashboard-data.js with real generated data."],
    unknowns: [],
    excludedItems: []
  }
};
