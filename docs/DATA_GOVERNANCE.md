# Data Governance, Ingestion Protocols & Provenance Rules
**Crime Alert Map (Rakshak AI)**

---

## 1. The Ingestion Quality Pipeline

No external record is inserted directly into production tables. Every ingestion batch flows through a structured 10-stage pipeline:

```
[EXTERNAL SOURCE (API / CSV / GeoJSON)]
       │
       ▼ (1. Secure Fetcher)
[RAW STORAGE (/data/raw/<source_id>_<timestamp>)]
       │
       ▼ (2. Schema Validation)
[VALIDATOR: Strict Pydantic Data Types & Coordinate Sanity Check]
       │
       ▼ (3. Location Precision Tagging)
[PRECISION ASSIGNER: Tag EXACT / POLICE_STATION / DISTRICT]
       │
       ▼ (4. Spatial Deduplication)
[DEDUP ENGINE: Identify Canonical Matches & Upvote Confidences]
       │
       ▼ (5. Quality Check Gate)
[QUALITY FILTER: Discard Invalid Dates, Lat/Lon Out of India Bounds]
       │
       ▼ (6. PostGIS Insertion)
[POSTGRESQL + POSTGIS: Indexed Geometry Creation (EPSG:4326)]
       │
       ▼ (7. Road Segment Spatial Join)
[SPATIAL MATCHER: Derive Nearest Road Segment & Police Jurisdiction]
       │
       ▼ (8. AI Clustering Trigger)
[DBSCAN WORKER: Re-evaluate Spatial Hotspot Polygons]
       │
       ▼ (9. Coverage Registry Update)
[COVERAGE AUDITOR: Update data_coverage and Data Freshness Timestamps]
       │
       ▼ (10. Tile Cache Invalidation)
[REDIS CACHE: Purge Stale Bounding-Box Tiling Caches]
```

---

## 2. Mandatory Provenance Metadata Fields

Every single row in `crime_incidents`, `crime_statistics`, and `accidents` MUST maintain complete traceable lineage:
- `source_id`: Foreign key pointing to `crime_sources` or `accident_sources`.
- `official_reference_id`: Original FIR number, government report table code, or case identifier if published.
- `provenance_url`: Official government gazette or open data URL.
- `location_precision`: Tag from `location_precision_enum`.
- `license`: Open Government Data License - India (GODL) / ODbL.
- `retrieved_at`: UTC timestamp of automated extraction.

---

## 3. Data Fusion & Comparability Rules

When multiple datasets cover overlapping geography (e.g. NCRB state statistics vs. City Police bulletins):
1. **Never Sum Aggregates Blindly**: Distinct counting methodologies or reporting windows must remain in isolated table records.
2. **Resolution Coexistence**: Macro district stats and micro street incident markers coexist independently in the database and are blended only during segment-level risk calculation using calibrated spatial weights.
