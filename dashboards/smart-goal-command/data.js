window.SMART_GOAL_DASHBOARD_DATA = {
  meta: {
    schemaVersion: "2.0.0",
    productName: "2026 SMART Goal Command Dashboard",
    localStorageKey: "smart_goal_command_dashboard_2026_v2",
    employee: "Douglas Smith",
    supervisor: "Gavin Metcalf",
    organization: "Beginnings Credit Union | IT",
    auditDate: "2026-05-13",
    targetYear: 2026
  },
  goals: [
    {
      id: "tickets",
      title: "Ticket Productivity",
      shortTitle: "Tickets",
      icon: "🎫",
      accent: "sky",
      weight: 30,
      targetLabel: "130 tickets / month",
      status: "Action Required",
      summary: "Maintain a monthly average at or above 130 closed tickets and keep Jira evidence ready for ELT review.",
      months: [
        { id: "jan", label: "January", value: 125, locked: false, evidence: "Jira export imported" },
        { id: "feb", label: "February", value: 132, locked: false, evidence: "Jira export imported" },
        { id: "mar", label: "March", value: 138, locked: false, evidence: "Jira export imported" },
        { id: "apr", label: "April", value: 141, locked: false, evidence: "Jira export imported" },
        { id: "may", label: "May", value: null, locked: false, evidence: "Needs final Jira report" },
        { id: "jun", label: "June", value: null, locked: true, evidence: "Future month" },
        { id: "jul", label: "July", value: null, locked: true, evidence: "Future month" },
        { id: "aug", label: "August", value: null, locked: true, evidence: "Future month" },
        { id: "sep", label: "September", value: null, locked: true, evidence: "Future month" },
        { id: "oct", label: "October", value: null, locked: true, evidence: "Future month" },
        { id: "nov", label: "November", value: null, locked: true, evidence: "Future month" },
        { id: "dec", label: "December", value: null, locked: true, evidence: "Future month" }
      ],
      evidence: [
        { id: "tickets-jan-apr", label: "January-April numbers imported from Jira", done: true },
        { id: "tickets-may", label: "May numbers finalized", done: false },
        { id: "tickets-export", label: "Export official Jira report to ELT Evidence Folder", done: false }
      ]
    },
    {
      id: "procedures",
      title: "IT Procedure Standardization",
      shortTitle: "Procedures",
      icon: "📄",
      accent: "gold",
      weight: 25,
      targetLabel: "18 standardized documents",
      status: "Active",
      summary: "Create standardized, supervisor-accepted runbooks for recurring IT processes.",
      targetCount: 18,
      items: [
        { id: "wirexchange-setup", title: "WireXchange Setup", state: "approved", owner: "Douglas", due: "2026-02-15" },
        { id: "wirexchange-maintenance", title: "WireXchange Maintenance", state: "approved", owner: "Douglas", due: "2026-03-15" },
        { id: "wirexchange-reporting", title: "WireXchange Reporting", state: "approved", owner: "Douglas", due: "2026-04-15" },
        { id: "new-user-ad", title: "New User Active Directory", state: "drafting", owner: "Douglas", due: "2026-05-31" },
        { id: "core-password-reset", title: "Core Banking Password Reset", state: "not-started", owner: "Douglas", due: "2026-06-15" },
        { id: "vpn-provisioning", title: "VPN Access Provisioning", state: "not-started", owner: "Douglas", due: "2026-06-30" }
      ],
      evidence: [
        { id: "procedure-signoff", label: "Request Gavin's sign-off for the 3 WireXchange documents", done: false },
        { id: "procedure-template", label: "Publish standard procedure template", done: true },
        { id: "procedure-backlog", label: "Confirm next 12 procedure candidates", done: false }
      ]
    },
    {
      id: "onboarding",
      title: "Onboarding Efficiency",
      shortTitle: "Onboarding",
      icon: "👤",
      accent: "green",
      weight: 20,
      targetLabel: "100% compliance on 15 items",
      status: "Unverified",
      summary: "Map every new-hire task to evidence so onboarding can be audited quickly and consistently.",
      targetCount: 15,
      items: [
        { id: "ad-account", title: "Active Directory account created", state: "complete", evidence: "Ticket + AD screenshot" },
        { id: "email", title: "Mailbox and distribution lists", state: "complete", evidence: "Exchange admin export" },
        { id: "mfa", title: "MFA enrollment verified", state: "complete", evidence: "MFA portal confirmation" },
        { id: "hardware", title: "Laptop and peripherals issued", state: "complete", evidence: "Asset inventory record" },
        { id: "core-access", title: "Core banking access approved", state: "complete", evidence: "Access approval ticket" },
        { id: "vpn", title: "VPN profile configured", state: "complete", evidence: "VPN group membership" },
        { id: "security-training", title: "Security awareness training assigned", state: "pending", evidence: "Training portal assignment" },
        { id: "manager-attestation", title: "Manager access attestation", state: "pending", evidence: "Signed checklist" },
        { id: "badge", title: "Building badge request", state: "pending", evidence: "Facilities ticket" },
        { id: "phone", title: "Phone/softphone profile", state: "pending", evidence: "Telephony admin screenshot" },
        { id: "printer", title: "Printer and scan access", state: "pending", evidence: "Group membership" },
        { id: "password-vault", title: "Password vault invitation", state: "pending", evidence: "Vault audit event" },
        { id: "department-apps", title: "Department application access", state: "pending", evidence: "App owner approval" },
        { id: "first-login", title: "First-login support completed", state: "pending", evidence: "Ticket note" },
        { id: "closeout", title: "Checklist closeout saved", state: "pending", evidence: "Evidence folder link" }
      ],
      evidence: [
        { id: "onboarding-inventory", label: "Inventory all 15 onboarding controls", done: true },
        { id: "onboarding-links", label: "Attach evidence locations to each checklist item", done: false },
        { id: "onboarding-audit", label: "Validate checklist against latest audit recommendation", done: false }
      ]
    },
    {
      id: "learning",
      title: "Professional Development",
      shortTitle: "Development",
      icon: "🎓",
      accent: "purple",
      weight: 20,
      targetLabel: "2 approved courses",
      status: "Needs Approval",
      summary: "Complete supervisor-approved learning that strengthens communication and cybersecurity readiness.",
      targetCount: 2,
      items: [
        { id: "communication", title: "Communication Course", state: "planning", note: "Get supervisor-approved course name before claiming credit." },
        { id: "cybersecurity", title: "Cybersecurity Training", state: "overdue", note: "Annual compliance requirement from the recent audit report." }
      ],
      evidence: [
        { id: "course-approval", label: "Supervisor approves communication course", done: false },
        { id: "cyber-complete", label: "Cybersecurity training completion certificate saved", done: false },
        { id: "learning-reflection", label: "Add learning notes and applied outcomes", done: false }
      ]
    },
    {
      id: "service",
      title: "Service Quality Guardrail",
      shortTitle: "Quality",
      icon: "🛡️",
      accent: "rose",
      weight: 5,
      targetLabel: "Evidence-ready weekly review",
      status: "Monitoring",
      summary: "Keep blockers, escalations, and quality notes visible so productivity does not hide service risk.",
      targetCount: 4,
      items: [
        { id: "quality-notes", title: "Weekly quality notes captured", state: "active" },
        { id: "blockers", title: "Blockers escalated within 1 business day", state: "active" },
        { id: "member-impact", title: "Member-impact tickets reviewed", state: "active" },
        { id: "retro", title: "Monthly retrospective prepared", state: "not-started" }
      ],
      evidence: [
        { id: "quality-log", label: "Create quality notes log", done: true },
        { id: "quality-retro", label: "Schedule monthly retrospective", done: false }
      ]
    }
  ]
};
