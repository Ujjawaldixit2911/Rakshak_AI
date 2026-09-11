# India Data Source Registry & Provenance Catalog
**Crime Alert Map (Rakshak AI)**

---

## 1. Data Source Tiering & Integrity Hierarchy

To eliminate hallucinations and maintain scientific integrity, every dataset ingested into the platform is classified under a strict 5-tier reliability model:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA RELIABILITY TIERS                           │
├─────────┬───────────────────────────────┬───────────────────────────────────┤
│ Tier A  │ Official Government & Police  │ NCRB, OGD (data.gov.in), MoRTH    │
├─────────┼───────────────────────────────┼───────────────────────────────────┤
│ Tier B  │ Authoritative Geospatial      │ OpenStreetMap, Survey of India    │
├─────────┼───────────────────────────────┼───────────────────────────────────┤
│ Tier C  │ Academic & Research Portals   │ University crime studies, GIS lab │
├─────────┼───────────────────────────────┼───────────────────────────────────┤
│ Tier D  │ Secondary / Aggregated Repos  │ Kaggle research datasets (labeled)│
├─────────┼───────────────────────────────┼───────────────────────────────────┤
│ Tier E  │ User Submitted Incident Flags │ Crowdsourced citizen reports      │
└─────────┴───────────────────────────────┴───────────────────────────────────┘
```

---

## 2. Comprehensive Data Source Catalog

### Source 01: National Crime Records Bureau (NCRB) — "Crime in India"
- **Organization**: Ministry of Home Affairs (MHA), Government of India
- **Official Portal**: [https://ncrb.gov.in](https://ncrb.gov.in)
- **Dataset Description**: Comprehensive annual compilation of Cognizable Crimes under IPC (Indian Penal Code) and SLL (Special and Local Laws) reported across all Indian States, Union Territories, and 53 Metropolitan Mega-Cities (population > 2 million).
- **Geographic Coverage**: All 28 States, 8 UTs, 700+ Districts, and 53 Mega-Cities.
- **Temporal Coverage**: 1953 – 2022 (Latest published complete annual compendia).
- **Spatial Resolution**: `DISTRICT` level and `STATE` level. (Does NOT provide point coordinate latitude/longitude).
- **Primary Fields**: State/UT, District Name, Year, Crime Heads (Violent Crimes, Crimes against Women, Crimes against Children, Kidnapping, Robbery, Dacoity, Burglary, Theft, Cybercrimes), Chargesheeting Rate, Conviction Rate.
- **Update Frequency**: Annual publication cycle.
- **License**: Government Open Data License - India (GODL) / Public Domain Government Publication.
- **Access Method**: Tabular parsing (CSV/XLSX), Official Statistical Publications, OGD API integrations.
- **Reliability Tier**: **Tier A (Authoritative National Statistics)**
- **Limitations**: Aggregated at District/City level; reporting delays of 12-18 months; reflects recorded police FIRs, subject to reporting rates.
- **Ingestion Strategy**: Mapped into `crime_statistics` table with `location_precision = 'DISTRICT'` or `'STATE'`. **NEVER synthesized into fake point coordinates.**

---

### Source 02: Open Government Data (OGD) Platform India (data.gov.in)
- **Organization**: National Informatics Centre (NIC) / Ministry of Electronics & IT (MeitY)
- **Official Portal**: [https://data.gov.in](https://data.gov.in)
- **Dataset Description**: Multi-sector open government datasets including city-level police jurisdiction listings, district crime rates, women safety metrics, and emergency response infrastructure.
- **Geographic Coverage**: India-wide coverage with variable district-level granularity.
- **Temporal Coverage**: 2014 – Present.
- **Spatial Resolution**: `DISTRICT`, `MUNICIPAL_WARD`, `POLICE_STATION`.
- **Primary Fields**: State, District, City, Crime Category, Incident Count, Year, Reporting Agency.
- **Update Frequency**: Periodic (Quarterly to Annual).
- **License**: Government Open Data License - India (GODL).
- **Access Method**: REST API with API Key authentication / Direct CSV export.
- **Reliability Tier**: **Tier A (Official Open Data)**
- **Limitations**: Variable schema across states; occasional missing years for select rural districts.
- **Ingestion Strategy**: Direct REST API automated fetcher into `data_ingestion_jobs` -> validation -> `crime_statistics` PostGIS tables.

---

### Source 03: Ministry of Road Transport and Highways (MoRTH) — "Road Accidents in India"
- **Organization**: Transport Research Wing (TRW), MoRTH, Government of India
- **Official Portal**: [https://morth.nic.in](https://morth.nic.in)
- **Dataset Description**: Official statistics on road accidents, fatalities, blackspots, road classifications (National Highways, State Highways, Other District Roads), time-of-day accident patterns, and weather accident correlations.
- **Geographic Coverage**: All 36 States/UTs, 50+ Million-plus Cities, and National Highway Corridors.
- **Temporal Coverage**: Annual series (2010 – Present).
- **Spatial Resolution**: `HIGHWAY_CORRIDOR`, `BLACKSPOT_CLUSTER`, `DISTRICT`.
- **Primary Fields**: State, District, Highway Number, Accident Severity (Fatal, Grievous Injury, Minor), Time Slot (Day/Night), Road Feature (Intersection, Curve, Straight, Underpass), Weather Condition.
- **Update Frequency**: Annual.
- **License**: GODL - India / Public Domain.
- **Access Method**: Official statistical reports and MoRTH Open Data APIs.
- **Reliability Tier**: **Tier A (Official Road Safety Statistics)**
- **Limitations**: State-level and corridor-level aggregations; individual micro-incident GPS points available only for designated National Highway Blackspots.
- **Ingestion Strategy**: Ingested into `accidents` and `road_risk_scores` tables.

---

### Source 04: State Police Official Portals (Delhi Police, Mumbai Police, Bengaluru City Police)
- **Organization**: Respective State / City Police Commissioners
- **Official Portals**:
  - Delhi Police: [https://delhipolice.gov.in](https://delhipolice.gov.in)
  - Mumbai Police: [https://mumbaipolice.gov.in](https://mumbaipolice.gov.in)
  - Karnataka / Bengaluru City Police: [https://ksp.karnataka.gov.in](https://ksp.karnataka.gov.in)
- **Dataset Description**: Publicly released crime summaries, police station jurisdiction boundaries, designated vulnerable zones, women help desk locations, and traffic advisory bulletins.
- **Geographic Coverage**: Major metropolitan territories (NCR, MMR, Bengaluru Urban).
- **Temporal Coverage**: Monthly bulletins / Real-time advisories.
- **Spatial Resolution**: `POLICE_STATION`, `ROAD_SEGMENT`, `LOCALITY`.
- **Primary Fields**: Police Station Name, Jurisdiction Polygon, Reported Incident Categories, Night Patrol Sectors, Emergency Contact Numbers.
- **Update Frequency**: Monthly / Ad-hoc.
- **License**: Official Government Notice.
- **Access Method**: Authorized public API feeds / Official Gazette data.
- **Reliability Tier**: **Tier A (Official Municipal Police Data)**
- **Limitations**: Granularity varies by police commissionerate; rural police stations often lack digital portals.
- **Ingestion Strategy**: Mapped into `police_stations`, `police_locations`, and `crime_incidents` (with `POLICE_STATION` precision).

---

### Source 05: OpenStreetMap (OSM) & Overpass API — India Geographic Foundation
- **Organization**: OpenStreetMap Foundation & OpenStreetMap India Community
- **Official Portal**: [https://www.openstreetmap.org](https://www.openstreetmap.org)
- **Dataset Description**: High-fidelity vector road network (motorway, trunk, primary, secondary, tertiary, residential, service roads), pedestrian paths, street lighting tags (`lit=yes/no`), physical infrastructure, bridges, tunnels, and emergency POIs.
- **Geographic Coverage**: 100% of Indian territory.
- **Temporal Coverage**: Continuous real-time updates.
- **Spatial Resolution**: `EXACT` coordinate geometry (`POINT`, `LINESTRING`, `POLYGON`).
- **Primary Fields**: OSM ID, Highway Type, Name, Maxspeed, Surface, Lit status, Lanes, Oneway, Geometry.
- **Update Frequency**: Daily / On-Demand via Overpass QL and Geofabrik India extracts.
- **License**: Open Data Commons Open Database License (ODbL).
- **Access Method**: Osmosis / Osm2pgsql pipeline, Overpass API, Geofabrik `.osm.pbf` extracts.
- **Reliability Tier**: **Tier B (Authoritative Open Geospatial Foundation)**
- **Limitations**: Street lighting tags (`lit=*`) are comprehensive in Tier-1 cities but sparse in secondary rural districts (handled via default lighting inference models).
- **Ingestion Strategy**: Extracted into PostGIS `roads`, `highways`, `road_segments`, `hospitals`, `police_locations`, `fire_stations`.

---

### Source 06: Survey of India / Bharat Maps (Administrative Boundaries)
- **Organization**: Survey of India, Ministry of Science & Technology
- **Official Portal**: [https://surveyofindia.gov.in](https://surveyofindia.gov.in) / [https://bharatmaps.gov.in](https://bharatmaps.gov.in)
- **Dataset Description**: Authoritative national, state, district, and subdistrict/tehsil administrative polygon boundaries.
- **Geographic Coverage**: India National Boundary, 28 States, 8 UTs, 780+ Districts.
- **Temporal Coverage**: 2024 boundary revisions (including Ladakh/J&K reorganization).
- **Spatial Resolution**: `MULTIPOLYGON` boundary geometries.
- **Primary Fields**: State Code, State Name, District Code, District Name, Geometry.
- **Update Frequency**: As revised by Government Gazette notifications.
- **License**: Survey of India Open Data Policy.
- **Reliability Tier**: **Tier A / B (Official Geographic Boundaries)**
- **Limitations**: Subdistrict boundaries in certain remote tribal belts require harmonization with OSM boundary relations.
- **Ingestion Strategy**: Ingested into `states`, `districts`, `subdistricts` tables with spatial GiST indexing.

---

### Source 07: Academic & Research Safety Studies (Tier C)
- **Organization**: Indian Institute of Human Settlements (IIHS), IIT Delhi TRIPP, University GIS Labs
- **Official Portal**: Research repository publications
- **Dataset Description**: Peer-reviewed studies analyzing spatial crime determinants, urban lighting correlations, pedestrian safety audits in Delhi/Mumbai, and road crash modeling.
- **Geographic Coverage**: Selected metropolitan zones (Delhi-NCR, Mumbai, Bengaluru, Pune, Hyderabad).
- **Spatial Resolution**: Sampled `ROAD_SEGMENT` and `WARD` level.
- **Reliability Tier**: **Tier C (Academic Research)**
- **Usage**: Used strictly for parameter calibration (weight tuning of $\alpha, \beta, \gamma, \delta, \epsilon$ in routing and risk models). **Never merged with raw police records.**

---

### Source 08: Verified User Incident Reports (Tier E)
- **Organization**: Crowdsourced Citizen Platform (Rakshak AI Community)
- **Dataset Description**: User-reported street lighting failures, unlit road segments, harassment encounters, distress alerts, and localized safety hazards.
- **Geographic Coverage**: User-submitted coordinate points across India.
- **Spatial Resolution**: `EXACT` (GPS mobile report) or `ROAD_SEGMENT`.
- **Reliability Tier**: **Tier E (Crowdsourced / Unverified by default)**
- **Verification Workflow**: Submissions enter `user_reports` table with status `UNVERIFIED`. Promoted to `VERIFIED` only after multi-user corroboration ($\ge 3$ unique accounts) or municipal/moderator validation.
