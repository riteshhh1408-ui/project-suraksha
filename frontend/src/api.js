const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function getIncidents() {
  const response = await fetch(`${API_BASE_URL}/api/incidents`);

  if (!response.ok) {
    throw new Error("Failed to fetch incidents");
  }

  return response.json();
}

export async function createIncident(incident) {
  const response = await fetch(`${API_BASE_URL}/api/incidents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: incident.title,
      location: incident.location,
      severity: incident.priority,
      people_affected: 1,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create incident");
  }

  return response.json();
}

export async function getResources() {
  const response = await fetch(`${API_BASE_URL}/api/resources`);

  if (!response.ok) {
    throw new Error("Failed to fetch resources");
  }

  return response.json();
}

export async function getBridges() {
  const response = await fetch(`${API_BASE_URL}/api/bridges`);

  if (!response.ok) {
    throw new Error("Failed to fetch bridges");
  }

  return response.json();
}
export async function updateIncidentStatus(incidentId, status) {
  const response = await fetch(
    `${API_BASE_URL}/api/incidents/${incidentId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update incident status");
  }

  return response.json();
}
export async function updateResourceQuantity(resourceId, delta) {
  const response = await fetch(
    `${API_BASE_URL}/api/resources/${resourceId}?delta=${delta}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Resource update failed");
  }

  return response.json();
}
export async function updateBridgeStatus(bridgeId, status) {
  const response = await fetch(
    `${API_BASE_URL}/api/bridges/${bridgeId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Bridge status update failed");
  }

  return response.json();
}