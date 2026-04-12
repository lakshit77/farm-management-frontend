# ShowGroundsLive — Mobile app features

## App access & sign in

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/01-sign-in.png" alt="Sign in — add file screenshots/mobile/01-sign-in.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">What you see</th><th align="left">What it does</th></tr>
<tr><td><strong>ShowGroundsLive branding</strong></td><td>Identifies the product (farm &amp; show management).</td></tr>
<tr><td><strong>Email &amp; password</strong></td><td>Users sign in with Supabase email/password authentication.</td></tr>
<tr><td><strong>Show / hide password</strong></td><td>Toggles password visibility on the device keyboard form.</td></tr>
<tr><td><strong>Error messages</strong></td><td>Displays authentication errors from the server (e.g. wrong password).</td></tr>
</table>

</td>
</tr></table>

---

## Main mobile layout (header, tabs, loading & errors)

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/02-shell-overview.png" alt="Mobile shell — add file screenshots/mobile/02-shell-overview.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Top header</strong></td><td>Shows the <strong>show name</strong> (or “ShowGroundsLive” if none), <strong>selected show date</strong> (weekday + month + day), <strong>filter control</strong> (sliders icon), and <strong>menu</strong> (hamburger).</td></tr>
<tr><td><strong>Filter dot</strong></td><td>A small indicator appears on the filter button when horse, class, or status filters are active.</td></tr>
<tr><td><strong>Bottom tab bar</strong></td><td>Primary navigation: <strong>Overview</strong>, <strong>Classes</strong>, <strong>Rings</strong>, <strong>Board</strong>, <strong>Alerts</strong>; <strong>Chat</strong> appears only when chat is enabled for the user/farm.</td></tr>
<tr><td><strong>Alerts badge</strong></td><td>The Alerts tab can show a numeric badge (up to “99+”) reflecting how many notifications are loaded for the current context.</td></tr>
<tr><td><strong>Loading state</strong></td><td>Spinner and “Loading…” while schedule data is fetched.</td></tr>
<tr><td><strong>Error banner</strong></td><td>Red banner at the top of the content area when data loading fails.</td></tr>
</table>

</td>
</tr></table>

---

## Filters (bottom sheet)

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/03-filters.png" alt="Filters — add file screenshots/mobile/03-filters.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Horse</strong></td><td>Restricts schedule views to one horse (searchable list when many options).</td></tr>
<tr><td><strong>Class</strong></td><td>Restricts to one class name (searchable when many options).</td></tr>
<tr><td><strong>Status</strong></td><td>Filters entries by high-level status: not started, underway, or completed.</td></tr>
<tr><td><strong>Apply Filters</strong></td><td>Saves choices and closes the sheet.</td></tr>
<tr><td><strong>Clear All</strong></td><td>Resets all three filters (shown when any filter is set).</td></tr>
</table>

<p style="margin-top: 0.75rem;">Filters apply across <strong>Overview</strong>, <strong>Classes</strong>, <strong>Rings</strong>, and <strong>Board</strong>. Notification history can also be filtered when linked to schedule entries.</p>

</td>
</tr></table>

---

## Menu drawer (hamburger)

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/04-menu-drawer.png" alt="Menu drawer — add file screenshots/mobile/04-menu-drawer.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Profile block</strong></td><td>Avatar initial, display name, and optionally email.</td></tr>
<tr><td><strong>Show date</strong></td><td>Opens a <strong>native date picker</strong> to change which day’s schedule and alerts load; closes the drawer after selection.</td></tr>
<tr><td><strong>Sync Data</strong></td><td>Opens a confirmation step, then triggers a <strong>class monitoring / data sync</strong> request so the app can pull the latest updates. Shows <strong>last run time</strong> when available (trimmed to a short time + “ET”).</td></tr>
<tr><td><strong>My Tasks</strong></td><td>Opens the full-screen <strong>Tasks</strong> experience; subtitle shows <strong>pending task count</strong> when greater than zero.</td></tr>
<tr><td><strong>Notifications</strong></td><td>Opens <strong>notification settings</strong> (push master toggle and per-category preferences). Shows whether this device is subscribed.</td></tr>
<tr><td><strong>Sign out</strong></td><td>Ends the session and returns to the sign-in screen.</td></tr>
</table>

</td>
</tr></table>

---

## Sync confirmation

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/13-sync-modal.png" alt="Sync modal — add file screenshots/mobile/13-sync-modal.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Confirm / cancel</strong></td><td>Prevents accidental sync; user must confirm before the sync action runs from the drawer.</td></tr>
</table>

</td>
</tr></table>

---

## Tab: Overview

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/05-tab-overview.png" alt="Overview — add file screenshots/mobile/05-tab-overview.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>KPI strip</strong></td><td>Horizontal chips for <strong>Horses</strong>, <strong>Classes</strong>, <strong>Done</strong> (completed entries), <strong>Active</strong>, and <strong>Prize</strong> (total prize money summed for visible entries).</td></tr>
<tr><td><strong>Class Progress</strong></td><td>Collapsible list: per-class <strong>completed trips vs total trips</strong> with a progress bar.</td></tr>
<tr><td><strong>Horse Results</strong></td><td>Collapsible list grouped by horse; expand a horse to see per-class <strong>placing</strong>, <strong>best score</strong>, <strong>faults</strong>, <strong>prize money</strong>, and <strong>status</strong> coloring.</td></tr>
<tr><td><strong>Day Timeline</strong></td><td>Collapsible timeline by <strong>time of day</strong>: which horses run in which classes, with status dots.</td></tr>
<tr><td><strong>Empty states</strong></td><td>Messages when there is no schedule for the date, or no rows match the current filter.</td></tr>
</table>

</td>
</tr></table>

---

## Tab: Classes

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/06-tab-classes.png" alt="Classes — add file screenshots/mobile/06-tab-classes.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Events &amp; rings</strong></td><td>Each event shows its name and <strong>ring number</strong> when present.</td></tr>
<tr><td><strong>Expand class</strong></td><td>Tap to open a class; shows <strong>entry count</strong>.</td></tr>
<tr><td><strong>Entry rows</strong></td><td>Compact row: <strong>time</strong>, <strong>horse</strong>, <strong>status badge</strong> (Done / Active / Next / Off), expandable for details.</td></tr>
<tr><td><strong>Entry detail</strong></td><td><strong>Rider</strong>, <strong>class</strong>, <strong>class status</strong>, <strong>estimated start</strong>, <strong>placing</strong>; <strong>Results</strong> (trips, points, prize); <strong>Rounds</strong> (faults/time per round); <strong>Scores</strong> (multiple score columns when present).</td></tr>
<tr><td><strong>Not in class</strong></td><td>When filters are off and the API returns them, an expandable <strong>“Not in class”</strong> section lists horses marked inactive / off-schedule with rider and badge.</td></tr>
<tr><td><strong>Filter empty state</strong></td><td>Dedicated message when filters exclude all entries.</td></tr>
</table>

</td>
</tr></table>

---

## Tab: Rings

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/07-tab-rings.png" alt="Rings — add file screenshots/mobile/07-tab-rings.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Ring selector</strong></td><td>Horizontal pills to switch <strong>ring (event)</strong>; each shows venue/event title when available, ring number, and entry count.</td></tr>
<tr><td><strong>Timeline</strong></td><td>Ordered list by <strong>scheduled time</strong>: horse, rider + class, <strong>placing</strong> if known, and <strong>status</strong> pill (Done / In progress / Upcoming / Inactive).</td></tr>
<tr><td><strong>Horse colors</strong></td><td>A <strong>consistent color</strong> per horse (left border) for quick scanning.</td></tr>
<tr><td><strong>Unscheduled</strong></td><td>Entries without a parseable time appear under an <strong>Unscheduled</strong> divider.</td></tr>
<tr><td><strong>Legend</strong></td><td>Footer shows <strong>horse name ↔ color</strong> samples for entries in the current ring.</td></tr>
</table>

</td>
</tr></table>

---

## Tab: Board

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/08-tab-board.png" alt="Board — add file screenshots/mobile/08-tab-board.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Ring × time grid</strong></td><td>Dense <strong>timetable</strong>: columns are rings (<strong>R1</strong>, <strong>R2</strong>, …), rows are <strong>time slots</strong> (30-minute buckets) that have at least one entry, plus an <strong>N/A</strong> row for unscheduled items when needed.</td></tr>
<tr><td><strong>Cell chips</strong></td><td>Each cell shows an <strong>abbreviated horse name</strong> on a color matched to that horse.</td></tr>
<tr><td><strong>Tap for details</strong></td><td>Tapping opens an overlay with <strong>horse</strong>, <strong>rider</strong>, <strong>class</strong>, <strong>time</strong> (or “Unscheduled”), <strong>status</strong>, <strong>placing</strong>, and <strong>back number</strong> when available.</td></tr>
<tr><td><strong>Viewport fit</strong></td><td>Layout is sized to fit between the mobile header and tab bar for an at-a-glance arena view.</td></tr>
</table>

</td>
</tr></table>

---

## Tab: Alerts (notifications log)

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/09-tab-alerts.png" alt="Alerts — add file screenshots/mobile/09-tab-alerts.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Category pills</strong></td><td><strong>All</strong>, <strong>Class</strong>, <strong>Horse</strong>, <strong>Avail.</strong> (availability), <strong>Results</strong> — each shows counts.</td></tr>
<tr><td><strong>Grouped feed</strong></td><td>Notifications are grouped by category with <strong>icon</strong>, <strong>label</strong>, <strong>timestamp</strong> (time + date in the app’s display timezone), and <strong>summary</strong> text.</td></tr>
<tr><td><strong>Load more</strong></td><td>Fetches the next page of older notifications when more exist.</td></tr>
<tr><td><strong>Empty state</strong></td><td>Message when there are no notifications for the selected date.</td></tr>
</table>

</td>
</tr></table>

---

## Chat (optional)

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/10-chat.png" alt="Chat — add file screenshots/mobile/10-chat.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<p>Chat is shown <strong>only</strong> when the product configuration and user entitlements allow it (farm + role checks in the app).</p>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Channel list</strong></td><td>“Chats” screen listing available channels (e.g. <strong>All Team</strong>, <strong>Admin</strong> for admins, <strong>Personal Assistant</strong>). Shows loading skeletons while channels connect.</td></tr>
<tr><td><strong>Conversation</strong></td><td>Full-screen messaging powered by <strong>Stream Chat</strong>: custom header with <strong>back</strong>, message list, and input.</td></tr>
<tr><td><strong>Tab bar hidden in thread</strong></td><td>While a conversation is open, the bottom tabs are covered so the experience feels like a dedicated chat app.</td></tr>
<tr><td><strong>Errors</strong></td><td>If chat cannot connect, user sees an explanatory error state.</td></tr>
</table>

</td>
</tr></table>

---

## Tasks

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/11-tasks.png" alt="Tasks — add file screenshots/mobile/11-tasks.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<p>Opened from <strong>My Tasks</strong> in the menu drawer (not a bottom tab).</p>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Week navigation</strong></td><td>Week strip (<strong>Mon–Sun</strong>), arrows to change week, <strong>today</strong> highlighted.</td></tr>
<tr><td><strong>Tasks by due date</strong></td><td>Tasks grouped for the selected day; supports <strong>pending</strong> vs <strong>completed</strong> sections.</td></tr>
<tr><td><strong>Overdue</strong></td><td>Collapsible section for overdue work (when applicable).</td></tr>
<tr><td><strong>Create / edit</strong></td><td>Modals to add or change tasks (assignees, due dates, etc., per task UI).</td></tr>
<tr><td><strong>Refresh</strong></td><td>Reloads task data from the server.</td></tr>
<tr><td><strong>Undo</strong></td><td>After completing a task, a short <strong>undo</strong> window can revert before the change is finalized.</td></tr>
</table>

</td>
</tr></table>

---

## Notification settings

<table width="100%"><tr valign="top">
<td width="38%" style="padding-right: 1rem;">

<img src="screenshots/mobile/12-notification-settings.png" alt="Notification settings — add file screenshots/mobile/12-notification-settings.png" width="100%" style="max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />

</td>
<td>

<table>
<tr><th align="left">Feature</th><th align="left">What it does</th></tr>
<tr><td><strong>Master toggle (this device)</strong></td><td>Subscribes or unsubscribes <strong>push notifications</strong> for the logged-in user on the current device; syncs with backend subscription records.</td></tr>
<tr><td><strong>Per-category preferences</strong></td><td>Fine-grained toggles (e.g. class, results, alerts) stored <strong>per user</strong>; categories are disabled visually when the master toggle is off.</td></tr>
<tr><td><strong>Browser permission denied</strong></td><td>If notifications are blocked at the OS/browser level, the UI directs the user to change system settings instead of failing silently.</td></tr>
<tr><td><strong>Close</strong></td><td>Returns to the mobile shell.</td></tr>
</table>

</td>
</tr></table>

---

## Summary checklist for your client deck

- Sign in (email/password)  
- Show-scoped dashboard with **date** selection  
- **Six main areas**: Overview, Classes, Rings, Board, Alerts, optional **Chat**  
- **Filters**: horse, class, status  
- **Menu**: profile, date, sync, tasks, notification settings, sign out  
- **Overview**: KPIs, class progress, horse results, day timeline  
- **Classes**: hierarchical schedule + rich entry detail + “not in class”  
- **Rings**: per-ring timeline with horse colors  
- **Board**: multi-ring time grid with tap-for-detail  
- **Alerts**: categorized notification log with pagination  
- **Tasks**: week-based task management (overlay)  
- **Push**: device subscription + category preferences + iOS/home-screen guidance  

---
