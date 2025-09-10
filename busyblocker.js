/*
  NOTE: if this script is being run on multiple of the shared calendars
  Secondary calendars must be shared with all event details in order to 
  avoid cross-creation of duplicate blocking events. This is prevented by 
  setting and reading a SyncMyCalendars key with value set to the origin
  calendar ID; however, this tag will only be shared with the destination
  calendar if the permissions are set to "share all details". (Share free-busy
  only will not work)
*/
function sync( calendarid, eventTitle ) {

  var id=calendarid; // CHANGE - id of the secondary calendar to pull events from

  var today=new Date();
  var enddate=new Date();
  enddate.setDate(today.getDate()+21); // how many days in advance to monitor and block off time
  
  var secondaryCal=CalendarApp.getCalendarById(id);
  var secondaryEvents=secondaryCal.getEvents(today,enddate);
  
  var destinationCalendar=CalendarApp.getDefaultCalendar();
  var destinationEvents=destinationCalendar.getEvents(today,enddate); // all primary calendar events
  
  var destinationEventTitle=eventTitle; // update this to the text you'd like to appear in the new events created in primary calendar
  
  var stat=1;
  var event_i, existingEvent; 
  var destinationEventsFiltered = []; // to contain primary calendar events that were previously created from secondary calendar
  var destinationEventsUpdated = []; // to contain primary calendar events that were updated from secondary calendar
  var destinationEventsCreated = []; // to contain primary calendar events that were created from secondary calendar
  var destinationEventsDeleted = []; // to contain primary calendar events previously created that have been deleted from secondary calendar

  Logger.log( id + ' - number of primaryEvents: ' + destinationEvents.length);  
  Logger.log( id + ' - number of secondaryEvents: ' + secondaryEvents.length);
  
  // create filtered list of existing primary calendar events that were previously created from the secondary calendar
  for (destev in destinationEvents)
  {
    var destinationEvent = destinationEvents[destev];
    if (destinationEvent.getTitle() == destinationEventTitle)
    { destinationEventsFiltered.push(destinationEvent); }
  }
  
  // process all events in secondary calendar; either update, create, or delete
  for (secev in secondaryEvents)
  {
    stat=1;
    event_i=secondaryEvents[secev];

    // if the secondary event has already been blocked in the primary calendar, update it
    for (existingEvent in destinationEventsFiltered)
      {
        var destinationEvent = destinationEventsFiltered[existingEvent];
        var secondaryTitle = event_i.getTitle();
        var secondaryDesc = event_i.getDescription();
        if ((destinationEvent.getStartTime().getTime()==event_i.getStartTime().getTime()) && (destinationEvent.getEndTime().getTime()==event_i.getEndTime().getTime()))
        {
          stat=0;
          destinationEvent.setTitle(destinationEventTitle);
          // pEvent.setDescription(secondaryTitle + '\n\n' + secondaryDesc);
          // event.setDescription(event_i.getTitle() + '\n\n' + event_i.getDescription());
          // set blocked time as calendar default for the destination calendar
          destinationEvent.setVisibility(CalendarApp.Visibility.DEFAULT); 
          destinationEvent.setColor("8");
          destinationEvent.setTag("CreatedBySyncMyCalendars", calendarid);
          destinationEventsUpdated.push(destinationEvent.getId());
          /*
          Logger.log('PRIMARY EVENT UPDATED'
                     + '\nprimaryId: ' + destinationEvent.getId() 
                     + ' \nprimaryTitle: ' + destinationEvent.getTitle() 
                     + ' \nprimaryDesc: ' + destinationEvent.getDescription()
                    );
          */
        } 
      }


    if (stat==0) continue;    // event has been updated - continue to next object in event loop
    
    var d = event_i.getStartTime();
    var n = d.getDay();

    if (event_i.isAllDayEvent())
    {
      // Do nothing if the event is an all-day or multi-day event. This script only syncs hour-based events
      Logger.log("Found ALL DAY EVENT, skipping creation of " + event_i.getId());
      continue; 
    } 
    else if ( event_i.getTag("CreatedBySyncMyCalendars") !== null ) 
    {
      Logger.log( "Found SyncMyCalendars TAG on novel event, skipping creation of " + event_i.getId());
      continue;
    }
    else if (n==1 || n==2 || n==3 || n==4 ) // Only include days of the week. Delete this if you want to include weekends
    // if the secondary event does not exist in the primary calendar, create it
    {
      // change the Booked text to whatever you would like your merged event titles to be
      var newEvent = destinationCalendar.createEvent(destinationEventTitle,event_i.getStartTime(),event_i.getEndTime()); 

      /*
      // alternative version that copies the exact secondary event information into the primary calendar event
      var newEvent = primaryCal.createEvent(
          event_i.getTitle(),
          event_i.getStartTime(),
          event_i.getEndTime(), 
          {
            location: event_i.getLocation(), 
            description: event_i.getDescription()
          });  
      newEvent.setDescription(event_i.getTitle() + '\n\n' + event_i.getDescription());
      */
      newEvent.setDescription("");

      Logger.log( "Attempting to set tag for " + newEvent.getTitle() + " with value " + calendarid);
      newEvent.setTag("CreatedBySyncMyCalendars", calendarid);
      newEvent.setVisibility(CalendarApp.Visibility.DEFAULT); // set blocked time as default appointments in destination calendar
      newEvent.setColor("8"); // set the copied event's color to gray

      // so you don't get double notifications. 
      // Delete this if you want to keep the default reminders for your newly created primary calendar events
      newEvent.removeAllReminders();

      destinationEventsCreated.push(newEvent.getId());
      Logger.log('CREATED DESTINATION EVENT'
                 + '\nprimaryId: ' + newEvent.getId() 
                 + '\nprimaryTitle: ' + newEvent.getTitle() 
                 + '\nprimaryDesc: ' + newEvent.getDescription() 
                 + '\ntag CreatedBySyncMyCalendars set to: ' + newEvent.getTag("CreatedBySyncMyCalendars")
                 );
    }
  }

  // if a primary event previously created no longer exists in the secondary calendar, delete it
  for (pev in destinationEventsFiltered)
  {
    var pevIsUpdatedIndex = destinationEventsUpdated.indexOf(destinationEventsFiltered[pev].getId());
    if (pevIsUpdatedIndex == -1)
    { 
      var pevIdToDelete = destinationEventsFiltered[pev].getId();
      Logger.log(pevIdToDelete + ' deleted');
      destinationEventsDeleted.push(pevIdToDelete);
      destinationEventsFiltered[pev].deleteEvent();
    }
  }  

  Logger.log('Primary events previously created: ' + destinationEventsFiltered.length);
  Logger.log('Primary events updated: ' + destinationEventsUpdated.length);
  Logger.log('Primary events deleted: ' + destinationEventsDeleted.length);
  Logger.log('Primary events created: ' + destinationEventsCreated.length);

}  

function syncMyOtherCalendar_01(){
  // Keeping this as its own unique named function allows you to create a trigger when this calendar updates and ONLY update events from this calendar.

  calendarID = "you1@example.com" // this is probably the email address associated with the calendar
  eventTitleForCalendar = "Unavailable (" + calendarID + ")" ; // By default this will add the ID of the secondary calendar to the event title in your primary (work) calendar
  sync( calendarID, eventTitleForCalendar );
}

function syncMyOtherCalendar_02() {
  // Keeping this as its own unique named function allows you to create a trigger when this calendar updates and ONLY update events from this calendar.

  calendarID = "you2@example.com" // this is probably the email address associated with the calendar
  eventTitleForCalendar = "Unavailable (" + calendarID + ")" ; // By default this will add the ID of the secondary calendar to the event title in your primary (work) calendar
  sync( calendarID, eventTitleForCalendar );
}

function syncAllCalendars() {
  // call this function to sync all calendars. Each time you add a new sync function for an individual calendar, call the sync function here.
  syncMyOtherCalendar_01();
  //  syncMyOtherCalendar_02();
}
