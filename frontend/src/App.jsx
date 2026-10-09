import { useEffect, useState } from "react";
import {
  getIncidents,
  createIncident as createIncidentAPI,
  updateIncidentStatus,
  getResources,
  getBridges,
  updateBridgeStatus,
  updateResourceQuantity,
} from "./api";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BatteryCharging,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CloudRain,
  LayoutDashboard,
  MapPin,
  Menu,
  Radio,
  Route,
  Shield,
  Users,
  Waves,
  Zap,
  Search,
  Bell,
  Settings,
  Siren,
  X,
} from "lucide-react";
import "./App.css";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Smart Rescue", icon: Siren },
  { name: "Shelter Management", icon: Building2 },
  { name: "Energy Management", icon: BatteryCharging },
  { name: "Bridge Tracking", icon: Route },
  { name: "Resources", icon: Boxes },
];

const initialIncidents = [
  {
    id: "INC-024",
    title: "Road blockage detected",
    location: "Dharali — North Access",
    priority: "Critical",
    time: "8 min ago",
  },
  {
    id: "INC-023",
    title: "Medical assistance requested",
    location: "Shelter Zone A",
    priority: "High",
    time: "16 min ago",
  },
  {
    id: "INC-022",
    title: "Supply vehicle awaiting clearance",
    location: "Eastern Checkpoint",
    priority: "Medium",
    time: "24 min ago",
  },
];

const initialResources = [
  { name: "Drinking water", stock: 82, unit: "%", color: "blue" },
  { name: "Medical supplies", stock: 64, unit: "%", color: "purple" },
  { name: "Food supplies", stock: 71, unit: "%", color: "green" },
];

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [incidents, setIncidents] = useState(initialIncidents);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
const [apiError, setApiError] = useState("");
  const [shelterOccupancy, setShelterOccupancy] = useState(126);
  const [averageLoad, setAverageLoad] = useState(2);
  const [backupHours, setBackupHours] = useState(48);
  const [batteryCapacity, setBatteryCapacity] = useState(120);
  const [resourceValues, setResourceValues] = useState(initialResources);
  const [loadingResources, setLoadingResources] = useState(true);
  const [resourceError, setResourceError] = useState("");
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: "",
    location: "",
    priority: "High",
  });
  const [notice, setNotice] = useState("");
  useEffect(() => {
  async function loadIncidents() {
    try {
      setLoadingIncidents(true);
      setApiError("");

      const data = await getIncidents();

      setIncidents(
        data.items.map((item) => ({
          ...item,
          priority: item.severity,
          time: new Date(item.created_at).toLocaleString(),
          
        }))
      );
    } catch (error) {
      setApiError("Backend se incidents load nahi ho paaye.");
      console.error(error);
    } finally {
      setLoadingIncidents(false);
    }
  }

  loadIncidents();
}, []);

  useEffect(() => {
    async function loadResources() {
      try {
        setLoadingResources(true);
        setResourceError("");

        const data = await getResources();
        const colors = ["blue", "purple", "green", "yellow"];

        setResourceValues(
          data.items.map((item, index) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            stock: item.available,
            total: item.total,
            unit: item.unit,
            color: colors[index % colors.length],
          }))
        );
      } catch (error) {
        console.error(error);
        setResourceError("Resources backend se load nahi ho paaye.");
      } finally {
        setLoadingResources(false);
      }
    }

    loadResources();
  }, []);

  const requiredEnergy = averageLoad * backupHours;
  const batteryRuntime =
    averageLoad > 0 ? batteryCapacity / averageLoad : 0;

  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const addIncident = async (event) => {
  event.preventDefault();

  if (!newIncident.title.trim() || !newIncident.location.trim()) {
    notify("Please enter incident details.");
    return;
  }

  try {
    const created = await createIncidentAPI(newIncident);

    const incident = {
      ...created,
      priority: created.severity,
      time: new Date(created.created_at).toLocaleString(),
    };

    setIncidents((previous) => [incident, ...previous]);

    setNewIncident({
      title: "",
      location: "",
      priority: "High",
    });

    setShowIncidentForm(false);
    setActivePage("Smart Rescue");
    notify("Incident saved to backend successfully.");
  } catch (error) {
    console.error(error);
    notify("Incident create nahi hua. Backend check karo.");
  }
};

  const updateIncident = async (id) => {
  try {
    await updateIncidentStatus(id, "Resolved");

    setIncidents((previous) =>
      previous.filter((incident) => incident.id !== id)
    );

    notify("Incident resolved successfully.");
  } catch (error) {
    console.error(error);
    notify("Could not resolve incident. Please try again.");
  }
};

  const updateResource = async (index, value) => {
    const resource = resourceValues[index];
    const newStock = Number(value);

    if (
      value === "" ||
      !Number.isInteger(newStock) ||
      newStock < 0 ||
      newStock > resource.total
    ) {
      setResourceError(`Quantity 0 se ${resource.total} ke beech honi chahiye.`);
      return false;
    }

    const delta = newStock - resource.stock;

    if (delta === 0) {
      setResourceError("");
      return true;
    }

    try {
      setResourceError("");
      const result = await updateResourceQuantity(resource.id, delta);
      const updatedStock =
        result?.available ??
        result?.item?.available ??
        result?.resource?.available ??
        newStock;

      setResourceValues((previous) =>
        previous.map((item, i) =>
          i === index ? { ...item, stock: updatedStock } : item
        )
      );
      notify(`${resource.name} inventory updated successfully.`);
      return true;
    } catch (error) {
      console.error(error);
      setResourceError("Backend inventory update nahi ho paya. Please try again.");
      return false;
    }
  };

  const filteredIncidents = incidents.filter((incident) =>
    `${incident.title} ${incident.location} ${incident.priority}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const pageTitle =
    activePage === "Overview" ? "Command center" : activePage;

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Shield size={24} strokeWidth={2.2} />
            <span />
          </div>

          <div>
            <h1>SURAKSHA</h1>
            <p>DISASTER RESPONSE</p>
          </div>

          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name ? "nav-active" : ""
              }`}
              onClick={() => {
                setActivePage(name);
                setMobileMenu(false);
              }}
            >
              <Icon size={19} />
              <span>{name}</span>

              {name === "Smart Rescue" && incidents.length > 0 && (
                <span className="nav-count">{incidents.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-card">
            <div className="connection-heading">
              <span className="live-dot" />
              <span>System status</span>
            </div>
            <p>Dashboard operational</p>
            <div className="connection-footer">
              <Radio size={15} />
              <span>Demo environment</span>
            </div>
          </div>

          <button
            className="profile-card"
            onClick={() => notify("Profile settings are coming soon.")}
          >
            <div className="avatar">GX</div>
            <div className="profile-info">
              <strong>Team GridX</strong>
              <span>Response operator</span>
            </div>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-trigger"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search incidents..."
                aria-label="Search incidents"
              />
              <kbd>⌘ K</kbd>
            </div>

            <button
              className="icon-button notification-button"
              onClick={() => {
                setActivePage("Smart Rescue");
                notify(`${incidents.length} active incidents in this demo.`);
              }}
              aria-label="View alerts"
            >
              <Bell size={19} />
              {incidents.length > 0 && <span className="notification-dot" />}
            </button>

            <div className="header-date">
              <CloudRain size={17} />
              <span>Dharali, Uttarkashi</span>
            </div>
          </div>
        </header>

        <div className="page-container">
          {loadingIncidents && (
  <p role="status">Loading incidents from backend...</p>
)}

{apiError && (
  <p role="alert">{apiError}</p>
)}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />
                DISASTER RESPONSE PLATFORM
              </div>
              <h2>{pageTitle}</h2>
              <p>
                Coordinating emergency response, resources and recovery.
              </p>
            </div>

            <div className="heading-actions">
              <div className="status-pill">
                <span className="live-dot" />
                Demo mode
              </div>

              <button
                className="primary-button"
                onClick={() => setShowIncidentForm(true)}
              >
                <AlertTriangle size={17} />
                Report incident
              </button>
            </div>
          </div>

          {activePage === "Overview" && (
            <Overview
              incidents={incidents}
              occupancy={shelterOccupancy}
              setOccupancy={setShelterOccupancy}
              batteryCapacity={batteryCapacity}
              setBatteryCapacity={setBatteryCapacity}
              averageLoad={averageLoad}
              setAverageLoad={setAverageLoad}
              backupHours={backupHours}
              setBackupHours={setBackupHours}
              requiredEnergy={requiredEnergy}
              batteryRuntime={batteryRuntime}
              resources={resourceValues}
              updateResource={updateResource}
              loadingResources={loadingResources}
              resourceError={resourceError}
              onNavigate={setActivePage}
              notify={notify}
              search={search}
            />
          )}

          {activePage === "Smart Rescue" && (
            <RescuePage
              incidents={filteredIncidents}
              onResolve={updateIncident}
              onAdd={() => setShowIncidentForm(true)}
            />
          )}

          {activePage === "Shelter Management" && (
            <ShelterPage
              occupancy={shelterOccupancy}
              setOccupancy={setShelterOccupancy}
            />
          )}

          {activePage === "Energy Management" && (
            <EnergyPage
              averageLoad={averageLoad}
              setAverageLoad={setAverageLoad}
              backupHours={backupHours}
              setBackupHours={setBackupHours}
              batteryCapacity={batteryCapacity}
              setBatteryCapacity={setBatteryCapacity}
              requiredEnergy={requiredEnergy}
              batteryRuntime={batteryRuntime}
            />
          )}

          {activePage === "Bridge Tracking" && (
            <BridgePage notify={notify} />
          )}

          {activePage === "Resources" && (
            <ResourcesPage
              resources={resourceValues}
              updateResource={updateResource}
              loading={loadingResources}
              error={resourceError}
            />
          )}

          <footer className="page-footer">
            <span>SURAKSHA <span className="footer-separator">/</span> Project GridX</span>
            <span>Disaster response planning platform</span>
          </footer>
        </div>
      </main>

      {showIncidentForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowIncidentForm(false);
            }
          }}
        >
          <form className="incident-modal" onSubmit={addIncident}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">SMART RESCUE</span>
                <h3>Report an incident</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowIncidentForm(false)}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <label>
              Incident description
              <input
                autoFocus
                value={newIncident.title}
                onChange={(event) =>
                  setNewIncident({
                    ...newIncident,
                    title: event.target.value,
                  })
                }
                placeholder="e.g. Medical evacuation required"
                required
              />
            </label>

            <label>
              Location
              <input
                value={newIncident.location}
                onChange={(event) =>
                  setNewIncident({
                    ...newIncident,
                    location: event.target.value,
                  })
                }
                placeholder="e.g. Shelter Zone B"
                required
              />
            </label>

            <label>
              Priority
              <select
                value={newIncident.priority}
                onChange={(event) =>
                  setNewIncident({
                    ...newIncident,
                    priority: event.target.value,
                  })
                }
              >
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowIncidentForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                <AlertTriangle size={16} />
                Create incident
              </button>
            </div>
          </form>
        </div>
      )}

      {notice && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="section-heading">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  tone,
  trend,
  trendType = "positive",
  caption,
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <div className={`metric-icon ${tone}`}>
          <Icon size={21} />
        </div>
        {trend && (
          <span className={`trend trend-${trendType}`}>
            {trendType === "positive" ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {trend}
          </span>
        )}
      </div>

      <p className="metric-title">{title}</p>
      <div className="metric-value">
        {value}
        {unit && <span>{unit}</span>}
      </div>
      <p className="metric-caption">{caption}</p>
    </article>
  );
}

function Overview({
  incidents,
  occupancy,
  setOccupancy,
  batteryCapacity,
  setBatteryCapacity,
  averageLoad,
  setAverageLoad,
  backupHours,
  setBackupHours,
  requiredEnergy,
  batteryRuntime,
  resources,
  updateResource,
  loadingResources,
  resourceError,
  onNavigate,
  notify,
  search,
}) {
  const criticalCount = incidents.filter(
    (incident) => incident.priority === "Critical"
  ).length;

  return (
    <>
      <section className="metrics-grid">
        <MetricCard
          title="Active incidents"
          value={incidents.length}
          icon={AlertTriangle}
          tone="red"
          trend={`${criticalCount} critical`}
          trendType="negative"
          caption="Awaiting response or review"
        />

        <MetricCard
          title="People sheltered"
          value={occupancy}
          unit="/ 150"
          icon={Users}
          tone="blue"
          trend={`${Math.round((occupancy / 150) * 100)}%`}
          caption={`${150 - occupancy} places remaining`}
        />

        <MetricCard
          title="Energy reserve"
          value={batteryCapacity}
          unit=" kWh"
          icon={BatteryCharging}
          tone="yellow"
          trend={`${Math.max(0, Math.round(batteryRuntime))}h`}
          caption="Estimated runtime at current load"
        />

        <MetricCard
          title="Bridge readiness"
          value="Pending"
          icon={Route}
          tone="green"
          caption="Requires engineering inspection"
        />
      </section>

      <section className="content-grid main-grid">
        <article className="panel incident-panel">
          <SectionHeading
            title="Incident overview"
            subtitle="Review and manage reported emergencies"
            action="View all"
            onAction={() => onNavigate("Smart Rescue")}
          />

          <div className="incident-list">
            {incidents
              .filter((incident) =>
                `${incident.title} ${incident.location} ${incident.priority}`
                  .toLowerCase()
                  .includes(search.toLowerCase())
              )
              .slice(0, 4)
              .map((incident) => (
                <div className="incident-row" key={incident.id}>
                  <div className={`incident-icon ${incident.priority.toLowerCase()}`}>
                    <AlertTriangle size={18} />
                  </div>

                  <div className="incident-details">
                    <strong>{incident.title}</strong>
                    <span>
                      <MapPin size={13} />
                      {incident.location}
                    </span>
                  </div>

                  <div className="incident-meta">
                    <span className={`priority priority-${incident.priority.toLowerCase()}`}>
                      {incident.priority}
                    </span>
                    <span className="incident-time">{incident.time}</span>
                  </div>
                </div>
              ))}

            {incidents.filter((incident) =>
              `${incident.title} ${incident.location} ${incident.priority}`
                .toLowerCase()
                .includes(search.toLowerCase())
            ).length === 0 && (
              <div className="empty-state">No matching incidents found.</div>
            )}
          </div>
        </article>

        <article className="panel weather-panel">
          <SectionHeading
            title="Field conditions"
            subtitle="Illustrative operational context"
          />

          <div className="weather-main">
            <div className="weather-symbol">
              <CloudRain size={36} />
            </div>
            <div>
              <div className="weather-condition">Cloudburst response</div>
              <div className="weather-location">
                <MapPin size={14} /> Dharali, Uttarkashi
              </div>
            </div>
          </div>

          <div className="weather-warning">
            <Waves size={18} />
            <div>
              <strong>Terrain risk: High</strong>
              <span>Verify routes and ground conditions before deployment.</span>
            </div>
          </div>

          <div className="weather-stats">
            <div>
              <span>Bridge span target</span>
              <strong>45 m</strong>
            </div>
            <div>
              <span>Vehicle load target</span>
              <strong>15 tonnes</strong>
            </div>
          </div>

          <button
            className="secondary-button full-width"
            onClick={() => onNavigate("Bridge Tracking")}
          >
            Open bridge tracking <ArrowUpRight size={16} />
          </button>
        </article>
      </section>

      <section className="content-grid secondary-grid">
        <article className="panel shelter-panel">
          <SectionHeading
            title="Shelter capacity"
            subtitle="Emergency accommodation overview"
            action="Manage"
            onAction={() => onNavigate("Shelter Management")}
          />

          <div className="shelter-number">
            <strong>{occupancy}</strong>
            <span>of 150 people</span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill blue-fill"
              style={{
                width: `${Math.min(100, (occupancy / 150) * 100)}%`,
              }}
            />
          </div>

          <div className="progress-legend">
            <span>
              <i className="legend-dot blue-dot" /> Occupied
            </span>
            <span>{150 - occupancy} spaces remaining</span>
          </div>

          <div className="shelter-unit-grid">
            <div className="shelter-unit">
              <Building2 size={18} />
              <div>
                <strong>30</strong>
                <span>Family units planned</span>
              </div>
            </div>
            <div className="shelter-unit">
              <Activity size={18} />
              <div>
                <strong>1</strong>
                <span>Medical triage tent</span>
              </div>
            </div>
          </div>

          <div className="inline-control">
            <label htmlFor="occupancy">Update occupied places</label>
            <input
              id="occupancy"
              type="number"
              min="0"
              max="150"
              value={occupancy}
              onChange={(event) =>
                setOccupancy(
                  Math.max(0, Math.min(150, Number(event.target.value) || 0))
                )
              }
            />
          </div>
        </article>

        <article className="panel energy-panel">
          <SectionHeading
            title="Energy resilience"
            subtitle="48-hour backup planning"
            action="Calculator"
            onAction={() => onNavigate("Energy Management")}
          />

          <div className="energy-summary">
            <div className="energy-summary-icon">
              <Zap size={21} />
            </div>
            <div>
              <span>Required delivered energy</span>
              <strong>{requiredEnergy.toFixed(1)} kWh</strong>
            </div>
            <span className="energy-duration">{backupHours} hours</span>
          </div>

          <div className="energy-controls">
            <div className="range-control">
              <div className="range-label">
                <label htmlFor="average-load">Average critical load</label>
                <strong>{averageLoad} kW</strong>
              </div>
              <input
                id="average-load"
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={averageLoad}
                onChange={(event) => setAverageLoad(Number(event.target.value))}
              />
            </div>

            <div className="range-control">
              <div className="range-label">
                <label htmlFor="backup-hours">Backup duration</label>
                <strong>{backupHours} h</strong>
              </div>
              <input
                id="backup-hours"
                type="range"
                min="12"
                max="72"
                step="12"
                value={backupHours}
                onChange={(event) => setBackupHours(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="energy-note">
            <AlertTriangle size={16} />
            <span>
              Delivered energy only. Battery losses and safety reserves are
              excluded.
            </span>
          </div>
        </article>
      </section>

      <section className="panel resources-panel">
        <SectionHeading
          title="Essential resource levels"
          subtitle={loadingResources ? "Loading backend inventory..." : "Inventory loaded from backend"}
          action="Manage resources"
          onAction={() => onNavigate("Resources")}
        />

        {resourceError && <p role="alert">{resourceError}</p>}
        <div className="resource-grid">
          {resources.map((resource, index) => (
            <div className="resource-item" key={resource.name}>
              <div className="resource-heading">
                <span>{resource.name}</span>
                <strong>{resource.stock} / {resource.total} {resource.unit}</strong>
              </div>
              <div className="progress-track resource-track">
                <div
                  className={`progress-fill ${resource.color}-fill`}
                  style={{ width: `${resource.total > 0 ? (resource.stock / resource.total) * 100 : 0}%` }}
                />
              </div>
              <span className="resource-caption">
                {resource.total > 0 && resource.stock / resource.total < 0.3
                  ? "Low stock — replenishment needed"
                  : "Backend inventory"}
              </span>
              {resource.total > 0 && resource.stock / resource.total < 0.3 && (
                <button
                  className="text-button"
                  onClick={() => notify(`Replenishment needed: ${resource.name}`)}
                >
                  Flag shortage
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function RescuePage({ incidents, onResolve, onAdd }) {
  return (
    <>
      <section className="metrics-grid">
        <MetricCard
          title="Active incidents"
          value={incidents.length}
          icon={AlertTriangle}
          tone="red"
          caption="Matching active records"
        />
        <MetricCard
          title="Critical priority"
          value={incidents.filter((item) => item.priority === "Critical").length}
          icon={Siren}
          tone="yellow"
          caption="Requires immediate review"
        />
        <MetricCard
          title="Response coverage"
          value="Manual"
          icon={Radio}
          tone="blue"
          caption="Live team telemetry not connected"
        />
        <MetricCard
          title="Route status"
          value="Unverified"
          icon={Route}
          tone="green"
          caption="Field verification required"
        />
      </section>

      <section className="panel page-panel">
        <SectionHeading
          title="Incident management"
          subtitle="Create and manage incidents in this browser session"
          action="+ New incident"
          onAction={onAdd}
        />

        {incidents.length === 0 ? (
          <div className="empty-state">No matching incidents found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Reported</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <strong>{incident.title}</strong>
                      <span className="table-subtitle">{incident.id}</span>
                    </td>
                    <td>{incident.location}</td>
                    <td>
                      <span className={`priority priority-${incident.priority.toLowerCase()}`}>
                        {incident.priority}
                      </span>
                    </td>
                    <td>{incident.time}</td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => onResolve(incident.id)}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel info-banner">
        <MapPin size={22} />
        <div>
          <strong>Map integration planned</strong>
          <p>
            Incident locations are currently entered manually. GPS, verified
            road closures and field team positions are not connected.
          </p>
        </div>
      </section>
    </>
  );
}

function ShelterPage({ occupancy, setOccupancy }) {
  const units = Array.from({ length: 30 }, (_, index) => {
    const people = Math.max(0, Math.min(5, occupancy - index * 5));
    return {
      id: index + 1,
      people,
      status: people === 5 ? "Full" : people === 0 ? "Available" : "Partial",
    };
  });

  return (
    <>
      <section className="metrics-grid">
        <MetricCard
          title="Shelter capacity"
          value="150"
          unit=" people"
          icon={Users}
          tone="blue"
          caption="Planned total capacity"
        />
        <MetricCard
          title="Current occupancy"
          value={occupancy}
          icon={Building2}
          tone="green"
          caption="Editable demonstration data"
        />
        <MetricCard
          title="Available spaces"
          value={150 - occupancy}
          icon={CheckCircle2}
          tone="purple"
          caption="Based on entered occupancy"
        />
        <MetricCard
          title="Family units"
          value="30"
          icon={Building2}
          tone="yellow"
          caption="Five people per unit planned"
        />
      </section>

      <section className="panel page-panel">
        <SectionHeading
          title="Shelter allocation"
          subtitle="Illustrative layout — occupancy is not linked to individual registrations"
        />

        <div className="inline-control shelter-occupancy-control">
          <label htmlFor="shelter-count">Total occupied places</label>
          <input
            id="shelter-count"
            type="number"
            min="0"
            max="150"
            value={occupancy}
            onChange={(event) =>
              setOccupancy(Math.max(0, Math.min(150, Number(event.target.value) || 0)))
            }
          />
        </div>

        <div className="unit-grid">
          {units.map((unit) => (
            <div className={`unit-card unit-${unit.status.toLowerCase()}`} key={unit.id}>
              <div className="unit-card-top">
                <Building2 size={19} />
                <span>UNIT {String(unit.id).padStart(2, "0")}</span>
              </div>
              <strong>{unit.people}/5</strong>
              <span>{unit.status}</span>
              <div className="mini-occupancy">
                <div style={{ width: `${(unit.people / 5) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel info-banner">
        <Activity size={22} />
        <div>
          <strong>Medical triage facility</strong>
          <p>
            One central triage tent is included in the planning requirements.
            Medical staffing and real patient records are not connected.
          </p>
        </div>
      </section>
    </>
  );
}

function EnergyPage({
  averageLoad,
  setAverageLoad,
  backupHours,
  setBackupHours,
  batteryCapacity,
  setBatteryCapacity,
  requiredEnergy,
  batteryRuntime,
}) {
  const [depthOfDischarge, setDepthOfDischarge] = useState(80);
  const [inverterEfficiency, setInverterEfficiency] = useState(90);

  const nominalRequired =
    requiredEnergy /
    ((depthOfDischarge / 100) * (inverterEfficiency / 100));

  const estimatedDelivered =
    batteryCapacity *
    (depthOfDischarge / 100) *
    (inverterEfficiency / 100);

  const hasEnoughCapacity = estimatedDelivered >= requiredEnergy;

  return (
    <>
      <section className="metrics-grid">
        <MetricCard
          title="Required delivered energy"
          value={requiredEnergy.toFixed(1)}
          unit=" kWh"
          icon={Zap}
          tone="yellow"
          caption={`${backupHours} hours without solar input`}
        />
        <MetricCard
          title="Nominal battery estimate"
          value={nominalRequired.toFixed(1)}
          unit=" kWh"
          icon={BatteryCharging}
          tone="blue"
          caption="Based on entered efficiency assumptions"
        />
        <MetricCard
          title="Available battery"
          value={batteryCapacity}
          unit=" kWh"
          icon={Activity}
          tone="purple"
          caption="User-entered nominal capacity"
        />
        <MetricCard
          title="Estimated runtime"
          value={batteryRuntime.toFixed(1)}
          unit=" hours"
          icon={Clock3}
          tone="green"
          caption="Simplified nominal capacity / load"
        />
      </section>

      <section className="content-grid energy-detail-grid">
        <article className="panel page-panel">
          <SectionHeading
            title="Backup energy calculator"
            subtitle="Change assumptions to calculate a preliminary estimate"
          />

          <div className="calculator-fields">
            <div className="range-control">
              <div className="range-label">
                <label htmlFor="load-input">Average critical load</label>
                <strong>{averageLoad} kW</strong>
              </div>
              <input
                id="load-input"
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={averageLoad}
                onChange={(event) => setAverageLoad(Number(event.target.value))}
              />
              <span className="field-hint">Assumed average simultaneous load.</span>
            </div>

            <div className="range-control">
              <div className="range-label">
                <label htmlFor="hours-input">Backup duration</label>
                <strong>{backupHours} hours</strong>
              </div>
              <input
                id="hours-input"
                type="range"
                min="12"
                max="72"
                step="12"
                value={backupHours}
                onChange={(event) => setBackupHours(Number(event.target.value))}
              />
            </div>

            <label className="form-field">
              Nominal battery capacity (kWh)
              <input
                type="number"
                min="1"
                max="10000"
                value={batteryCapacity}
                onChange={(event) =>
                  setBatteryCapacity(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </label>

            <div className="range-control">
              <div className="range-label">
                <label htmlFor="dod-input">Usable depth of discharge</label>
                <strong>{depthOfDischarge}%</strong>
              </div>
              <input
                id="dod-input"
                type="range"
                min="50"
                max="95"
                step="5"
                value={depthOfDischarge}
                onChange={(event) => setDepthOfDischarge(Number(event.target.value))}
              />
            </div>

            <div className="range-control">
              <div className="range-label">
                <label htmlFor="efficiency-input">Inverter efficiency</label>
                <strong>{inverterEfficiency}%</strong>
              </div>
              <input
                id="efficiency-input"
                type="range"
                min="80"
                max="98"
                step="1"
                value={inverterEfficiency}
                onChange={(event) => setInverterEfficiency(Number(event.target.value))}
              />
            </div>
          </div>
        </article>

        <article className="panel calculation-panel">
          <div className="calculation-icon">
            <BatteryCharging size={27} />
          </div>

          <span className="eyebrow">CALCULATION SUMMARY</span>
          <h3>Battery backup estimate</h3>

          <div className="calculation-line">
            <span>Required delivered energy</span>
            <strong>{requiredEnergy.toFixed(1)} kWh</strong>
          </div>
          <div className="calculation-line">
            <span>Usable energy from battery</span>
            <strong>{estimatedDelivered.toFixed(1)} kWh</strong>
          </div>
          <div className="calculation-line">
            <span>Nominal capacity estimate</span>
            <strong>{nominalRequired.toFixed(1)} kWh</strong>
          </div>

          <div className={`capacity-status ${hasEnoughCapacity ? "capacity-ok" : "capacity-low"}`}>
            {hasEnoughCapacity ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertTriangle size={19} />
            )}
            <div>
              <strong>
                {hasEnoughCapacity ? "Meets entered energy target" : "Insufficient estimated capacity"}
              </strong>
              <span>
                {hasEnoughCapacity
                  ? "The entered capacity meets this simplified calculation."
                  : `An additional ${(nominalRequired - batteryCapacity).toFixed(1)} kWh nominal capacity is estimated.`}
              </span>
            </div>
          </div>

          <p className="calculation-disclaimer">
            Preliminary planning only. This estimate excludes temperature
            effects, battery ageing, reserve margins, load surges, wiring
            losses and equipment-specific limits. Qualified electrical
            engineering review is required before deployment.
          </p>
        </article>
      </section>
    </>
  );
}

function BridgePage({ notify }) {
  const [bridges, setBridges] = useState([]);
  const [loadingBridges, setLoadingBridges] = useState(true);
  const [bridgeError, setBridgeError] = useState("");
  const [selectedBridge, setSelectedBridge] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const statusOptions = ["Inspection pending", "Deployment ready", "In transit"];

  async function loadBridges() {
    try {
      setLoadingBridges(true);
      setBridgeError("");
      const data = await getBridges();
      setBridges(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      setBridgeError("Bridges backend se load nahi ho paaye.");
    } finally {
      setLoadingBridges(false);
    }
  }

  useEffect(() => {
    loadBridges();
  }, []);

  const inspectedCount = bridges.filter((bridge) =>
    String(bridge.status || "").toLowerCase().includes("review") ||
    String(bridge.status || "").toLowerCase().includes("inspect")
  ).length;

  function openStatusEditor(bridge) {
    setSelectedBridge(bridge);
    setDraftStatus(bridge.status || statusOptions[0]);
  }

  async function saveBridgeStatus(event) {
    event.preventDefault();
    if (!selectedBridge || !draftStatus) return;

    try {
      setSavingStatus(true);
      const updatedBridge = await updateBridgeStatus(selectedBridge.id, draftStatus);
      setBridges((current) =>
        current.map((bridge) =>
          bridge.id === updatedBridge.id ? updatedBridge : bridge
        )
      );
      setSelectedBridge(null);
      notify(`Bridge ${updatedBridge.id} status updated to ${updatedBridge.status}.`);
    } catch (error) {
      console.error(error);
      notify(error.message || "Bridge status update failed.");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <>
      <section className="metrics-grid">
        <MetricCard
          title="Bridge records"
          value={bridges.length}
          icon={Route}
          tone="blue"
          caption="Loaded from FastAPI backend"
        />
        <MetricCard
          title="Vehicle load target"
          value="15"
          unit=" tonnes"
          icon={Building2}
          tone="yellow"
          caption="Emergency response planning target"
        />
        <MetricCard
          title="Inspection records"
          value={inspectedCount}
          unit={` / ${bridges.length}`}
          icon={CheckCircle2}
          tone="green"
          caption="Based on backend status values"
        />
        <MetricCard
          title="Deployment status"
          value={bridges.length > 0 && inspectedCount === bridges.length ? "Reviewed" : "Pending"}
          icon={Activity}
          tone="purple"
          caption="Not a structural safety certification"
        />
      </section>

      <section className="panel page-panel">
        <SectionHeading
          title="Bridge tracking"
          subtitle={loadingBridges ? "Loading bridge records from backend..." : "Bridge records returned by the backend"}
        />

        {loadingBridges && <p role="status">Loading bridges from backend...</p>}
        {bridgeError && <p role="alert">{bridgeError}</p>}

        {!loadingBridges && !bridgeError && bridges.length === 0 && (
          <div className="empty-state">Backend ne abhi koi bridge record return nahi kiya.</div>
        )}

        {!loadingBridges && !bridgeError && bridges.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bridge</th>
                  <th>Zone</th>
                  <th>Span</th>
                  <th>Load class</th>
                  <th>Backend status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bridges.map((bridge) => (
                  <tr key={bridge.id}>
                    <td>
                      <strong>{bridge.name}</strong>
                      <span className="table-subtitle">{bridge.id}</span>
                    </td>
                    <td>{bridge.zone || "—"}</td>
                    <td>{bridge.span_m != null ? `${bridge.span_m} m` : "—"}</td>
                    <td>{bridge.load_class_tonnes != null ? `${bridge.load_class_tonnes} tonnes` : "—"}</td>
                    <td>
                      <span className={`priority ${String(bridge.status || "Pending").toLowerCase().includes("open") ? "priority-low" : "priority-medium"}`}>
                        {bridge.status || "Pending"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => openStatusEditor(bridge)}
                      >
                        View status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBridge && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !savingStatus) {
              setSelectedBridge(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(2, 6, 18, 0.76)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <section
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bridge-status-title"
            style={{ width: "min(100%, 480px)", padding: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" }}>
              <div>
                <h2 id="bridge-status-title" style={{ marginTop: 0 }}>Bridge status</h2>
                <p>{selectedBridge.name} · {selectedBridge.id}</p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setSelectedBridge(null)}
                disabled={savingStatus}
                aria-label="Close bridge status dialog"
              >
                Close
              </button>
            </div>

            <p>Current status: <strong>{selectedBridge.status}</strong></p>

            <form onSubmit={saveBridgeStatus}>
              <label htmlFor="bridge-status-select" style={{ display: "block", marginBottom: "8px" }}>
                Update status
              </label>
              <select
                id="bridge-status-select"
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "18px",
                  color: "inherit",
                  background: "#111b2b",
                  border: "1px solid #334155",
                }}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSelectedBridge(null)}
                  disabled={savingStatus}
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingStatus}>
                  {savingStatus ? "Saving..." : "Update Status"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="panel info-banner">
        <AlertTriangle size={22} />
        <div>
          <strong>Engineering approval required</strong>
          <p>
            Backend bridge records are for tracking only. They do not verify bridge strength,
            foundation stability or suitability for a 15-tonne vehicle. Deployment requires
            qualified structural engineering analysis and approval.
          </p>
        </div>
      </section>
    </>
  );
}

function ResourcesPage({ resources, updateResource, loading, error }) {
  const [draftValues, setDraftValues] = useState({});

  useEffect(() => {
    setDraftValues(
      Object.fromEntries(resources.map((resource) => [resource.id, String(resource.stock)]))
    );
  }, [resources]);

  const saveResource = async (index, resource) => {
    const draft = draftValues[resource.id] ?? String(resource.stock);
    const saved = await updateResource(index, draft);
    if (!saved) {
      setDraftValues((previous) => ({
        ...previous,
        [resource.id]: String(resource.stock),
      }));
    }
  };

  return (
    <>
      <section className="metrics-grid">
        <MetricCard
          title="Tracked categories"
          value={resources.length}
          icon={Boxes}
          tone="blue"
          caption="Loaded from backend"
        />
        <MetricCard
          title="Low stock alerts"
          value={resources.filter((item) => item.total > 0 && item.stock / item.total < 0.3).length}
          icon={AlertTriangle}
          tone="red"
          caption="Categories below 30%"
        />
        <MetricCard
          title="Average stock"
          value={`${Math.round(
            resources.reduce((sum, item) => sum + (item.total > 0 ? item.stock / item.total * 100 : 0), 0) /
              Math.max(1, resources.length)
          )}%`}
          icon={Activity}
          tone="green"
          caption="Across tracked categories"
        />
        <MetricCard
          title="Data source"
          value="API"
          icon={Radio}
          tone="purple"
          caption="FastAPI inventory source"
        />
      </section>

      <section className="panel page-panel">
        {loading && <p role="status">Loading resources from backend...</p>}
        {error && <p role="alert">{error}</p>}
        <SectionHeading
          title="Resource inventory"
          subtitle="Available quantities returned by the backend"
        />

        <div className="resource-management-list">
          {resources.map((resource, index) => (
            <div className="resource-management-row" key={resource.name}>
              <div className={`metric-icon ${resource.color}`}>
                <Boxes size={20} />
              </div>
              <div className="resource-management-info">
                <strong>{resource.name}</strong>
                <span>
                  {resource.total > 0 && resource.stock / resource.total < 0.3 ? "Replenishment required" : "Backend inventory"}
                </span>
                <div className="progress-track resource-track">
                  <div
                    className={`progress-fill ${resource.color}-fill`}
                    style={{ width: `${resource.total > 0 ? (resource.stock / resource.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <label className="stock-input">
                <span>Available ({resource.unit})</span>
                <input
                  type="number"
                  min="0"
                  max={resource.total}
                  value={draftValues[resource.id] ?? String(resource.stock)}
                  onChange={(event) =>
                    setDraftValues((previous) => ({
                      ...previous,
                      [resource.id]: event.target.value,
                    }))
                  }
                  onBlur={() => saveResource(index, resource)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default App;