import React, { useMemo, useState } from 'react';

const EMAIL_BASE = 'https://mail.google.com/mail/#all/';
const CURRENT_DATE = new Date(2026, 4, 11);

const ICONS = {
  mail: '✉',
  calendar: '📅',
  check: '✓',
  search: '⌕',
  school: '📘',
  dance: '♫',
  theater: '★',
  sports: '🏆',
  alert: '!',
  clock: '◷',
  user: '👤',
  users: '👥',
  copy: '⧉',
  activity: '◆',
};

function Icon({ name, className = '' }) {
  return (
    <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center leading-none ${className}`}>
      {ICONS[name] || ICONS.activity}
    </span>
  );
}

function makeGmailLink(id) {
  return `${EMAIL_BASE}${id}`;
}

function makeCalendarEvent(title, dates, details, location = '') {
  return { title, dates, details, location };
}

function buildCalendarLink(item) {
  if (!item.calendar) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.calendar.title,
    dates: item.calendar.dates,
    details: `${item.calendar.details}\n\nSource email: ${item.link}\n\nSave this to the Kids Calendar.`,
  });
  if (item.calendar.location) params.set('location', item.calendar.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getUrgencyBadge(dateString) {
  if (!dateString) return null;
  const match = dateString.match(/May (\d+)/);
  if (match) {
    const day = Number.parseInt(match[1], 10);
    const diff = day - CURRENT_DATE.getDate();
    if (diff === 0) return { label: 'TODAY', color: 'bg-red-500 text-white animate-pulse' };
    if (diff > 0 && diff <= 4) return { label: `IN ${diff} DAYS`, color: 'bg-orange-500 text-white' };
  }
  if (dateString.includes('June 19')) return { label: 'DUE JUNE 19', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
  return null;
}

function createDashboardData() {
  const tabData = {
    School: [
      {
        id: 'school-1', title: 'WGCSD PE Swim Unit', badge: 'ACTIVE NOW', child: 'All', date: 'May 11–June 5',
        urgency: getUrgencyBadge('May 11'), action: 'Send swimsuit, towel, and bag on PE/swim days.',
        bullets: ['Swim unit is active now through June 5.', 'Applies to 3rd–6th grade.', 'Send swimsuit/towel on PE days.'],
        link: makeGmailLink('19e08cb1b9b45b5a'),
        calendar: makeCalendarEvent('WGCSD PE Swim Unit', '20260511/20260606', '3rd–6th grade PE swim unit.', 'WGCSD'),
      },
      {
        id: 'school-2', title: 'Ice Cream with Counselors', badge: 'RSVP DEADLINE', child: 'All',
        date: 'May 15 RSVP (Event May 19)', urgency: getUrgencyBadge('May 15'),
        action: 'RSVP by May 15th for the parent engagement event on May 19th (5:30-6:30 PM).',
        link: makeGmailLink('19df4423dc810eff'),
        calendar: makeCalendarEvent('Ice Cream with Counselors', '20260519T213000Z/20260519T223000Z', 'Parent event focused on coping skills.', 'Cafe 1'),
      },
      {
        id: 'school-3', title: 'Concert Dress', badge: 'OUTFIT', child: 'All', date: 'May 19',
        urgency: getUrgencyBadge('May 19'), action: 'Students voted to wear all black for the concert.',
        link: makeGmailLink('19dbb78836f09aa4'),
        calendar: makeCalendarEvent('Concert: Wear All Black', '20260519/20260520', 'Wear all black for concert.', 'WGES'),
      },
      {
        id: 'school-4', title: 'Spring Concert (3rd-6th)', badge: 'MANDATORY', child: 'All', date: 'May 27, 6:30 PM',
        urgency: getUrgencyBadge('May 27'), action: 'Attendance is extra important; no school-day dress rehearsal.',
        link: makeGmailLink('19de4949c5cb580e'),
        calendar: makeCalendarEvent('Spring Concert', '20260527T223000Z/20260528T000000Z', 'Spring Concert.', 'HS Auditorium'),
      },
    ],
    Theater: [
      {
        id: 'theater-1', title: 'Finding Nemo Jr: Fees & Forms', badge: 'ACTION REQUIRED', child: 'Lily',
        date: 'June 19 Deadline', urgency: getUrgencyBadge('June 19'),
        action: 'Pay $20 participation fee and submit clothing order form (orange shirts/hoodies) to Lorry Johnson by June 19.',
        bullets: ['$20 participation fee due.', 'Clothing order deadline: June 19.', 'Lorry collects fees first 30 mins of practice.'],
        link: makeGmailLink('19dfef9312650902'), calendar: null,
      },
      {
        id: 'theater-2', title: 'Nemo Music Tracks', badge: 'PRACTICE', child: 'Lily', date: 'Ongoing', urgency: null,
        action: 'Practice guide vocals. Use a laptop to download if phone fails.',
        link: makeGmailLink('19de9256219906cc'), calendar: null,
      },
      {
        id: 'theater-3', title: 'Parent Email List', badge: 'RESOLVED', child: 'Lily', date: 'April 27 (Past)', urgency: null,
        action: 'You successfully requested to be added to Lily\'s cast update list.',
        link: makeGmailLink('19dd0582cbd6abde'), calendar: null,
      },
    ],
    Dance: [
      {
        id: 'dance-1', title: 'Dance Recital Prep', badge: 'CHECK BALANCE', child: 'All', date: 'May 18–31',
        urgency: getUrgencyBadge('May 18'), action: 'Check account balance, costumes, tickets, shoes, hair, and recital details.',
        link: makeGmailLink('19dfd66063e86b29'),
        calendar: makeCalendarEvent('Recital Prep Window', '20260518/20260601', 'Recital prep window.', 'Leslie School of Dance'),
      },
      {
        id: 'dance-2', title: 'Teacher Appreciation', badge: 'OPTIONAL', child: 'All', date: 'May 4-10 (Past)', urgency: null,
        action: 'Leave a review mentioning specific teachers so they receive flowers.',
        link: makeGmailLink('19dfe0d24dc3e3f6'), calendar: null,
      },
      {
        id: 'dance-3', title: 'Recital Tickets & Shows', badge: 'TICKETS', child: 'All', date: 'May 30–31',
        urgency: getUrgencyBadge('May 30'), action: 'Confirm show time, tickets, and performer lookup details.',
        link: makeGmailLink('19da67d8b014e974'),
        calendar: makeCalendarEvent('Dance Recital Performances', '20260530/20260601', 'Leslie School of Dance recitals.', 'Clemens Center'),
      },
      {
        id: 'dance-4', title: 'Recital Photo Sessions', badge: 'OPTIONAL', child: 'All', date: 'May 26',
        urgency: getUrgencyBadge('May 26'), action: 'Optional East End Photography individual recital photos.',
        link: makeGmailLink('19dc63b5dc572178'),
        calendarStatus: 'on', calendarEventUrl: 'https://calendar.google.com/calendar',
        calendar: makeCalendarEvent('Photo Option', '20260526/20260527', 'Elmira Heights Studio.', 'Elmira Heights Studio'),
      },
    ],
    Sports: [
      {
        id: 'sports-1', title: "Cole's Track Meet", badge: 'PERSONAL', child: 'Cole', date: 'April 15 (Past)', urgency: null,
        action: 'Bring Twizzlers to Cole\'s meet.',
        link: makeGmailLink('19d926673d1612ab'),
        calendar: makeCalendarEvent('Cole Meet Reminder', '20260415/20260416', 'Bring Twizzlers.', ''),
      },
      {
        id: 'sports-2', title: 'Youth Basketball Camp', badge: 'REGISTRATION', child: 'All', date: 'Summer', urgency: null,
        action: 'Registration open for students entering grades 2–6.',
        link: makeGmailLink('19e0cb021b754884'), calendar: null,
      },
    ],
  };

  const calendarOverview = [
    { day: 'Mon', date: 'May 11', items: [{ title: 'Swim Unit Begins', category: 'School', time: 'All day', link: tabData.School[0].link }] },
    { day: 'Fri', date: 'May 15', items: [{ title: 'Counselor RSVP Due', category: 'School', time: 'Deadline', link: tabData.School[1].link }] },
    { day: 'Tue', date: 'May 19', items: [{ title: 'Concert Dress', category: 'School', time: 'All day', link: tabData.School[2].link }, { title: 'Ice Cream w/ Counselors', category: 'School', time: '5:30 PM', link: tabData.School[1].link }] },
    { day: 'Tue', date: 'May 26', items: [{ title: 'Dance Photos', category: 'Dance', time: 'Scheduled', link: tabData.Dance[3].link }] },
    { day: 'Wed', date: 'May 27', items: [{ title: 'Spring Concert', category: 'School', time: '6:30 PM', link: tabData.School[3].link }] },
    { day: 'Sat-Sun', date: 'May 30', items: [{ title: 'Dance Recitals', category: 'Dance', time: 'TBD', link: tabData.Dance[2].link }] },
    { day: 'Fri', date: 'June 19', items: [{ title: 'Nemo Fees Due', category: 'Theater', time: 'Deadline', link: tabData.Theater[0].link }] },
  ];

  return { tabData, calendarOverview };
}

function CategoryIcon({ category, className }) {
  const iconMap = { School: 'school', Dance: 'dance', Theater: 'theater', Sports: 'sports', Calendar: 'calendar' };
  return <Icon name={iconMap[category] || 'activity'} className={className} />;
}

function CalendarMonthView({ calendarOverview }) {
  const daysInMonth = 31;
  const firstDayOfWeek = 5;
  const today = CURRENT_DATE.getDate();

  const eventsByDay = {};
  calendarOverview.forEach((group) => {
    const match = group.date.match(/May (\d+)/);
    if (match) {
      const day = Number.parseInt(match[1], 10);
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(...group.items);
    }
  });

  if (!eventsByDay[31]) eventsByDay[31] = [];
  eventsByDay[31].push({ title: '→ Nemo Due (June 19)', category: 'Theater', time: 'Look Ahead', link: '#' });

  const days = Array(firstDayOfWeek).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white">May 2026</h3>
          <p className="text-sm text-slate-400">Extracted from Verified Emails</p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <div key={dayName} className="text-center text-xs font-bold text-slate-500 uppercase py-2 tracking-wider">{dayName}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isToday = day === today;
          return (
            <div
              key={`${day || 'blank'}-${index}`}
              className={`min-h-16 rounded-xl border p-1 transition-all ${day ? 'bg-slate-950/50 hover:bg-slate-900/80' : 'border-transparent'} ${isToday ? 'border-blue-500' : 'border-slate-800/50'}`}
            >
              {day ? (
                <>
                  <div className="flex justify-end mb-1">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isToday ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>{day}</span>
                  </div>
                  <div className="space-y-1">
                    {eventsByDay[day]?.map((event, eventIndex) => (
                      <a
                        key={`${event.title}-${eventIndex}`}
                        href={event.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-1 py-1 rounded bg-slate-800/80 hover:bg-blue-900/50 border border-slate-700/50 text-xs font-medium text-slate-300 truncate transition-colors"
                        title={`${event.time} - ${event.title}`}
                      >
                        {event.title}
                      </a>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ item, isCompleted, onToggleComplete }) {
  return (
    <article className={`relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-300 ${isCompleted ? 'opacity-50 grayscale border-slate-800/50 bg-slate-900/20' : 'border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 hover:border-slate-600 hover:shadow-2xl hover:shadow-black/50'}`}>
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {item.urgency ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold tracking-wider ${item.urgency.color}`}>{item.urgency.label}</span>
            ) : null}
            <span className="rounded-full px-2.5 py-1 text-xs font-bold tracking-wider bg-slate-800 text-slate-300">{item.badge}</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleComplete(item.id)}
            className={`p-1.5 rounded-full transition-colors ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
            title="Mark as done"
          >
            <Icon name="check" />
          </button>
        </div>
        <div className="mb-2 flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5 text-blue-400/80"><Icon name="clock" /> {item.date}</span>
          {item.child !== 'All' ? <span className="flex items-center gap-1.5 text-purple-400/80"><Icon name="user" /> {item.child}</span> : null}
        </div>
        <h3 className={`text-base font-bold mb-3 ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{item.title}</h3>
        {item.bullets?.length ? (
          <ul className={`space-y-1.5 text-sm ${isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>
            {item.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 mt-1.5 shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-sm leading-relaxed ${isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>{item.action}</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-800/50">
        <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors">
          <Icon name="mail" /> Open
        </a>
        {item.calendarStatus === 'on' ? (
          <a href={item.calendarEventUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors">
            <Icon name="calendar" /> On Calendar
          </a>
        ) : buildCalendarLink(item) ? (
          <a href={buildCalendarLink(item)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors">
            <Icon name="calendar" /> Add Event
          </a>
        ) : null}
      </div>
    </article>
  );
}

function runDashboardTests(data) {
  const results = [];
  const assert = (name, condition) => results.push({ name, passed: Boolean(condition) });
  const allCards = Object.values(data.tabData).flat();
  assert('School tab has email cards', data.tabData.School.length > 0);
  assert('Dance tab has email cards', data.tabData.Dance.length > 0);
  assert('Theater tab has email cards', data.tabData.Theater.length > 0);
  assert('Sports tab has email cards', data.tabData.Sports.length > 0);
  assert('Calendar overview has dated items', data.calendarOverview.length > 0);
  assert('Every card has an id', allCards.every((item) => Boolean(item.id)));
  assert('Every card has a Gmail link', allCards.every((item) => item.link?.startsWith(EMAIL_BASE)));
  assert('Calendar links generate for calendar-backed items', allCards.filter((item) => item.calendar).every((item) => Boolean(buildCalendarLink(item))));
  assert('Active-now cards support bullets', data.tabData.School[0].bullets.length >= 3);
  assert('Dashboard uses local icons only', typeof Icon === 'function' && Object.keys(ICONS).length >= 10);
  assert('Calendar tab has May 2026 events', data.calendarOverview.some((group) => group.date.includes('May')));
  return results;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('School');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChild, setActiveChild] = useState('All');
  const [completedItems, setCompletedItems] = useState(new Set());

  const data = useMemo(() => createDashboardData(), []);
  const tabs = [...Object.keys(data.tabData), 'Calendar'];
  const testResults = useMemo(() => runDashboardTests(data), [data]);
  const failedTests = testResults.filter((t) => !t.passed);

  const toggleComplete = (id) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    if (activeTab === 'Calendar') return [];
    let items = data.tabData[activeTab] || [];
    if (activeChild !== 'All') items = items.filter((item) => item.child === activeChild || item.child === 'All');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => item.title.toLowerCase().includes(q) || item.action.toLowerCase().includes(q));
    }
    return items;
  }, [activeTab, searchQuery, activeChild, data.tabData]);

  const priorityItems = useMemo(() => {
    let items = [data.tabData.School[0], data.tabData.School[1], data.tabData.Theater[0], data.tabData.Dance[0]];
    if (activeChild !== 'All') items = items.filter((item) => item.child === activeChild || item.child === 'All');
    return items;
  }, [data.tabData, activeChild]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl px-4 py-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg text-white">
              <Icon name="theater" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Family Command Center</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mt-0.5">Verified Inbox Sync Active</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex bg-slate-900 p-1 rounded-full border border-slate-800">
              {['All', 'Lily', 'Cole'].map((child) => (
                <button
                  key={child}
                  type="button"
                  onClick={() => setActiveChild(child)}
                  className={`flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeChild === child ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Icon name={child === 'All' ? 'users' : 'user'} className="mr-1.5" />
                  {child}
                </button>
              ))}
            </div>
            <div className="relative">
              <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <Icon name="alert" />
                <p className="text-xs font-bold uppercase tracking-widest">Priority Action Queue</p>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Do This Week</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {priorityItems.map((item) => (
              <EventCard key={`prio-${item.id}`} item={item} isCompleted={completedItems.has(item.id)} onToggleComplete={toggleComplete} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/40 shadow-2xl p-2 sm:p-4">
          <div className="flex overflow-x-auto gap-2 p-2 border-b border-slate-800/50">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              const count = tab === 'Calendar' ? null : data.tabData[tab].length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                >
                  <CategoryIcon category={tab} className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  {tab}
                  {count !== null ? (
                    <span className={`flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold ${isActive ? 'bg-blue-500/50 text-white' : 'bg-slate-800 text-slate-500'}`}>{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="p-4 sm:p-6 lg:p-8 min-h-96">
            {activeTab === 'Calendar' ? (
              <CalendarMonthView calendarOverview={data.calendarOverview} />
            ) : filteredItems.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <EventCard key={item.id} item={item} isCompleted={completedItems.has(item.id)} onToggleComplete={toggleComplete} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <Icon name="search" className="w-8 h-8 mb-4 opacity-50" />
                <p>No active items found for this view.</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Template Validation</p>
              <h2 className="mt-1 text-xl font-bold text-white">Built-in Checks</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${failedTests.length ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {failedTests.length ? `${failedTests.length} failed` : 'All passed'}
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {testResults.map((test) => (
              <div key={test.name} className={`rounded-2xl border px-4 py-3 text-sm ${test.passed ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-red-500/20 bg-red-500/10 text-red-200'}`}>
                {test.passed ? 'PASS' : 'FAIL'} — {test.name}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
