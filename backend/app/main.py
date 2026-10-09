from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="SURAKSHA Response API",
    description="Demo API for disaster response coordination. In-memory data resets on restart.",
    version="1.1.0",
)

origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    location: str = Field(min_length=2, max_length=200)
    severity: Literal["Critical", "High", "Medium", "Low"] = "High"
    people_affected: int = Field(default=1, ge=0, le=100000)


class IncidentStatus(BaseModel):
    status: Literal["In review", "Dispatched", "Responding", "Resolved"]


class BridgeStatus(BaseModel):
    status: Literal["Inspection pending", "Deployment ready", "In transit"]


class EnergyPlan(BaseModel):
    critical_load_kw: float = Field(gt=0, le=100000)
    autonomy_hours: int = Field(gt=0, le=720)
    available_battery_kwh: float = Field(ge=0, le=10000000)
    reserve_fraction: float = Field(default=0.25, ge=0, le=2)


incidents = [
    {
        "id": "INC-2048",
        "title": "Flash flood — Riverside Sector",
        "location": "Riverside Sector, Zone 04",
        "severity": "Critical",
        "status": "Responding",
        "people_affected": 38,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "INC-2047",
        "title": "Medical evacuation request",
        "location": "North Market, Zone 02",
        "severity": "High",
        "status": "Dispatched",
        "people_affected": 6,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "INC-2046",
        "title": "Power outage — temporary shelter",
        "location": "School Complex, Zone 01",
        "severity": "Medium",
        "status": "In review",
        "people_affected": 52,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

resources = [
    {"id": "RES-01", "name": "Rescue teams", "category": "Personnel", "available": 8, "total": 12, "unit": "teams"},
    {"id": "RES-02", "name": "Medical kits", "category": "Medical", "available": 124, "total": 180, "unit": "kits"},
    {"id": "RES-03", "name": "Portable batteries", "category": "Energy", "available": 17, "total": 24, "unit": "units"},
    {"id": "RES-04", "name": "Rescue vehicles", "category": "Transport", "available": 6, "total": 9, "unit": "vehicles"},
]

bridges = [
    {"id": "BR-01", "name": "Riverside Bailey Bridge", "zone": "Zone 04", "span_m": 45, "load_class_tonnes": 15, "status": "Inspection pending"},
    {"id": "BR-02", "name": "North Access Crossing", "zone": "Zone 02", "span_m": 28, "load_class_tonnes": 10, "status": "Deployment ready"},
    {"id": "BR-03", "name": "East Relief Route", "zone": "Zone 06", "span_m": 36, "load_class_tonnes": 12, "status": "In transit"},
]


@app.get("/")
def root():
    return {
        "service": "SURAKSHA Response API",
        "status": "ok",
        "docs": "/docs",
        "warning": "Demo in-memory storage; not for operational use.",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/incidents")
def list_incidents():
    return {"items": incidents, "count": len(incidents)}


@app.post("/api/incidents", status_code=201)
def create_incident(payload: IncidentCreate):
    item = {
        "id": f"INC-{uuid4().hex[:6].upper()}",
        **payload.model_dump(),
        "status": "In review",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    incidents.insert(0, item)
    return item


@app.patch("/api/incidents/{incident_id}/status")
def update_incident(incident_id: str, payload: IncidentStatus):
    item = next((incident for incident in incidents if incident["id"] == incident_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    item["status"] = payload.status
    return item


@app.get("/api/resources")
def list_resources():
    return {"items": resources}


@app.patch("/api/resources/{resource_id}")
def adjust_resource(resource_id: str, delta: int = 0):
    item = next((resource for resource in resources if resource["id"] == resource_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Resource not found")
    item["available"] = max(0, min(item["total"], item["available"] + delta))
    return item


@app.get("/api/bridges")
def list_bridges():
    return {"items": bridges}


@app.patch("/api/bridges/{bridge_id}/status")
def update_bridge_status(bridge_id: str, payload: BridgeStatus):
    item = next((bridge for bridge in bridges if bridge["id"] == bridge_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Bridge not found")
    item["status"] = payload.status
    return item


@app.post("/api/energy/estimate")
def estimate_energy(payload: EnergyPlan):
    energy = payload.critical_load_kw * payload.autonomy_hours
    target = energy * (1 + payload.reserve_fraction)
    coverage = min(100, round(payload.available_battery_kwh / target * 100)) if target else 100
    return {
        "energy_delivered_kwh": round(energy, 2),
        "planning_target_kwh": round(target, 2),
        "battery_coverage_percent": coverage,
        "meets_planning_target": payload.available_battery_kwh >= target,
        "note": "Preliminary estimate only; engineering review is required.",
    }
