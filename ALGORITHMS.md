# 🧠 Rakshak AI (Crime Alert Map) — Algorithm & Mathematical Specification

*Designed for Final-Year B.Tech Computer Science Project Evaluation, Synopsis Defense, and Technical Report.*

---

## 1. AI Hotspot Detection Engine: DBSCAN (Density-Based Spatial Clustering of Applications with Noise)

### 1.1 Why DBSCAN over K-Means?
1. **Arbitrary Shaped Clusters**: Urban crime does not distribute in neat circular isotropic spheres (which K-Means assumes). Crimes concentrate along transit corridors, commercial markets, and dark intersections. DBSCAN discovers arbitrary concave/linear hotspot geometries.
2. **Noise Resistance**: Outlier incidents that occur in isolation do not artificially pull cluster centroids; DBSCAN assigns them noise label `-1`.
3. **No Prior $K$ Required**: Unlike K-Means, we do not need to guess how many hotspots exist in Delhi or Mumbai.

### 1.2 Mathematical Formulation & Haversine Metric
Because coordinates are spherical latitudes and longitudes, Euclidean distance creates severe geometric distortion. We transform coordinates $(\phi, \lambda)$ to radians and employ the **Haversine Distance Metric**:

$$d = 2 R \arcsin \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}$$

Where:
- $R = 6371.0088\text{ km}$ (mean Earth radius)
- $\epsilon = \frac{0.500\text{ km}}{6371.0088} \approx 0.00007848\text{ radians}$ (500-meter neighborhood radius)
- $\text{MinPts} = 5$ incidents per core zone

### 1.3 Sample Weighting & Boundary Polygon Generation
- **Sample Weights**: Each crime contributes to density weighted by its severity ($s_i \in [1, 10]$):
  $$w_i = \frac{\text{Severity}_i}{5.0}$$
- **Polygon Hull**: For each detected cluster $C_k$, the convex boundary is constructed via 2D Convex Hull and dilated with a $0.003^\circ$ spatial buffer to generate smooth GeoJSON polygons for Leaflet rendering.

---

## 2. Multi-Factor Area Safety Score Engine (0–100 Scale)

The Area Safety Score provides a continuous scalar measure $S(p, t) \in [0, 100]$, where **100 is perfectly safe** and **0 is high hazard**.

### 2.1 Formula Architecture

$$S(p, t) = \text{clamp}\left(100.0 - \text{RiskPenalty}(p, t) + \text{InfrastructureBoost}(p), 5.0, 100.0\right)$$

#### (A) Spatial Kernel Decay & Incident Penalty
For all historical incidents within neighborhood radius $R = 1.8\text{ km}$ from point $p$:

$$\text{RiskPenalty}(p, t) = \sum_{i \in \mathcal{N}(p)} \left( \text{Severity}_i \times 1.6 \right) \cdot K_{\text{dist}}(d_i) \cdot K_{\text{time}}(\Delta t_i) \cdot M_{\text{tod}}(t) \cdot M_{\text{gender}}$$

1. **Gaussian/Exponential Spatial Kernel**:
   $$K_{\text{dist}}(d_i) = \exp\left(-\frac{d_i}{0.60\text{ km}}\right)$$
2. **Temporal Half-Life Recency Decay**:
   $$K_{\text{time}}(\Delta t_i) = \exp\left(-\frac{\Delta t_{\text{days}}}{240.0}\right)$$
   *(Recent incidents penalize more heavily than incidents from a year ago).*
3. **Time-of-Day Factor ($M_{\text{tod}}$)**:
   - Match with incident peak hour $\implies 1.35\times$
   - Night commute ($22:00 - 05:00$) $\implies 1.45\times$
4. **Mode Multiplier ($M_{\text{gender}}$)**:
   - **Women Safety Mode**: Incidents of Harassment ($2.2\times$), Stalking ($2.2\times$), Assault ($2.0\times$), Snatching ($1.7\times$), and Female victim history ($1.3\times$).

#### (B) Infrastructure Mitigations (Positive Boosts)

$$\text{InfrastructureBoost}(p) = \min\left(18.0, 0.80 \cdot \overline{\text{CCTV}} + 3.50 \cdot \overline{\text{PoliceStations}} + 0.40 \cdot \max(0, 20.0 - \overline{\text{ResponseTime}})\right)$$

- Higher CCTV surveillance and police stations increase safety score.
- Faster police response time ($< 20\text{ min}$) adds positive safety resilience points.

---

## 3. Safe Route Recommendation: Modified Dijkstra & Road Graph Optimization

### 3.1 Graph Representation
The road network is represented as an undirected weighted graph $G = (V, E)$, where:
- $V$: Major traffic intersections, metro hubs, and arterial junctions.
- $E$: Road segments with distance $L_e$ (km) and allowable speed $v_e$ (km/h).
- Base Travel Time: $T_e = \frac{L_e}{v_e} \times 60$ (minutes).

### 3.2 Dynamic Cost Function

$$\text{Cost}_{\text{Fastest}}(e) = T_e$$

$$\text{Cost}_{\text{Safe}}(e) = T_e \times \left[ 1.0 + \beta \cdot \left(\frac{100.0 - S(e)}{25.0}\right) \cdot \text{ModeWeight} \right]$$

Where:
- $S(e)$ is the Safety Score evaluated at the midpoint of edge $e$.
- $\beta = 0.70$ (Normal), $\beta = 1.80$ (Night Safety), $\beta = 2.40$ (Women Safety).
- As safety score $S(e) \to 0$, the edge cost multiplier scales up to $\approx 10\times$, forcing Dijkstra's algorithm to divert traffic away from isolated/hazardous stretches onto well-lit, CCTV-monitored arterial avenues.

### 3.3 Trade-off Analysis
The system outputs both the **Safest Route** and **Fastest Route** along with:
- $\Delta \text{Time} = T_{\text{safe}} - T_{\text{fast}}$
- $\Delta \text{Safety} = S_{\text{safe}} - S_{\text{fast}}$
- Safety Increase $\% = \frac{\Delta \text{Safety}}{S_{\text{fast}}} \times 100\%$

---

## 4. Academic Data Quality & Normalization Note

In the raw source file `ride_safety_dataset.csv`, some synthetic GPS coordinates fell outside the true bounding boxes of Delhi and Mumbai (e.g., latitude $\sim 24.3^\circ\text{N}$). 

For project fidelity, our ingestion pipeline `load_seed_data.py`:
1. Validates all records against true bounding coordinates:
   - **Delhi NCR**: $[28.40^\circ\text{N}, 76.80^\circ\text{E}]$ to $[28.90^\circ\text{N}, 77.40^\circ\text{E}]$
   - **Greater Mumbai**: $[18.90^\circ\text{N}, 72.70^\circ\text{E}]$ to $[19.30^\circ\text{N}, 72.98^\circ\text{E}]$
2. Normalized $612$ out-of-bound rows by re-projecting them to their corresponding locality centroids with geographic jitter, while maintaining all 38 original contextual columns intact.
