# CrisGo - AI-Powered Crisis Navigation System

![CrisGo Banner](https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59d2dceb-cfc5-4828-8f6f-09b0e104c104/generated_images/app-icon-logo-design-for-crisgo-navigati-b2af2c7c-20251005134208.jpg)

**CrisGo** is an intelligent navigation application that helps users safely navigate through urban environments by avoiding real-time crisis incidents. The system combines multi-agent AI credibility scoring, augmented reality navigation, and voice-based incident reporting to provide the safest possible routes.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Core Components](#core-components)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Integrations](#api-integrations)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Urban environments face constant challenges from emergencies, hazards, and incidents that can affect pedestrian and vehicle safety. CrisGo addresses this by:

1. **Aggregating real-time incident data** from multiple sources (official agencies, news outlets, social media)
2. **Scoring incident credibility** using a multi-agent LLM pipeline with 5 specialized LangChain agents
3. **Calculating safe routes** that intelligently avoid high-credibility crisis zones
4. **Providing AR navigation** with 3D directional arrows and compass-based guidance
5. **Enabling voice-based reporting** through conversational AI agents

---

## Key Features

### Real-Time Incident Map
- Interactive Leaflet-based map centered on NYC
- Color-coded incident markers based on credibility:
  - **Red (High Credibility)**: Verified incidents from official sources
  - **Yellow (Medium Credibility)**: Corroborated reports from multiple sources
  - **Green (Low Credibility)**: Unverified single-source reports
- Click-to-view incident details including source, description, and credibility scores

### Multi-Agent Credibility Scoring
Five specialized LangChain agents evaluate each incident:

| Agent | Role | Description |
|-------|------|-------------|
| **Credibility Auditor** | Foundation Scorer | Basic credibility scoring (1-5 scale) based on source authority |
| **Media Reliability Analyst** | Trust Calibrator | Hierarchical source weighting and corroboration analysis |
| **Authenticity Verifier** | Authenticity Guard | Multi-source validation and low-credibility detection |
| **Evidence Weighing Specialist** | Evidence Processor | Sophisticated evidence weighting with penalty systems |
| **Rubric-Based Scorer** | Mathematical Precision | Precise mathematical rubric for maximum consistency |

### Intelligent Safe Routing
- **Dijkstra-based weighted pathfinding** that penalizes routes near incidents
- **Incident avoidance zones**: High-credibility incidents create 600m penalty zones
- **Multiple transport modes**: Driving (OSRM), Walking (Valhalla), Cycling (Valhalla)
- **Real-time route recalculation** when transport mode changes
- **Turn-by-turn navigation** with spoken directions

### Augmented Reality Navigation
- **Camera-based AR overlay** with real-time video feed
- **3D chevron arrows** (>>>) indicating navigation direction
- **Compass-based orientation** that rotates arrows based on device heading
- **Proximity alerts** when approaching incidents (color-coded screen overlay)
- **GPS tracking** with continuous location updates

### Voice-Based Incident Reporting
- **Conversational AI** powered by ElevenLabs voice agents
- **Natural language processing** to extract incident details
- **Automatic geocoding** of reported locations
- **Real-time map updates** when new incidents are reported

### Analytics Dashboard
- **Multi-agent performance visualization** with radar charts
- **Agent comparison metrics** with line and bar charts
- **Opik experiment tracking** integration
- **Routing algorithm performance** metrics

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Animations and transitions |
| **React Three Fiber** | 3D graphics for AR arrows |
| **Leaflet + React-Leaflet** | Interactive mapping |
| **Chart.js + react-chartjs-2** | Data visualization |
| **Shadcn/UI + Radix** | UI component library |

### Backend & APIs
| Technology | Purpose |
|------------|---------|
| **Valhalla** | Pedestrian/cycling route optimization |
| **OSRM** | Vehicle routing with traffic awareness |
| **Nominatim** | Address geocoding |
| **ElevenLabs** | Voice AI for TTS and conversational agents |
| **Tavily** | Real-time web search for incident data |

### AI/ML Pipeline
| Technology | Purpose |
|------------|---------|
| **LangChain** | Multi-agent orchestration |
| **LangGraph** | Agent workflow management |
| **Opik** | Experiment tracking and A/B testing |
| **Google Generative AI** | LLM inference |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CrisGo Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Tavily     │    │   Reddit     │    │   Official   │       │
│  │   Search     │    │   APIs       │    │   Feeds      │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 MULTI-AGENT CREDIBILITY PIPELINE            ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐││
│  │  │Agent V1 │ │Agent V2 │ │Agent V3 │ │Agent V4 │ │Agent V5│││
│  │  │Auditor  │ │Analyst  │ │Verifier │ │Evidence │ │Rubric  │││
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘││
│  │       └───────────┴───────────┼───────────┴──────────┘     ││
│  │                               ▼                             ││
│  │              ┌────────────────────────────┐                 ││
│  │              │   Ensemble Score Fusion    │                 ││
│  │              │   (Weighted Averaging)     │                 ││
│  │              └────────────┬───────────────┘                 ││
│  └───────────────────────────┼─────────────────────────────────┘│
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    ROUTING ENGINE                           ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ ││
│  │  │  Dijkstra   │  │   OSRM      │  │     Valhalla        │ ││
│  │  │  Weighted   │──│  (Driving)  │──│ (Walking/Cycling)   │ ││
│  │  │  Pathfind   │  └─────────────┘  └─────────────────────┘ ││
│  │  └─────────────┘                                            ││
│  │        │                                                     ││
│  │        ▼                                                     ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ Incident Penalty Zones (High=500km, Med=7km, Low=3km)  │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    USER INTERFACE                           ││
│  │                                                              ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ ││
│  │  │   Map View    │  │   AR Mode     │  │  Voice Report   │ ││
│  │  │   (Leaflet)   │  │ (Three.js+AR) │  │  (ElevenLabs)   │ ││
│  │  └───────────────┘  └───────────────┘  └─────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### `/src/app/page.tsx`
Main application entry point handling:
- View switching between Map and AR modes
- Incident data loading and filtering
- Route calculation orchestration
- Navigation state management

### `/src/components/MapView.tsx`
Interactive map component featuring:
- OpenStreetMap tile layer
- Custom incident markers with credibility-based styling
- Route polylines with transport mode colors
- Current location tracking marker

### `/src/components/AROverlay.tsx`
Augmented reality navigation interface:
- Camera feed integration with `getUserMedia`
- Three.js-based 3D navigation arrows
- Device orientation tracking for compass heading
- Proximity-based incident alerts

### `/src/components/VoiceReportDialog.tsx`
Conversational incident reporting:
- ElevenLabs voice agent integration
- Real-time transcript display
- Automatic incident extraction and geocoding

### `/src/lib/routing.ts`
Intelligent routing engine:
- Dijkstra-inspired weighted pathfinding
- Incident avoidance zone calculations
- Multi-provider routing (Valhalla + OSRM)
- Turn-by-turn instruction generation

### `/src/components/CredibilityViewer.tsx`
Analytics dashboard showing:
- Multi-agent radar chart
- Individual agent performance metrics
- Opik experiment tracking visualization
- Routing algorithm benchmarks

---

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Modern browser with WebGL and camera support
- HTTPS connection (required for camera/GPS access)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/crisgo.git
cd crisgo

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env

# Start development server
npm run dev
# or
bun dev
```

### Environment Variables

```env
# ElevenLabs (for voice features)
ELEVENLABS_API_KEY=your_key_here

# Optional: Google Maps Routes API (for enhanced transit routing)
GOOGLE_MAPS_API_KEY=your_key_here
```

---

## Usage

### Map Navigation
1. Enter starting location and destination in the search bar
2. Select transport mode (driving, walking, cycling)
3. Click "Search" to calculate a safe route
4. View route on map with distance and duration info
5. Click "Start Navigation" to begin GPS tracking

### AR Navigation
1. Switch to "AR Mode" using the view toggle
2. Allow camera and orientation permissions when prompted
3. Point your device in the direction you want to travel
4. Follow the 3D chevron arrows (>>>) to your destination
5. Screen will flash colored warnings when near incidents

### Report an Incident
1. Click the "Report" button in the navigation bar
2. Allow microphone access when prompted
3. Speak naturally to describe the incident and location
4. The AI agent will ask clarifying questions
5. Click "End Call & Submit Report" when finished
6. Incident will appear on the map automatically

### View Analytics
1. Click the info button (ℹ️) in the bottom-right corner
2. View multi-agent credibility assessment radar
3. Expand sections to see detailed metrics:
   - Real-Time Search (Tavily integration)
   - Multi-Agent Pipeline (5 LangChain agents)
   - Experiment Tracking (Opik metrics)
   - Intelligent Routing (algorithm performance)

---

## API Integrations

### Routing APIs
| API | Endpoint | Purpose |
|-----|----------|---------|
| **Valhalla** | `valhalla1.openstreetmap.de/route` | Walking/cycling routes |
| **OSRM** | `router.project-osrm.org/route/v1` | Driving routes |
| **Nominatim** | `nominatim.openstreetmap.org/search` | Address geocoding |

### Voice & AI APIs
| API | Endpoint | Purpose |
|-----|----------|---------|
| **ElevenLabs TTS** | `api.elevenlabs.io/v1/text-to-speech` | Spoken navigation instructions |
| **ElevenLabs Agents** | `api.elevenlabs.io/v1/convai` | Voice-based incident reporting |

---

## Project Structure

```
crisgo/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main application
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   └── api/
│   │       ├── route/            # Routing API endpoints
│   │       └── report-incident/  # Voice report processing
│   ├── components/
│   │   ├── AROverlay.tsx         # AR navigation view
│   │   ├── MapView.tsx           # Interactive map
│   │   ├── MapLegend.tsx         # Map legend overlay
│   │   ├── TopNav.tsx            # Navigation bar
│   │   ├── RouteInfoCard.tsx     # Route details card
│   │   ├── VoiceReportDialog.tsx # Voice reporting modal
│   │   ├── CredibilityViewer.tsx # Analytics dashboard
│   │   └── ui/                   # Shadcn/UI components
│   ├── data/
│   │   └── generate-incidents-data.ts # Incident data generator
│   ├── lib/
│   │   ├── routing.ts            # Routing algorithms
│   │   ├── tts.ts                # Text-to-speech utility
│   │   └── utils.ts              # Helper functions
│   └── hooks/                    # Custom React hooks
├── backend/                      # Python backend services
│   └── app/
│       ├── agents/               # LangChain agents
│       ├── api/                  # FastAPI endpoints
│       └── services/             # Business logic
├── public/                       # Static assets
├── package.json
└── README.md
```

---

## Transport Mode Colors

| Mode | Primary Color | Use Case |
|------|---------------|----------|
| **Driving** | #4285F4 (Blue) | Vehicle navigation on roads |
| **Walking** | #FBBC04 (Yellow) | Pedestrian routes with sidewalks |
| **Cycling** | #9334E9 (Purple) | Bike lanes and cycling paths |
| **Transit** | #34A853 (Green) | Public transportation |

---

## Incident Penalty Weights

The routing algorithm applies the following distance penalties to avoid incidents:

| Credibility | Penalty | Effect |
|-------------|---------|--------|
| **High** | 500,000m | Makes route virtually impossible |
| **Medium** | 7,000m | Significant detour preferred |
| **Low** | 3,000m | Minor detour if convenient |

High-credibility incidents also use distance-based gradient penalties:
- **0-200m**: Maximum penalty (route impossible)
- **200-400m**: 50% penalty (very expensive)
- **400-600m**: 20% penalty (expensive but possible)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **OpenStreetMap** for map data and routing APIs
- **ElevenLabs** for voice AI capabilities
- **Valhalla & OSRM** for routing engines
- **LangChain** for multi-agent orchestration
- **Shadcn/UI** for beautiful UI components

---

**Built with care for safer urban navigation.**
