// KubeCon and CloudNativeCon Event Configuration
// Based on CNCF landscape event configuration pattern
// 
// To update for new events:
// 1. Update the event details below
// 2. Ensure banner image is publicly accessible
// 3. Banner should be 2400x300px for best quality
// 4. Event will auto-hide after end date passes

export interface UpcomingEvent {
  name: string;
  start: string;      // YYYY-MM-DD format
  end: string;        // YYYY-MM-DD format
  bannerUrl: string;
  detailsUrl: string;
}

// Current upcoming event (null to disable)
// Event will automatically hide after end date
export const upcomingEvent: UpcomingEvent | null = {
  name: "KubeCon + CloudNativeCon Europe 2026",
  start: "2026-03-23",
  end: "2026-03-27",
  bannerUrl: "https://cncf.github.io/banners/events/Kubecon-EU-2026-2400x300.png",
  detailsUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/?utm_source=firehose&utm_campaign=KubeCon-EU-2026"
};

// Future events (for reference/planning)
// Uncomment and update when new events are announced
/*
export const futureEvents: UpcomingEvent[] = [
  {
    name: "KubeCon + CloudNativeCon North America 2026",
    start: "2026-11-09",
    end: "2026-11-13",
    bannerUrl: "https://cncf.github.io/banners/events/Kubecon-NA-2026-2400x300.png",
    detailsUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/"
  }
];
*/
