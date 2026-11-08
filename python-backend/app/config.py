from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Aduva Garaj API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PREFIX: str = "/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 4000

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aduva:aduva@localhost:5433/aduva"

    # Redis
    REDIS_URL: str = "redis://localhost:6380"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_REFRESH_SECRET: str = "dev-refresh-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption (KVKK)
    TCKN_ENCRYPTION_KEY: str = "aduva-garaj-dev-only-kvkk-aes256-key-32chars"

    # Cart
    CART_FREE_SHIPPING_KURUS: int = 75000
    CART_SHIPPING_FEE_KURUS: int = 7990
    CART_COD_FEE_KURUS: int = 4990
    CART_MAX_PER_ORDER: int = 10

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001", "http://localhost:8080"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()