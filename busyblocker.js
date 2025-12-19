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

  // AdminControls: tier- or deployment-controlled defaults
  var AdminControls = {
    WINDOW_DAYS: 7, // how many days in advance to monitor and block off time
    ENFORCE_WRITE_LIMIT: false, // prioritize correctness; set true to enforce the cap
    WRITE_LIMIT: 60, // cap writes if ENFORCE_WRITE_LIMIT is true
    WRITE_PAUSE_MS: 150, // base pause per write
    BURST_WRITE_PAUSE_MS: 1000, // elevated pause when many writes are needed
    BURST_CREATE_THRESHOLD: 5, // if more than this many creates are needed, treat as burst
    SOURCE_TAG: 'SyncSourceId',
    ORIGIN_TAG: 'CreatedBySyncMyCalendars'
  };

  // UserSettings: knobs end users can control (respecting AdminControls when enforced)
  var UserSettings = {
    windowDays: AdminControls.WINDOW_DAYS,
    includeDays: [0,1,2,3,4,5,6], // all days; user-filterable in future
    destinationEventTitle: eventTitle,
    color: "8", // gray
    clearDescription: true,
    removeReminders: true,
    visibility: CalendarApp.Visibility.DEFAULT
  };
  // Local aliases for readability
  var WRITE_LIMIT = AdminControls.WRITE_LIMIT;
  var ENFORCE_WRITE_LIMIT = AdminControls.ENFORCE_WRITE_LIMIT;
  var WRITE_PAUSE_MS = AdminControls.WRITE_PAUSE_MS;
  var BURST_WRITE_PAUSE_MS = AdminControls.BURST_WRITE_PAUSE_MS;
  var BURST_CREATE_THRESHOLD = AdminControls.BURST_CREATE_THRESHOLD;
  var SOURCE_TAG = AdminControls.SOURCE_TAG;
  var ORIGIN_TAG = AdminControls.ORIGIN_TAG;
  var writes = 0;
  var stopEarly = false;
  var sourceKey = function(evt) {
    var original = evt.getOriginalStartTime ? evt.getOriginalStartTime() : null;
    var anchor = original ? original.getTime() : evt.getStartTime().getTime();
    return evt.getId() + '|' + anchor;
  };

  var today=new Date();
  var enddate=new Date();
  enddate.setDate(today.getDate()+UserSettings.windowDays);
  
  var secondaryCal=CalendarApp.getCalendarById(id);
  if (!secondaryCal) {
    Logger.log('Secondary calendar not found or inaccessible: ' + id);
    return;
  }
  var secondaryEvents=secondaryCal.getEvents(today,enddate);
  
  var destinationCalendar=CalendarApp.getDefaultCalendar();
  var destinationEvents=destinationCalendar.getEvents(today,enddate); // all primary calendar events
  
  var destinationEventTitle=UserSettings.destinationEventTitle; // update this to the text you'd like to appear in the new events created in primary calendar
  
  var stat=1;
  var event_i, existingEvent; 
  var destinationEventsFiltered = []; // to contain primary calendar events that were previously created from secondary calendar
  var destinationEventsByTime = {}; // quick lookup by start/end to avoid unnecessary writes
  var destinationEventsBySource = {}; // lookup by source event id tag to allow start/end changes without delete+create
  var destinationEventsUpdated = []; // to contain primary calendar events that were updated from secondary calendar
  var destinationEventsCreated = []; // to contain primary calendar events that were created from secondary calendar
  var destinationEventsDeleted = []; // to contain primary calendar events previously created that have been deleted from secondary calendar
  var seenSourceIds = {}; // track which source events were processed to avoid deleting moved events
  var countWrite = function() {
    writes++;
    var pause = WRITE_PAUSE_MS;
    if (destinationEventsCreated.length > BURST_CREATE_THRESHOLD) {
      pause = BURST_WRITE_PAUSE_MS;
    }
    if (pause > 0) {
      Utilities.sleep(pause);
    }
  };
  var shouldStop = function() {
    return ENFORCE_WRITE_LIMIT && WRITE_LIMIT > 0 && writes >= WRITE_LIMIT;
  };

  Logger.log( id + ' - number of primaryEvents: ' + destinationEvents.length);  
  Logger.log( id + ' - number of secondaryEvents: ' + secondaryEvents.length);
  
  // create filtered list of existing primary calendar events that were previously created from the secondary calendar
  for (destev in destinationEvents)
  {
    var destinationEvent = destinationEvents[destev];
    var destOriginTag = destinationEvent.getTag(ORIGIN_TAG);
    var destSourceTag = destinationEvent.getTag(SOURCE_TAG);
    if (destOriginTag === calendarid || destinationEvent.getTitle() == destinationEventTitle)
    { 
      destinationEventsFiltered.push(destinationEvent); 
      destinationEventsByTime[destinationEvent.getStartTime().getTime() + '|' + destinationEvent.getEndTime().getTime()] = destinationEvent;
      if (destSourceTag) {
        destinationEventsBySource[destSourceTag] = destinationEvent;
      }
    }
  }
  
  // process all events in secondary calendar; either update, create, or delete
  for (secev in secondaryEvents)
  {
    stat=1;
    event_i=secondaryEvents[secev];
    var sourceId = sourceKey(event_i);
    var existingFromSource = destinationEventsBySource[sourceId];

    // Prefer matching by source tag to survive start/end changes, else fall back to time match
    if (existingFromSource)
    {
      existingEvent = existingFromSource;
    } else {
      var existingKey = event_i.getStartTime().getTime() + '|' + event_i.getEndTime().getTime();
      existingEvent = destinationEventsByTime[existingKey];
    }

    // if the secondary event has already been blocked in the primary calendar, update it
    if (existingEvent)
    {
      stat=0;
      var changed = false;
      // Only write if something actually needs to change to avoid quota issues
      if (existingEvent.getTitle() !== destinationEventTitle)
      {
        existingEvent.setTitle(destinationEventTitle);
        changed = true;
        countWrite();
        if (shouldStop()) break;
      }
      if (existingEvent.getVisibility() !== CalendarApp.Visibility.DEFAULT)
      {
        existingEvent.setVisibility(UserSettings.visibility);
        changed = true;
        countWrite();
        if (shouldStop()) break;
      }
      if (existingEvent.getColor() !== "8")
      {
        existingEvent.setColor(UserSettings.color);
        changed = true;
        countWrite();
        if (shouldStop()) break;
      }
      if (existingEvent.getTag(ORIGIN_TAG) !== calendarid)
      {
        existingEvent.setTag(ORIGIN_TAG, calendarid);
        changed = true;
        countWrite();
        if (shouldStop()) break;
      }
      var existingSourceTag = existingEvent.getTag(SOURCE_TAG);
      if (existingSourceTag !== sourceId)
      {
        existingEvent.setTag(SOURCE_TAG, sourceId);
        changed = true;
        countWrite();
        if (shouldStop()) break;
      }
      if (existingEvent.getDescription())
      {
        if (UserSettings.clearDescription) { existingEvent.setDescription(""); }
        changed = true;
        countWrite();
        if (shouldStop()) break;
      }
      // If the time changed (e.g., edited recurring event), update instead of delete+create
      var startChanged = existingEvent.getStartTime().getTime() !== event_i.getStartTime().getTime();
      var endChanged = existingEvent.getEndTime().getTime() !== event_i.getEndTime().getTime();
      if (startChanged || endChanged)
      {
        existingEvent.setTime(event_i.getStartTime(), event_i.getEndTime());
        changed = true;
        countWrite();
        if (shouldStop()) break;
      }
      destinationEventsUpdated.push(existingEvent.getId());
      seenSourceIds[sourceId] = true;
      if (shouldStop()) {
        Logger.log('Write limit reached during updates; stopping early');
        stopEarly = true;
        break;
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
    else if (UserSettings.includeDays.indexOf(n) !== -1) // Only include configured days
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
      newEvent.setTag(ORIGIN_TAG, calendarid);
      newEvent.setTag(SOURCE_TAG, sourceId);
      newEvent.setVisibility(UserSettings.visibility); // set blocked time as default appointments in destination calendar
      newEvent.setColor(UserSettings.color); // set the copied event's color

      // so you don't get double notifications. 
      // Delete this if you want to keep the default reminders for your newly created primary calendar events
      newEvent.removeAllReminders();

      destinationEventsCreated.push(newEvent.getId());
      destinationEventsByTime[newEvent.getStartTime().getTime() + '|' + newEvent.getEndTime().getTime()] = newEvent;
      destinationEventsBySource[sourceId] = newEvent;
      seenSourceIds[sourceId] = true;
      // Each setter above is a write; throttle after the block
      countWrite();
      if (shouldStop()) {
        Logger.log('Write limit reached during creation; stopping early');
        stopEarly = true;
        break;
      }
      Logger.log('CREATED DESTINATION EVENT'
                 + '\nprimaryId: ' + newEvent.getId() 
                 + '\nprimaryTitle: ' + newEvent.getTitle() 
                 + '\nprimaryDesc: ' + newEvent.getDescription() 
                 + '\ntag CreatedBySyncMyCalendars set to: ' + newEvent.getTag("CreatedBySyncMyCalendars")
                 );
    }
  }

  // if a primary event previously created no longer exists in the secondary calendar, delete it
  if (!stopEarly)
  {
    for (pev in destinationEventsFiltered)
    {
      var pevIsUpdatedIndex = destinationEventsUpdated.indexOf(destinationEventsFiltered[pev].getId());
      var pevSource = destinationEventsFiltered[pev].getTag(SOURCE_TAG);
      var skipDelete = pevSource && seenSourceIds[pevSource];
      if (pevIsUpdatedIndex == -1 && !skipDelete)
      { 
        var pevIdToDelete = destinationEventsFiltered[pev].getId();
        Logger.log(pevIdToDelete + ' deleted');
        destinationEventsDeleted.push(pevIdToDelete);
        destinationEventsFiltered[pev].deleteEvent();
        countWrite();
        if (shouldStop()) {
          Logger.log('Write limit reached during cleanup; stopping early');
          stopEarly = true;
          break;
        }
      }
    }  
  }

  Logger.log('Primary events previously created: ' + destinationEventsFiltered.length);
  Logger.log('Primary events updated: ' + destinationEventsUpdated.length);
  Logger.log('Primary events deleted: ' + destinationEventsDeleted.length);
  Logger.log('Primary events created: ' + destinationEventsCreated.length);
  Logger.log('Write operations this run: ' + writes);

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
