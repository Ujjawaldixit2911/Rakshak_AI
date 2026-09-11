# Deployment & DevOps Architecture Plan
**Crime Alert Map (Rakshak AI)**

---

## 1. Cloud Infrastructure & Service Topology

```mermaid
flowchart TB
    subgraph EdgeLayer ["Global Edge & CDN Layer"]
        CLOUDFLARE["Cloudflare Edge (WAF, SSL Termination, DDoS Protection)"]
    end

    subgraph FrontendTier ["Frontend Hosting (Vercel / AWS Amplify)"]
        NEXT_APP["Next.js 16 Web Application (Serverless Node.js Runtime)"]
    end

    subgraph BackendTier ["Containerized Backend Services (GCP Cloud Run / AWS ECS)"]
        FASTAPI_API["FastAPI Core REST API (Gunicorn + Uvicorn Workers)"]
        CELERY_WORKER["Celery Ingestion & Spatial Analytics Worker"]
        REDIS_CACHE[("Redis 7 Cache & Task Broker")]
    end

    subgraph DataTier ["Managed Storage & Database Layer"]
        POSTGRES_PROD[("Managed PostgreSQL 16 + PostGIS 3.4 (AWS RDS / GCP Cloud SQL)")]
        S3_STORAGE[("Encrypted Object Storage (AWS S3 / GCP Cloud Storage - Raw Datasets)")]
    end

    CLOUDFLARE --> NEXT_APP
    CLOUDFLARE --> FASTAPI_API
    NEXT_APP <--> FASTAPI_API
    FASTAPI_API <--> REDIS_CACHE
    FASTAPI_API <--> POSTGRES_PROD
    CELERY_WORKER <--> REDIS_CACHE
    CELERY_WORKER <--> POSTGRES_PROD
    CELERY_WORKER <--> S3_STORAGE
```

---

## 2. Docker & Local Development Setup

A complete containerized environment is provided for zero-friction local development:

```yaml
# docker-compose.yml (Target Topology)
version: '3.8'

services:
  database:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: rakshak_safety_db
      POSTGRES_USER: rakshak_admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/sql/init_schema.sql:/docker-entrypoint-initdb.d/01_init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    environment:
      DATABASE_URL: postgresql+asyncpg://rakshak_admin:postgres@database:5432/rakshak_safety_db
      REDIS_URL: redis://redis:6379/0
    ports:
      - "8000:8000"
    depends_on:
      - database
      - redis

  frontend:
    build: ./frontend
    command: npm run dev
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  pgdata:
```
