# CrisGo — AI-Powered Crisis Navigation

![CrisGo Banner](https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59d2dceb-cfc5-4828-8f6f-09b0e104c104/generated_images/app-icon-logo-design-for-crisgo-navigati-b2af2c7c-20251005134208.jpg)

**CrisGo** helps you navigate NYC safely by routing around real-time incidents — fires, floods, road closures, earthquakes, and more. It pulls live data from 6 public sources, scores each incident's credibility with an AI pipeline, and calculates the safest route for driving, walking, or cycling.

---

## Features

- **Live incident map** — 400+ real incidents from USGS, NOAA/NWS, NYC 311, GDACS, Reddit, and Google News
- **AI credibility scoring** — multi-prompt pipeline cross-references sources and scores each event
- **Incident clustering** — nearby events grouped into unified alerts
- **Safe routing** — driving/walking/cycling routes that penalise high-credibility incident zones
- **AR navigation** — camera overlay with compass-based 3D arrows on mobile
- **Incident reporting** — text form + browser speech-to-text, no API key needed
- **Filters** — filter map by severity, incident type, and source
- **Delete your own reports** — click a user-reported marker to remove it

---

## Tech Stack

### Frontend
| | |
|---|---|
| Next.js 15 (App Router) | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| React-Leaflet | Interactive map |
| Chart.js | Analytics charts |
| Web Speech API | Browser speech-to-text (no key needed) |
| Web SpeechSynthesis | Turn-by-turn spoken directions |

### Backend
| | |
|---|---|
| Python FastAPI | REST API server |
| SQLAlchemy + SQLite | Incident persistence |
| Google Gemini 1.5 Flash | Credibility scoring LLM |
| Opik | Prompt experiment tracking |

### External APIs (all free, no billing required)
| API | Used For |
|---|---|
| USGS Earthquake API | Live earthquake data worldwide |
| NOAA / NWS Alerts API | US weather emergencies and flood warnings |
| NYC 311 Open Data | NYC-specific infrastructure incidents |
| GDACS (UN) | Global disaster alerts |
| Reddit API | Crowd-sourced incident reports |
| Google News RSS | News-based incident detection |
| Photon (Komoot) | Address geocoding and search autocomplete |
| OSRM | Driving route calculation |
| Valhalla (OSM) | Walking and cycling route calculation |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- A Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone

```bash
git clone https://github.com/VirajMishra1/CrisGo.git
cd CrisGo
git checkout viraj-update
```

### 2. Frontend setup

```bash
npm install
```

Create `.env.local` in the project root:

```env
GEMINI_API_KEY=your_gemini_key_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Opens at `http://localhost:3000`.

### 3. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Start the backend:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000`. On first start it fetches live incidents from all 6 sources (~5-10 seconds).

### 4. AR on mobile (same WiFi)

Camera requires HTTPS on LAN. Run a tunnel in a separate terminal:

```bash
npx localtunnel --port 3000
```

Open the printed `https://` URL on your phone.

---

## Project Structure

```
CrisGo/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main app: state, routing, view switching
│   │   ├── layout.tsx                # Root layout
│   │   └── api/
│   │       ├── incidents/route.ts    # Proxy: Next.js -> FastAPI /incidents/events
│   │       └── route/route.ts        # Proxy: Next.js -> FastAPI /route
│   ├── components/
│   │   ├── MapView.tsx               # Leaflet map, incident markers, route polylines
│   │   ├── TopNav.tsx                # Search bar, mode buttons, location lock
│   │   ├── RouteInfoCard.tsx         # Route summary card (distance, time, steps)
│   │   ├── AROverlay.tsx             # Mobile AR camera + compass navigation
│   │   ├── AROverlayCesium.tsx       # Cesium 3D globe fallback for desktop
│   │   ├── VoiceReportDialog.tsx     # Incident report form + browser speech-to-text
│   │   ├── IncidentFilters.tsx       # Severity / type / source filter panel
│   │   ├── MapLegend.tsx             # Collapsible icon key + severity legend
│   │   ├── CredibilityViewer.tsx     # AI pipeline analytics dashboard
│   │   ├── MapSkeleton.tsx           # Loading skeleton
│   │   └── ErrorBoundary.tsx         # React error boundary
│   ├── lib/
│   │   ├── routing.ts                # Routing logic, Photon geocoding, OSRM/Valhalla
│   │   ├── tts.ts                    # Web SpeechSynthesis wrapper
│   │   └── direct-ingest.ts          # TypeScript fallback ingest (no backend needed)
│   └── types/                        # Shared TypeScript types
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry point
│   │   ├── config.py                 # Settings (reads env vars)
│   │   ├── models.py                 # SQLAlchemy models
│   │   ├── schemas.py                # Pydantic schemas
│   │   ├── api/routes.py             # All API route handlers
│   │   └── services/
│   │       ├── ingest.py             # Fetches from USGS, NWS, NYC 311, GDACS, Reddit, News
│   │       ├── clustering.py         # Groups nearby incidents into events
│   │       ├── credibility_agent.py  # Gemini-based credibility scoring
│   │       ├── routing.py            # Safe route selection logic
│   │       ├── ny_incidents.py       # NYC-specific incident helpers
│   │       └── opik_logging.py       # Opik prompt experiment logger
│   └── requirements.txt
├── .env.example                      # Template for required env vars
├── .gitignore
└── README.md
```

---

## Key API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/incidents/events` | Clustered + credibility-scored events |
| GET | `/incidents/live` | Raw live incidents from all sources |
| POST | `/incidents/refresh` | Force re-fetch from all sources |
| POST | `/route` | Calculate safest route between two points |
| GET | `/health` | Health check |
| POST | `/incidents/score` | Score credibility for a custom source list |

---

## Routing Algorithm

Routes are fetched from OSRM (driving) or Valhalla (walking/cycling), then a safety penalty is applied based on proximity to incidents:

| Credibility | Penalty Radius | Effect |
|---|---|---|
| High | 600m | Route effectively avoided |
| Medium | 200m | Detour preferred |
| Low | 100m | Minor nudge |

The route with the lowest combined distance + penalty score is selected.

---

## Transport Mode Colors

| Mode | Color |
|---|---|
| Driving | Blue `#2563eb` |
| Walking | Orange `#ea580c` |
| Cycling | Green `#16a34a` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini for credibility scoring |
| `NEXT_PUBLIC_BACKEND_URL` | No | Backend URL (default: `http://localhost:8000`) |

---

## License

MIT — see [LICENSE](LICENSE).
