import os

WEIGHT_TIME = float(os.getenv("ROUTE_WEIGHT_TIME", "0.5"))
WEIGHT_SAFETY = float(os.getenv("ROUTE_WEIGHT_SAFETY", "0.5"))
ROUTE_COMPARE_CACHE_TTL_SECONDS = int(os.getenv("ROUTE_COMPARE_CACHE_TTL_SECONDS", "300"))
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")
