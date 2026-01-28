// KubeCon and CloudNativeCon Event Configuration
// Based on CNCF landscape event configuration pattern
// 
// How automatic rotation works:
// 1. Add all known upcoming events to the 'events' array
// 2. System automatically filters out past events (end date < today)
// 3. System sorts remaining events by start date (earliest first)
// 4. System displays the next upcoming event
// 5. When an event ends, it's automatically hidden and next event shows
//
// To add new events:
// 1. Add event to the 'events' array below
// 2. Ensure banner image is publicly accessible
// 3. Banner should be 2400x300px for best quality
// 4. No need to remove old events - they auto-hide

export interface UpcomingEvent {
  name: string;
  start: string;         // YYYY-MM-DD format
  end: string;           // YYYY-MM-DD format
  bannerUrl: string;
  detailsUrl: string;
  registrationUrl: string; // Direct link to registration page
}

// All upcoming KubeCon events
// Add new events here - the system will automatically show the next one
export const events: UpcomingEvent[] = [
  {
    name: "KubeCon + CloudNativeCon Europe 2026",
    start: "2026-03-23",
    end: "2026-03-27",
    bannerUrl: "https://cncf.github.io/banners/events/Kubecon-EU-2026-2400x300.png",
    detailsUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/?utm_source=firehose&utm_campaign=KubeCon-EU-2026",
    registrationUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/register/?utm_source=firehose&utm_campaign=KubeCon-EU-2026"
  },
  {
    name: "KubeCon + CloudNativeCon North America 2026",
    start: "2026-11-09",
    end: "2026-11-13",
    bannerUrl: "https://cncf.github.io/banners/events/Kubecon-NA-2026-2400x300.png",
    detailsUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/?utm_source=firehose&utm_campaign=KubeCon-NA-2026",
    registrationUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/register/?utm_source=firehose&utm_campaign=KubeCon-NA-2026"
  },
  // Add future events here as they are announced
  // China, India, Japan events can be added when available
];

/**
 * Get the next upcoming KubeCon event
 * 
 * Algorithm:
 * 1. Filter: Remove events where end date has passed
 * 2. Sort: Order by start date (earliest first)
 * 3. Select: Return the first event (next upcoming)
 * 
 * Returns null if no upcoming events
 */
export function getNextEvent(): UpcomingEvent | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
  
  // Filter out past events (end date has passed)
  const activeEvents = events.filter(event => {
    const endDate = new Date(event.end);
    endDate.setHours(23, 59, 59, 999); // Set to end of day
    return endDate >= now;
  });
  
  // If no active events, return null
  if (activeEvents.length === 0) {
    return null;
  }
  
  // Sort by start date (earliest first)
  const sortedEvents = activeEvents.sort((a, b) => {
    const dateA = new Date(a.start);
    const dateB = new Date(b.start);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Return the next upcoming event
  return sortedEvents[0];
}

// Backward compatibility: export as upcomingEvent
export const upcomingEvent = getNextEvent();

