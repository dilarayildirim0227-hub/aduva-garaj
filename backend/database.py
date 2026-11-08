from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite veritabanı bağlantısı
SQLALCHEMY_DATABASE_URL = "sqlite:///./aduva.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Veritabanı oturumu sağlayan bağımlılık."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
