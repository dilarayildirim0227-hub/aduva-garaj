from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from database import engine, Base, get_db
from models import User, Category, Brand, Product, Vehicle
from routers import products, cart, auth, wishlist, vin, admin
from auth import get_current_user
from schemas import UserResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Başlangıçta tabloları oluştur
    Base.metadata.create_all(bind=engine)
    yield
    # Kapanışta temizlik (gerekirse)


app = FastAPI(
    title="ADUVA GARAJ API",
    description="Oto Aksesuar, Multimedya & OEM Yedek Parça E-ticaret API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - geliştirme için açık
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ları kaydet
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(auth.router)
app.include_router(wishlist.router)
app.include_router(vin.router)
app.include_router(admin.router)


@app.get("/api/health")
def health_check():
    """Sağlık kontrolü."""
    return {"status": "ok", "service": "ADUVA GARAJ API"}


@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Mevcut kullanıcı bilgisi (frontend için kolay erişim)."""
    return UserResponse.model_validate(current_user)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
