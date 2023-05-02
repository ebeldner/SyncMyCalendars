/*

  Needs to be streamlined and modified. Create a function for each secondary calendar you want to sync FROM.  

*/

function syncMyOtherCalendar_01(){
  // Keeping this as its own unique named function allows you to create a trigger when this calendar updates and ONLY update events from this calendar.

  calendarID = "XXXXX" // this is probably the email address associated with the calendar
  eventTitleForCalendar = "Unavailable (" + calendarID + ")" ; // By default this will add the ID of the secondary calendar to the event title in your primary (work) calendar
  sync( calendarID, eventTitleForCalendar );
}

function syncMyOtherCalendar_02() {
  // Keeping this as its own unique named function allows you to create a trigger when this calendar updates and ONLY update events from this calendar.

  calendarID = "XXXXX" // this is probably the email address associated with the calendar
  eventTitleForCalendar = "Unavailable (" + calendarID + ")" ; // By default this will add the ID of the secondary calendar to the event title in your primary (work) calendar
  sync( calendarID, eventTitleForCalendar );
}

function syncAllCalendars() {
  // call this function to sync all calendars. Each time you add a new sync function for an individual calendar, call the sync function here.
  syncMyOtherCalendar_01();
  syncMyOtherCalendar_02();
}

