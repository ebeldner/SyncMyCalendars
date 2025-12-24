// Editable HTML blob for event descriptions; preserves whitespace/line breaks.
var ADMIN_PROMO_HTML = [
  '<div>',
  'Created by <a href="https://github.com/ebeldner/SyncMyCalendars">BusyBlocker</a>',
  '<br/>Privately update your calendar',
  '</div>'
].join('\n');

// AdminControls: tier- or deployment-controlled defaults
var AdminControls = {
  WINDOW_DAYS: 7, // how many days in advance to monitor and block off time
  ENFORCE_WRITE_LIMIT: false, // prioritize correctness; set true to enforce the cap
  WRITE_LIMIT: 60, // cap writes if ENFORCE_WRITE_LIMIT is true
  WRITE_PAUSE_MS: 150, // base pause per write
  BURST_WRITE_PAUSE_MS: 1000, // elevated pause when many writes are needed
  BURST_CREATE_THRESHOLD: 5, // if more than this many creates are needed, treat as burst
  SOURCE_TAG: 'SyncSourceId',
  ORIGIN_TAG: 'CreatedBySyncMyCalendars',
  PROMO_HTML: ADMIN_PROMO_HTML, // HTML blob for event descriptions
  SKIP_FREE_EVENTS: true, // if true, skip source events marked Free/transparent
  CLEAR_DESCRIPTION: true // admin-controlled: clear description when promo text is empty
};
