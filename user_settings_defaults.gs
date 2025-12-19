// UserSettingsDefaults: committed defaults. For real calendar IDs, create user_settings.local.gs with UserSettingsLocal.
var UserSettingsDefaults = {
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
