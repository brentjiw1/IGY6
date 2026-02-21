const PRESENCE_TTL_MS = 2 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = 15000;

const state = {
  sessionId: localStorage.getItem('igy6.sessionId') || crypto.randomUUID(),
  programs: JSON.parse(localStorage.getItem('igy6.programs') || '[]'),
  activeProgram: localStorage.getItem('igy6.activeProgram') || '',
  selectedLatLng: null,
  alerts: JSON.parse(localStorage.getItem('igy6.alerts') || '[]'),
  lastSeenAlertAt: Number(localStorage.getItem('igy6.lastSeenAlertAt') || 0)
};

localStorage.setItem('igy6.sessionId', state.sessionId);

const areaForm = document.getElementById('areaForm');
const areaNameInput = document.getElementById('areaName');
const areaSummary = document.getElementById('areaSummary');
const areaList = document.getElementById('areaList');

const alertForm = document.getElementById('alertForm');
const alertType = document.getElementById('alertType');
const helpNameInput = document.getElementById('helpName');
const details = document.getElementById('details');
const share911 = document.getElementById('share911');
const feed = document.getElementById('feed');
const locateBtn = document.getElementById('locateBtn');
const itemTemplate = document.getElementById('feedItemTemplate');
const updateAlert = document.getElementById('updateAlert');
const presencePill = document.getElementById('presencePill');

const map = L.map('map', { zoomControl: true }).setView([39.5, -98.35], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let selectionMarker;
const alertLayer = L.layerGroup().addTo(map);

function typeLabel(type) {
  return ({
    fire: '🔥 Fire',
    burglary: '🚨 Burglary',
    medical: '🩺 Medical',
    emergency: '⚠️ Emergency'
  })[type] || type;
}

function savePrograms() {
  localStorage.setItem('igy6.programs', JSON.stringify(state.programs));
  localStorage.setItem('igy6.activeProgram', state.activeProgram);
}

function saveAlerts() {
  localStorage.setItem('igy6.alerts', JSON.stringify(state.alerts));
}

function alertsForActiveProgram() {
  if (!state.activeProgram) return [];
  return state.alerts.filter((alert) => alert.programName === state.activeProgram);
}

function activeUsersCount() {
  if (!state.activeProgram) return 0;

  const presence = JSON.parse(localStorage.getItem('igy6.presence') || '{}');
  const programPresence = presence[state.activeProgram] || {};
  const now = Date.now();

  return Object.values(programPresence).filter((seenAt) => now - Number(seenAt) <= PRESENCE_TTL_MS).length;
}

function updatePresence() {
  if (!state.activeProgram) {
    presencePill.textContent = '👥 Active here: 0';
    return;
  }

  const presence = JSON.parse(localStorage.getItem('igy6.presence') || '{}');
  const now = Date.now();
  const programPresence = presence[state.activeProgram] || {};

  Object.keys(programPresence).forEach((sid) => {
    if (now - Number(programPresence[sid]) > PRESENCE_TTL_MS) {
      delete programPresence[sid];
    }
  });

  programPresence[state.sessionId] = now;
  presence[state.activeProgram] = programPresence;
  localStorage.setItem('igy6.presence', JSON.stringify(presence));

  presencePill.textContent = `👥 Active here: ${activeUsersCount()}`;
}

function renderPrograms() {
  areaList.innerHTML = '';

  if (!state.programs.length) {
    const li = document.createElement('li');
    li.className = 'feed-item';
    li.textContent = 'No programs yet. Create one to get started.';
    areaList.appendChild(li);
    return;
  }

  state.programs.forEach((programName) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `program-item ${programName === state.activeProgram ? 'active' : ''}`;
    btn.textContent = programName;
    btn.addEventListener('click', () => {
      state.activeProgram = programName;
      savePrograms();
      renderPrograms();
      renderAreaSummary();
      renderAlerts();
      updatePresence();
    });
    li.appendChild(btn);
    areaList.appendChild(li);
  });
}

function renderAreaSummary() {
  if (!state.activeProgram) {
    areaSummary.classList.add('hidden');
    areaSummary.textContent = '';
    return;
  }

  areaSummary.classList.remove('hidden');
  areaSummary.textContent = `Active program: ${state.activeProgram}. You are anonymous until you choose to share your name in a help alert.`;
}

function showFlashingUpdate(message) {
  updateAlert.textContent = `🔴 ${message}`;
  updateAlert.classList.remove('hidden');
  window.setTimeout(() => updateAlert.classList.add('hidden'), 6500);
}

function renderAlerts() {
  feed.innerHTML = '';
  alertLayer.clearLayers();

  const activeAlerts = alertsForActiveProgram().sort((a, b) => b.createdAt - a.createdAt);
  const latest = activeAlerts[0];

  if (latest && latest.createdAt > state.lastSeenAlertAt && latest.createdBy !== state.sessionId) {
    showFlashingUpdate(`New ${typeLabel(latest.type)} update posted in ${state.activeProgram}`);
  }

  if (latest) {
    state.lastSeenAlertAt = Math.max(state.lastSeenAlertAt, latest.createdAt);
    localStorage.setItem('igy6.lastSeenAlertAt', String(state.lastSeenAlertAt));
  }

  if (!state.activeProgram) {
    const li = document.createElement('li');
    li.className = 'feed-item';
    li.textContent = 'Select or create a watch program to view local alerts.';
    feed.appendChild(li);
    return;
  }

  if (!activeAlerts.length) {
    const li = document.createElement('li');
    li.className = 'feed-item';
    li.textContent = 'No alerts yet in this watch program.';
    feed.appendChild(li);
    return;
  }

  activeAlerts.forEach((alert) => {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.badge').textContent = typeLabel(alert.type);
    node.querySelector('time').textContent = new Date(alert.createdAt).toLocaleString();
    node.querySelector('.feed-meta').textContent = `${alert.senderName} • ${alert.programName} • ${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}${alert.escalate911 ? ' • 911 suggested' : ''}`;
    node.querySelector('.feed-details').textContent = alert.details || 'No additional details provided.';
    feed.appendChild(node);

    const marker = L.marker([alert.lat, alert.lng]).addTo(alertLayer);
    marker.bindPopup(`<strong>${typeLabel(alert.type)}</strong><br>${alert.details || ''}<br><small>${alert.senderName}</small>`);
  });
}

function handleLocate() {
  if (!navigator.geolocation) {
    alert('GPS is not available in this browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      state.selectedLatLng = { lat: latitude, lng: longitude };
      map.setView([latitude, longitude], 16);
      if (selectionMarker) selectionMarker.remove();
      selectionMarker = L.marker([latitude, longitude]).addTo(map).bindPopup('Your selected alert location').openPopup();
    },
    () => alert('Could not access your location. You can still pin manually on the map.'),
    { enableHighAccuracy: true, timeout: 9000 }
  );
}

map.on('click', (e) => {
  state.selectedLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
  if (selectionMarker) selectionMarker.remove();
  selectionMarker = L.marker(e.latlng).addTo(map).bindPopup('Pinned alert location').openPopup();
});

areaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const programName = areaNameInput.value.trim();
  if (!programName) return;

  if (!state.programs.includes(programName)) {
    state.programs.push(programName);
  }

  state.activeProgram = programName;
  savePrograms();
  areaForm.reset();
  renderPrograms();
  renderAreaSummary();
  renderAlerts();
  updatePresence();
});

alertForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!state.activeProgram) {
    alert('Please select a watch program first.');
    return;
  }

  if (!state.selectedLatLng) {
    alert('Pin a location on the map or use GPS first.');
    return;
  }

  const senderName = helpNameInput.value.trim() || 'Anonymous Neighbor';
  const alertRecord = {
    programName: state.activeProgram,
    senderName,
    type: alertType.value,
    details: details.value.trim(),
    escalate911: share911.checked,
    lat: state.selectedLatLng.lat,
    lng: state.selectedLatLng.lng,
    createdAt: Date.now(),
    createdBy: state.sessionId
  };

  state.alerts.push(alertRecord);
  saveAlerts();
  renderAlerts();
  showFlashingUpdate(`New ${typeLabel(alertRecord.type)} posted in ${state.activeProgram}`);
  alertForm.reset();

  if (alertRecord.escalate911) {
    const shouldCall = confirm('Critical alert posted. Do you want to call 911 now?');
    if (shouldCall) {
      window.location.href = 'tel:911';
    }
  }
});

window.addEventListener('storage', (event) => {
  if (event.key === 'igy6.alerts') {
    state.alerts = JSON.parse(localStorage.getItem('igy6.alerts') || '[]');
    renderAlerts();
  }

  if (event.key === 'igy6.presence') {
    updatePresence();
  }
});

locateBtn.addEventListener('click', handleLocate);

(function init() {
  if (!state.activeProgram && state.programs.length) {
    state.activeProgram = state.programs[0];
    savePrograms();
  }

  renderPrograms();
  renderAreaSummary();
  renderAlerts();

  if (state.activeProgram) {
    map.setView([37.7749, -122.4194], 12);
  }

  updatePresence();
  window.setInterval(updatePresence, PRESENCE_HEARTBEAT_MS);
})();
