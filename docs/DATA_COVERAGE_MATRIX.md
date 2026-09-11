# India Data Coverage Matrix & Resolution Directory
**Crime Alert Map (Rakshak AI)**

---

## 1. Coverage Classification Taxonomy

To ensure scientific honesty and prevent misleading safety assertions, every geographic unit in the platform is tagged with one of five coverage ratings:

| Coverage Tier | Definition | Available Data Layers | User-Facing Disclaimer |
| :--- | :--- | :--- | :--- |
| **FULL** | High-density road network, complete district crime stats, micro-incident GPS feeds, active police station geofences, and emergency POIs. | OSM Road Graph + NCRB District Stats + Local Police Advisory + Complete Hospital/Police POIs. | *"Verified high data density. Comprehensive historical and localized safety intelligence available."* |
| **GOOD** | Complete road network, official NCRB district stats, designated highway blackspots, and verified emergency facilities. | OSM Roads + NCRB District Stats + MoRTH Corridors + Nearest Emergency POIs. | *"Official district-level statistics and road safety data active. Micro-street incidents may be sampled."* |
| **PARTIAL** | Complete road network, state/district historical crime aggregates, regional highway data, major hospital/police POIs. | OSM Highways + State Crime Aggregates + Major City POIs. | *"Regional safety indicators active. Granular street-level crime tracking is limited."* |
| **LIMITED** | Basic road topology, state-level historical statistics, sparse lighting or POI telemetry. | OSM Road Vectors + State-Level NCRB Figures. | *"Limited local data available. Safety calculations rely primarily on road network attributes and state baseline."* |
| **NONE** | Remote uninhabited areas or disputed territories with zero official police reporting or road telemetry. | Geographic Boundary Polygon only. | *"Data Unavailable for this sector. Proceed with standard caution."* |

---

## 2. All-India State & Union Territory Coverage Matrix (36 States & UTs)

| Region / State / UT | ISO Code | Road Network (OSM) | Crime Stats (NCRB) | Accident Stats (MoRTH) | Police & Hospital POIs | Active Coverage Level |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Delhi (NCT)** | `IN-DL` | 100% Full Vectors | Complete 15 Districts | Complete Corridors | >95% Mapped | **FULL** |
| **Maharashtra** | `IN-MH` | 100% (High density in MMR/Pune) | Complete 36 Districts | Complete National/State HW | >85% Mapped | **FULL (Urban) / GOOD (Rural)** |
| **Karnataka** | `IN-KA` | 100% (High density in Bengaluru) | Complete 31 Districts | Complete National HW | >85% Mapped | **FULL (Urban) / GOOD (Rural)** |
| **Tamil Nadu** | `IN-TN` | 100% (High density in Chennai/CBE)| Complete 38 Districts | Complete MoRTH Blackspots | >80% Mapped | **GOOD** |
| **Uttar Pradesh** | `IN-UP` | 100% National/State HW | Complete 75 Districts | Complete Expressways/HW | >75% Mapped | **GOOD (NCR/Major) / PARTIAL (Rural)**|
| **Telangana** | `IN-TG` | 100% (High in Hyderabad) | Complete 33 Districts | Complete State HW | >80% Mapped | **GOOD** |
| **West Bengal** | `IN-WB` | 100% Major Roads | Complete 23 Districts | Complete Corridors | >75% Mapped | **GOOD (Kolkata) / PARTIAL** |
| **Gujarat** | `IN-GJ` | 100% Road Network | Complete 33 Districts | Complete Corridors | >80% Mapped | **GOOD** |
| **Rajasthan** | `IN-RJ` | 100% Road Network | Complete 50 Districts | Complete Corridors | >70% Mapped | **GOOD (Jaipur) / PARTIAL** |
| **Kerala** | `IN-KL` | 100% Dense Rural/Urban | Complete 14 Districts | Complete State Corridors | >85% Mapped | **GOOD** |
| **Haryana** | `IN-HR` | 100% Network | Complete 22 Districts | Complete GT Road/HW | >80% Mapped | **GOOD** |
| **Punjab** | `IN-PB` | 100% Network | Complete 23 Districts | Complete Corridors | >75% Mapped | **GOOD** |
| **Madhya Pradesh** | `IN-MP` | 100% Network | Complete 55 Districts | Complete Corridors | >70% Mapped | **PARTIAL** |
| **Bihar** | `IN-BR` | 100% National/State HW | Complete 38 Districts | Complete Corridors | >65% Mapped | **PARTIAL** |
| **Odisha** | `IN-OR` | 100% Road Network | Complete 30 Districts | Complete Coastal HW | >70% Mapped | **PARTIAL** |
| **Andhra Pradesh** | `IN-AP` | 100% Road Network | Complete 26 Districts | Complete Corridors | >75% Mapped | **GOOD** |
| **Jharkhand** | `IN-JH` | 100% National HW | Complete 24 Districts | Complete Corridors | >65% Mapped | **PARTIAL** |
| **Assam** | `IN-AS` | 100% Major Roads | Complete 35 Districts | Complete Corridors | >70% Mapped | **PARTIAL** |
| **Chhattisgarh** | `IN-CG` | 100% Network | Complete 33 Districts | Complete Corridors | >65% Mapped | **PARTIAL** |
| **Uttarakhand** | `IN-UK` | 100% Hill/Valley HW | Complete 13 Districts | Complete Pilgrimage Corridors | >75% Mapped | **GOOD (Dehradun) / PARTIAL** |
| **Himachal Pradesh** | `IN-HP` | 100% Hill Highways | Complete 12 Districts | Complete NH Corridors | >75% Mapped | **GOOD (Shimla) / PARTIAL** |
| **Goa** | `IN-GA` | 100% Dense Roads | Complete 2 Districts | Complete State Network | >90% Mapped | **FULL** |
| **Jammu & Kashmir** | `IN-JK` | 100% Major Arterials | Complete 20 Districts | Complete NH-44 Corridor | >70% Mapped | **PARTIAL** |
| **Ladakh** | `IN-LA` | 100% Strategic Highways | Complete 2 Districts | Complete NH-1D / Manali HW | >60% Mapped | **LIMITED** |
| **Tripura** | `IN-TR` | 100% Major Roads | Complete 8 Districts | Complete Corridors | >65% Mapped | **PARTIAL** |
| **Meghalaya** | `IN-ML` | 100% Major Roads | Complete 12 Districts | Complete Corridors | >65% Mapped | **PARTIAL** |
| **Manipur** | `IN-MN` | 100% Major Roads | Complete 16 Districts | Complete NH Corridors | >55% Mapped | **LIMITED / PARTIAL** |
| **Nagaland** | `IN-NL` | 100% Major Roads | Complete 16 Districts | Complete Corridors | >55% Mapped | **LIMITED** |
| **Arunachal Pradesh**| `IN-AR` | 100% Major Roads | Complete 26 Districts | Complete Trans-Arunachal HW | >50% Mapped | **LIMITED** |
| **Mizoram** | `IN-MZ` | 100% Major Roads | Complete 11 Districts | Complete Corridors | >60% Mapped | **LIMITED / PARTIAL** |
| **Sikkim** | `IN-SK` | 100% Major Roads | Complete 6 Districts | Complete NH-10 Corridor | >75% Mapped | **PARTIAL** |
| **Chandigarh** | `IN-CH` | 100% Full Vectors | Complete 1 District | Complete City Network | >95% Mapped | **FULL** |
| **Puducherry** | `IN-PY` | 100% Full Vectors | Complete 4 Districts | Complete Coastal Road | >90% Mapped | **FULL** |
| **A & N Islands** | `IN-AN` | 100% Island Roads | Complete 3 Districts | Complete ATR Corridor | >65% Mapped | **PARTIAL** |
| **D & N Haveli / DD**| `IN-DH` | 100% Road Network | Complete 3 Districts | Complete Corridors | >80% Mapped | **GOOD** |
| **Lakshadweep** | `IN-LD` | 100% Island Roads | Complete 1 District | Island Roads | >60% Mapped | **LIMITED** |

---

## 3. Spatial Resolution Hierarchy & Location Precision Tags

When any record is stored or processed, it MUST specify its `location_precision` tag:

```
[EXACT: Coordinate GPS (±10m)]
       │
       ▼
[ROAD_SEGMENT: Specific Way (±100m)]
       │
       ▼
[POLICE_STATION: Jurisdiction Boundary (±1-3km)]
       │
       ▼
[VILLAGE / LOCALITY: Census Settlement (±2-5km)]
       │
       ▼
[SUBDISTRICT / TEHSIL: Administrative Sub-unit (±10-25km)]
       │
       ▼
[DISTRICT: NCRB / MoRTH Standard Unit (±30-80km)]
       │
       ▼
[STATE: State-Level Aggregation (±150-500km)]
```

> **CRITICAL DATA ETHICS RULE**: District-level statistics (e.g., NCRB 2022 total theft in Kanpur = 3,420) are stored as polygon attributes of `districts` table. They are **NEVER converted into synthetic point pins** plotted across the city map.
