/* 
  Google apps script to block off time in a destination calendar (e.g. a work calendar) 
  with appointments created in secondary calendars that have been shared with the destination 
  calendar account (e.g. personal or consulting calendars). 
  
  This file should be linked and contains the key functionality. 
  
  https://janelloi.com/auto-sync-google-calendar/
  Originally forked from https://gist.github.com/ttrahan/a88febc0538315b05346f4e3b35997f2

*/

function setSyncMyCalendarTags( calEvent, originCalendar ) {
  // set tag on event with value of primary ID calendar
  // this will be used to detect whether the event is already a copy, so that multiple calendars can be cross-synced without dupes
  
  calEvent.setTag( "CreatedBySyncMyCalendars", originCalendar ) 
  Logger.log( "Set tag " + calEvent.getTag("CreatedBySyncMyCalendars") + " on event " + calEvent.getId() + " from calendar " + originCalendar);
  return calEvent;
}


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
          // setSyncMyCalendarTags(destinationEvent, calendarid);
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


    if (stat==0) continue;    
    
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
    else if (n==1 || n==2 || n==3 || n==4 || n==5) // Only include days of the week. Delete this if you want to include weekends
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
      setSyncMyCalendarTags( newEvent, event_i.getOriginalCalendarId );
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
