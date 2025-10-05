import json
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db import engine, Base, SessionLocal
from app.api.routes import router
from app.events import manager
from app.config import settings
from app.services.ny_incidents import init_ny_incidents


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Seed NY-only incidents and clear prior scraped data
    try:
        db = SessionLocal()
        init_ny_incidents(db)
        db.close()
    except Exception:
        # Non-fatal if seeding fails
        pass


app.include_router(router)


@app.websocket("/ws/incidents")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Echo ping/pong or simple subscription messages
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"event": "ack", "data": data}))
    except Exception:
        manager.disconnect(websocket)