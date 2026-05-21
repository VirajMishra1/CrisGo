import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.db import engine, Base, SessionLocal
from app.api.routes import router
from app.events import manager
from app.config import settings
from app.services.ny_incidents import init_ny_incidents


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed with real live data
    Base.metadata.create_all(bind=engine)
    try:
        db = SessionLocal()
        result = init_ny_incidents(db)
        print(f"[startup] Seeded DB: {result}")
        db.close()
    except Exception as e:
        print(f"[startup] Seed failed (non-fatal): {e}")
    yield
    # Shutdown: nothing to clean up


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws/incidents")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"event": "ack", "data": data}))
    except Exception:
        manager.disconnect(websocket)
