# 📖 Zoltraak User Guide & Persona Workflows

Zoltraak supports three core user roles with customized controls, dashboards, and workflows:
1. **EV Driver**
2. **Community Home Host**
3. **Commercial Station Operator**

---

## 🚘 Persona 1: EV Driver

### 1. Onboarding & EV Garage Setup
* When you open the application, click the **Profile & Garage** icon in the top right (or top floating bar).
* Choose your vehicle from Indian EV models (e.g., *Tata Nexon EV Empowered*, *Punch EV*, *Mahindra XUV400*, *MG ZS EV*, *Ather 450X*, *Ola S1 Pro*, *Ultraviolette F77*).
* Setting your vehicle automatically presets your usable battery capacity (kWh), typical highway range, and supported charging protocols (e.g., CCS2, Type 2, Bharat AC-001).

### 2. Exploring Stations on the Map
* **Public Fast Chargers (Green ⚡):** High-power DC fast chargers (30 kW – 120 kW) operated by networks like Tata Power, KSEB, Zeon, Jio-bp, and Relux.
* **Community Home Chargers (Electric Blue 🏠):** Residential 7.4 kW / 3.3 kW AC wallboxes hosted by local homeowners with a fixed rate of ₹11.50/kWh.
* **3-Way Filter Toggle:** Use the quick toggle chip on the map to switch between:
  * `⚡ + 🏠 All Stations`
  * `🏠 Home Only (Blue)`
  * `⚡ Public Only (Green)`
* **Recenter on Current Location:** Click the crosshairs / GPS button to center the map on your exact location via HTML5 browser geolocation.
* **H3 Spatial Grid Toggle:** Click the **⬡ H3 Grid** toggle to visualize spatial density hexagons. As you zoom in, the hexagons automatically refine from Res 6 to Res 9.

### 3. Route Planning (Point A to Point B)
* Click **Route Planner** on the floating control bar.
* Select an origin and destination using the preset dropdowns (e.g., *Kochi to Thiruvananthapuram*, *Kozhikode to Wayanad*, *Thrissur to Munnar*) or type any custom address.
* Adjust your **Current State of Charge (SoC %)** slider.
* Click **Calculate EV Route**. The engine will calculate:
  * Total road distance (km) and estimated drive time.
  * Real-time GPS-style route line on the map.
  * Recommended corridor charging stops with estimated detour distance and charge time required.
* Click **Open in Google Maps** on the navigation HUD to launch turn-by-turn navigation directly on your mobile device.

### 4. Submitting Outage Reports & 5-Star Ratings
* Tap any station pin on the map to open its details card.
* Click **Report / Rate**.
* Select your rating (1 to 5 stars) and status report:
  * `Operational`: Charger working perfectly.
  * `Broken / Offline`: Hardware error, connector damaged, or no power.
  * `Busy / Long Queue`: All bays occupied.
  * `ICE-ed / Inaccessible`: Blocked by petrol/diesel vehicles or locked gate.
* When you submit a `Broken` report, the station status immediately updates on the live map to protect fellow EV drivers from stranded trips.

---

## 🏠 Persona 2: Community Home Host

If you have a 3.3 kW or 7.4 kW home EV charger in your driveway or garage in Kerala, you can monetize your charger and support local EV adoption.

### 1. Switching to Host Persona
* Click **Driver ▾** in the top bar and select **Home Host (Host View)**.

### 2. Registering Your Home Charger
* Click the **+ List Home Charger** button in the floating controls or dashboard.
* Enter your details:
  * Host Name & Contact Number.
  * Exact residential address & Kerala district/city.
  * Charger power (e.g., 3.3 kW or 7.4 kW).
  * Connector type (Type 2 AC or 16A 3-pin socket).
  * Access notes (e.g., "Driveway gate open, call 10 mins before arrival").
* The tariff is automatically standardized at **₹11.50/kWh** to ensure transparent, fair pricing for community drivers.

### 3. Managing Live Availability & Driveway Queue
* Open your charger management drawer.
* Toggle status between **Available** (open for charging), **Busy** (charging a vehicle now), or **Offline** (away from home / personal use only).
* Update the live queue count (0 to 3 vehicles) to let incoming drivers know if there is a wait.

---

## ⚡ Persona 3: Commercial Station Operator

For charging point operators (CPOs) managing commercial highway hubs.

### 1. Switching to Operator Persona
* Select **Commercial Operator** in the role switcher.

### 2. Updating Station Status
* Select your managed station from the map.
* Update charger gun availability (e.g., mark Gun 2 as undergoing scheduled maintenance).
* Monitor crowdsourced feedback and recent customer ratings to resolve issues proactively.
