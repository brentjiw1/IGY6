const state = {
  areaName: localStorage.getItem('igy6.areaName') || '',
  nickname: localStorage.getItem('igy6.nickname') || 'Anonymous Neighbor',
  selectedLatLng: null,
  alerts: JSON.parse(localStorage.getItem('igy6.alerts') || '[]')
};

const areaForm = document.getElementById('areaForm');
const areaNameInput = document.getElementById('areaName');
const nicknameInput = document.getElementById('nickname');
const areaSummary = document.getElementById('areaSummary');
const alertForm = document.getElementById('alertForm');
const alertType = document.getElementById('alertType');
const details = document.getElementById('details');
const share911 = document.getElementById('share911');
const feed = document.getElementById('feed');
const locateBtn = document.getElementById('locateBtn');
const itemTemplate = document.getElementById('feedItemTemplate');

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

function renderAreaSummary() {
  if (!state.areaName) {
    areaSummary.classList.add('hidden');
    areaSummary.textContent = '';
    return;
  }

  areaSummary.classList.remove('hidden');
  areaSummary.textContent = `Connected to ${state.areaName} as ${state.nickname || 'Anonymous Neighbor'}.`;
}

function renderAlerts() {
  feed.innerHTML = '';
  alertLayer.clearLayers();

  if (!state.alerts.length) {
    const li = document.createElement('li');
    li.className = 'feed-item';
    li.textContent = 'No alerts yet in this watch area.';
    feed.appendChild(li);
    return;
  }

  state.alerts
    .filter((alert) => !state.areaName || alert.areaName === state.areaName)
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((alert) => {
      const node = itemTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector('.badge').textContent = typeLabel(alert.type);
      node.querySelector('time').textContent = new Date(alert.createdAt).toLocaleString();
      node.querySelector('.feed-meta').textContent = `${alert.nickname} • ${alert.areaName} • ${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}${alert.escalate911 ? ' • 911 suggested' : ''}`;
      node.querySelector('.feed-details').textContent = alert.details || 'No additional details provided.';
      feed.appendChild(node);

      const marker = L.marker([alert.lat, alert.lng]).addTo(alertLayer);
      marker.bindPopup(`<strong>${typeLabel(alert.type)}</strong><br>${alert.details || ''}<br><small>${alert.nickname}</small>`);
    });
}

function saveAlerts() {
  localStorage.setItem('igy6.alerts', JSON.stringify(state.alerts));
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
  state.areaName = areaNameInput.value.trim();
  state.nickname = nicknameInput.value.trim() || 'Anonymous Neighbor';
  localStorage.setItem('igy6.areaName', state.areaName);
  localStorage.setItem('igy6.nickname', state.nickname);
  renderAreaSummary();
  renderAlerts();
});

alertForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!state.areaName) {
    alert('Please enter a watch area first.');
    return;
  }

  if (!state.selectedLatLng) {
    alert('Pin a location on the map or use GPS first.');
    return;
  }

  const alertRecord = {
    areaName: state.areaName,
    nickname: state.nickname || 'Anonymous Neighbor',
    type: alertType.value,
    details: details.value.trim(),
    escalate911: share911.checked,
    lat: state.selectedLatLng.lat,
    lng: state.selectedLatLng.lng,
    createdAt: Date.now()
  };

  state.alerts.push(alertRecord);
  saveAlerts();
  renderAlerts();
  alertForm.reset();

  if (alertRecord.escalate911) {
    const shouldCall = confirm('Critical alert posted. Do you want to call 911 now?');
    if (shouldCall) {
      window.location.href = 'tel:911';
    }
  }
});

locateBtn.addEventListener('click', handleLocate);

(function init() {
  areaNameInput.value = state.areaName;
  nicknameInput.value = state.nickname === 'Anonymous Neighbor' ? '' : state.nickname;
  renderAreaSummary();
  renderAlerts();
  if (state.areaName) {
    map.setView([37.7749, -122.4194], 12);
  }
})();
