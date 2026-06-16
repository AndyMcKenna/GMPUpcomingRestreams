# GMPUpcomingRestreams

Displays the upcoming restreamed races from the Go Mode Podcast Mentor Tournament 2026 schedule. It pulls live data from the published Google Sheet, filters to only races that have a Restreamer assigned, and shows up to 5 entries in the format:

```
M/D  H:MM PM EDT  Racer1 vs Racer2
```

If no restreamed races are scheduled, it displays a fallback message directing viewers to Discord.

## How often it updates

The page rebuilds automatically every 30 minutes via GitHub Actions and on every push to `main`. It can also be triggered manually from the Actions tab.

## OBS Browser Source Setup

1. Add a **Browser Source** in OBS
2. Set the URL to: `https://andymckenna.github.io/GMPUpcomingRestreams/`
3. Set **Width** to `2000` and **Height** to `300`
4. Check **"Refresh browser when scene becomes active"** so it always shows the latest data when you switch to the scene
