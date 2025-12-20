// UserSettingsDefaults: committed defaults. For real calendar IDs, create user_settings.local.gs with UserSettingsLocal.
var UserSettingsDefaults = {
  windowDays: AdminControls.WINDOW_DAYS,
  includeDays: [0,1,2,3,4,5,6], // all days
  destinationEventTitle: 'Unavailable',
  color: '8', // gray
  clearDescription: true,
  removeReminders: true,
  visibility: CalendarApp.Visibility.DEFAULT,
  // Add your source calendars in user_settings.local.gs (UserSettingsLocal).
  // This default stays empty to avoid PII in source control.
  sourceCalendars: [
    // { id: '<calendar-id>', title: 'Unavailable (<calendar-id>)' },
  ]
};
