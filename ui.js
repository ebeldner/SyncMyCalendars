function doGet() {
  return HtmlService.createHtmlOutputFromFile('settings_ui')
    .setTitle('BusyBlocker Settings');
}

function listAvailableCalendars() {
  var calendars = CalendarApp.getAllCalendars();
  var result = [];
  for (var i = 0; i < calendars.length; i++) {
    var cal = calendars[i];
    result.push({
      id: cal.getId(),
      name: cal.getName(),
      primary: typeof cal.isMyPrimaryCalendar === 'function' ? cal.isMyPrimaryCalendar() : false
    });
  }
  result.sort(function(a, b) {
    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
  });
  return result;
}

function getSettingsData() {
  var settings = loadUserSettings();
  var calendars = listAvailableCalendars();
  var selected = {};
  for (var i = 0; i < settings.sourceCalendars.length; i++) {
    selected[settings.sourceCalendars[i].id] = true;
  }
  for (var j = 0; j < calendars.length; j++) {
    calendars[j].selected = !!selected[calendars[j].id];
  }
  return {
    settings: {
      windowDays: settings.windowDays,
      includeDays: settings.includeDays,
      destinationEventTitle: settings.destinationEventTitle,
      color: settings.color,
      removeReminders: settings.removeReminders,
      visibility: visibilityKey(settings.visibility),
      sourceCalendars: settings.sourceCalendars
    },
    calendars: calendars
  };
}

function saveSettingsFromClient(data) {
  var saved = saveUserSettings(data || {});
  return {
    windowDays: saved.windowDays,
    includeDays: saved.includeDays,
    destinationEventTitle: saved.destinationEventTitle,
    color: saved.color,
    removeReminders: saved.removeReminders,
    visibility: visibilityKey(saved.visibility),
    sourceCalendars: saved.sourceCalendars
  };
}

function resetUserSettings() {
  PropertiesService.getUserProperties().deleteProperty(USER_SETTINGS_KEY);
  var settings = loadUserSettings();
  return {
    windowDays: settings.windowDays,
    includeDays: settings.includeDays,
    destinationEventTitle: settings.destinationEventTitle,
    color: settings.color,
    removeReminders: settings.removeReminders,
    visibility: visibilityKey(settings.visibility),
    sourceCalendars: settings.sourceCalendars
  };
}
