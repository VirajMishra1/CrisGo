# 🚨 CrisGo  

**Navigate Safely. Every Time.**  

CrisGo is an AI-driven crisis navigation platform designed to guide you through emergencies with confidence. By combining real-time hazard mapping, community-powered incident reporting, and AR-enhanced navigation, CrisGo empowers you to make safe, life-saving decisions when every second counts.  

[![Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://crisgo.vercel.app/)  
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)  

---

## 🎯 The Problem  

In moments of crisis—natural disasters, civil unrest, or mass evacuations—traditional navigation apps fall short. They don’t show active hazards. Social media often spreads unverified rumors. What people truly need is **reliable, real-time intelligence** to navigate safely. Right now, that’s missing.  

---

## 💡 Our Solution  

CrisGo bridges that gap with AI-powered verification, seamless voice reporting, and AR-guided navigation. With CrisGo, you can:  

- ✅ **View verified hazards** in real time on a credibility-based map  
- ✅ **Report incidents hands-free** through natural voice commands  
- ✅ **Find safe routes** that adapt to evolving danger zones  
- ✅ **Navigate with AR** for clear, on-camera, turn-by-turn guidance  

---

## ✨ Key Features  

### 🗺️ Real-Time Hazard Mapping  
- Color-coded incident markers (🔴 High, 🟡 Medium, 🟢 Low credibility)  
- Live updates from community reports and verified sources  
- Interactive map with in-depth incident details  

### 🎤 Voice-Powered Reporting  
- Hands-free reporting during high-stress situations  
- AI extracts **location, severity, and type** from natural speech  
- Supports multiple languages for inclusivity  

### 🤖 AI Credibility Scoring  
- Cross-verifies reports against live news (via Tavily API)  
- Multi-layer validation powered by Gemini AI  
- Source reliability weighting for official alerts  

### 📱 AR Navigation Mode  
- Camera-overlay navigation with hazard warnings  
- Distance indicators for nearby dangers  
- Voice-guided directions for safer, eyes-free travel  

### 🛣️ Intelligent Routing  
- Auto-avoidance of high-credibility hazards  
- Real-time rerouting as new incidents are reported  
- Multi-modal support: walking, cycling, and driving  

---

## 🛠️ Tech Stack  

### Frontend  
- **Next.js 15** (React 19, TypeScript)  
- **Tailwind CSS**  
- **Leaflet** maps  
- **Web Speech API**  

### AI & ML  
- **Gemini 1.5 Flash** – extraction & categorization  
- **ElevenLabs** – speech-to-text & text-to-speech  
- **LangGraph** – multi-agent orchestration  
- **Tavily** – real-time verification  
- **Opik** – AI performance monitoring  

### Backend  
- **Python FastAPI** – AI agent services  
- **Node.js** API routes  
- **OpenStreetMap Nominatim** – geocoding  

---

## 🚀 Quick Start  

### Prerequisites  
- Node.js 18+  
- Python 3.9+  
- API keys (Gemini, optional: ElevenLabs, Tavily, Opik)  

### Installation  

# Clone repository
git clone https://github.com/yourusername/crisgo.git
cd crisgo

# Install frontend
npm install

# Install backend
cd backend
pip install -r requirements.txt
cd ..

# Configure environment
cp .env.example .env
# Add API keys inside .env
Run servers:

Frontend: npm run dev

Backend: cd backend && python -m uvicorn app.main:app --reload --port 8000

Open app: http://localhost:3000

📖 How It Works
Voice Reports
Speak → ElevenLabs STT → Gemini extracts data → Tavily verifies → Map marker created

Safe Routing
Input destination → Fetch hazards → AI routing agent → Generate safest path

AR Navigation
GPS tracking → Route overlay → Voice + camera guidance → Hazard alerts

🎮 Usage Guide
Report an Incident
Tap Report Incident → Speak naturally:
“Flooding on Main Street near the bridge, about 3 feet high.”
→ AI extracts details → Marker added.

Plan a Safe Route
Enter origin + destination → Select mode → View safe path → Start AR mode.

Use AR Navigation
Allow camera + location access → Follow on-screen arrows → Hear voice prompts → Stay updated on hazards nearby.

🏗️ Project Structure
csharp
Copy code
crisgo/
├── src/
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   ├── lib/               # Utilities (routing, TTS, etc.)
│   └── data/              # Incident data
├── backend/
│   ├── app/               # FastAPI + AI agents/services
└── public/                # Static assets
🧪 Testing
bash
Copy code
# Frontend tests
npm test

# Backend tests
cd backend && pytest

# End-to-end tests
npm run test:e2e
🤝 Contributing
We welcome contributions!

Fork repo

Create branch: git checkout -b feature/amazing-feature

Commit: git commit -m "Add amazing feature"

Push: git push origin feature/amazing-feature

Open a PR

🎯 Roadmap
✅ Real-time hazard mapping

✅ Voice-powered reporting

✅ AI credibility scoring

✅ AR navigation

🔜 Offline mode

🔜 Multi-language expansion

🔜 Integration with FEMA & local authorities

🔜 Community verification system

🔜 Historical hazard heatmaps

🔜 Native iOS & Android apps

📄 License
Licensed under the MIT License. See LICENSE for details.

🙏 Acknowledgments
Google Gemini AI – incident intelligence

ElevenLabs – natural voice processing

LangGraph – agent orchestration

Tavily – real-time verification

OpenStreetMap – mapping data
