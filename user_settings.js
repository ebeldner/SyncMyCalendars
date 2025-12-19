// UserSettings: knobs end users can control (respecting AdminControls when enforced)
// Do not put real calendar IDs here if you plan to commit this file. Copy this to
// `user_settings.local.js` (gitignored) for your real IDs.
var UserSettings = {
  windowDays: AdminControls.WINDOW_DAYS,
  includeDays: [0,1,2,3,4,5,6], // all days
  destinationEventTitle: 'Unavailable',
  color: '8', // gray
  clearDescription: true,
  removeReminders: true,
  visibility: CalendarApp.Visibility.DEFAULT,
  sourceCalendars: [
    { id: 'you1@example.com', title: 'Unavailable (you1@example.com)' },
    // { id: 'you2@example.com', title: 'Unavailable (you2@example.com)' },
  ]
};
