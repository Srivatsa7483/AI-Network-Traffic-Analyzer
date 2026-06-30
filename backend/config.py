import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database Config
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured.")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not configured.")

# Detect DB type (explicit override or from database URL schema)
DB_TYPE_ENV = os.getenv("DB_TYPE")
if DB_TYPE_ENV:
    DB_TYPE = DB_TYPE_ENV.lower()
elif DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    DB_TYPE = "postgres"
else:
    DB_TYPE = "sqlite"

print(f"[Config] Selected Database Backend: {DB_TYPE.upper()}")
