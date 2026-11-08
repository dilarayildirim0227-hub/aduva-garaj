"""
Araç Seçim Sihirbazı API Router.
Marka → Model → Yıl → Motor/Yakıt hiyerarşik veri.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from backend.database import get_db
from backend.models import Vehicle
from backend.schemas import VehicleMake, VehicleModel, VehicleYear, VehicleEngine

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("/makes", response_model=list[VehicleMake])
def get_makes(db: Session = Depends(get_db)):
    """Tüm markaları getir (model sayısı ile)."""
    makes = db.query(
        Vehicle.make,
        func.count(distinct(Vehicle.model)).label("model_count")
    ).group_by(Vehicle.make).order_by(Vehicle.make).all()

    return [
        VehicleMake(make=row.make, model_count=row.model_count)
        for row in makes
    ]


@router.get("/models", response_model=list[VehicleModel])
def get_models(
    make: str = Query(..., description="Marka adı"),
    db: Session = Depends(get_db)
):
    """Seçili markaya ait modelleri getir (yıl sayısı ile)."""
    models = db.query(
        Vehicle.model,
        func.count(distinct(Vehicle.year_start)).label("year_count")
    ).filter(Vehicle.make == make).group_by(Vehicle.model).order_by(Vehicle.model).all()

    return [
        VehicleModel(model=row.model, year_count=row.year_count)
        for row in models
    ]


@router.get("/years", response_model=list[VehicleYear])
def get_years(
    make: str = Query(..., description="Marka adı"),
    model: str = Query(..., description="Model adı"),
    db: Session = Depends(get_db)
):
    """Seçili marka+modele ait yılları getir (motor sayısı ile)."""
    years = db.query(
        Vehicle.year_start,
        Vehicle.year_end,
        func.count(distinct(Vehicle.engine)).label("engine_count")
    ).filter(
        Vehicle.make == make,
        Vehicle.model == model
    ).group_by(Vehicle.year_start, Vehicle.year_end).order_by(Vehicle.year_start.desc()).all()

    return [
        VehicleYear(
            year=f"{row.year_start}-{row.year_end}" if row.year_start != row.year_end else str(row.year_start),
            engine_count=row.engine_count
        )
        for row in years
    ]


@router.get("/engines", response_model=list[VehicleEngine])
def get_engines(
    make: str = Query(..., description="Marka adı"),
    model: str = Query(..., description="Model adı"),
    year: str = Query(..., description="Yıl aralığı (örn: 2015-2020 veya 2018)"),
    db: Session = Depends(get_db)
):
    """Seçili marka+model+yıla ait motorları getir."""
    # Yıl parse et
    if "-" in year:
        year_start, year_end = map(int, year.split("-"))
    else:
        year_start = year_end = int(year)

    engines = db.query(
        Vehicle.engine,
        Vehicle.fuel_type
    ).filter(
        Vehicle.make == make,
        Vehicle.model == model,
        Vehicle.year_start <= year_end,
        Vehicle.year_end >= year_start
    ).distinct().order_by(Vehicle.engine).all()

    return [
        VehicleEngine(engine=row.engine, fuel_type=row.fuel_type)
        for row in engines
    ]


@router.get("/search")
def search_vehicles(
    q: str = Query(..., min_length=2, description="Arama terimi"),
    db: Session = Depends(get_db)
):
    """Araç ara (marka, model, motor içinde)."""
    search = f"%{q}%"
    vehicles = db.query(Vehicle).filter(
        Vehicle.make.ilike(search) |
        Vehicle.model.ilike(search) |
        Vehicle.engine.ilike(search)
    ).limit(20).all()

    return [
        {
            "make": v.make,
            "model": v.model,
            "year": f"{v.year_start}-{v.year_end}" if v.year_start != v.year_end else str(v.year_start),
            "engine": v.engine,
            "fuel_type": v.fuel_type,
            "display": f"{v.make} {v.model} ({v.year_start}-{v.year_end}) {v.engine} {v.fuel_type}"
        }
        for v in vehicles
    ]