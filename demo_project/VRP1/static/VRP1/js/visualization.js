// // Front-end gọi API /api/solve/, nhận kết quả và vẽ route

// // let map, polylines = [];
// let map;
// let simulationRunning = false;
// let simulationSpeed = 1.0;
// let vehicles = [];
// let routes = [];
// let depotMarker = null;
// let agentMarkers = [];
// let polylines = {
//   depotToAgent: [],
//   agentToAgent: []
// };

// const VEHICLE_TYPES = {
//   'to':          { capacity: 10000, costPerKm: 30000 },
//   'trung-binh':{ capacity: 5000,  costPerKm: 20000 },
//   'nho':         { capacity: 2000,  costPerKm: 15000 }
// };

// document.addEventListener('DOMContentLoaded', () => {
//   initMap(); //initializeMap
//   setupControls(); //setupEventListeners
// });

// function initMap() {
//   map = L.map('map').setView([21.0278, 105.8342], 13);
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19,
//     attribution: '&copy; OpenStreetMap contributors'
//   }).addTo(map);
// }

// function setupControls() { //setupEventListeners
//   document.getElementById('startSimulation').addEventListener('click', startSimulation);
//   document.getElementById('pauseSimulation').addEventListener('click', () => clearInterval(window.simInterval));
//   document.getElementById('resetSimulation').addEventListener('click', resetSimulation);
//   document.getElementById('backToResults').addEventListener('click', () => window.location.href = '/result/');
//   document.getElementById('speedSlider').addEventListener('input', e => {
//     const v = e.target.value;
//     document.getElementById('speedValue').textContent = v + 'x';
//   });
// }

// async function startSimulation() {
//   resetSimulation();
//   const payload = buildPayload();
//   const solver = document.getElementById('solverMethod').value;
//   payload.solverMethod = document.getElementById('solverMethod').value;

//   try {
//     const resp = await fetch('/api/solve/', {
//       method: 'POST', headers: {'Content-Type':'application/json'},
//       body: JSON.stringify(payload)
//     });
//     const data = await resp.json();
//     renderInfo(payload, data);
//     renderRoutes(data.routes);
//     if (data.infeasibleAgents && data.infeasibleAgents.length) {
//       document.getElementById('notification').textContent =
//         'Không thể giao: ' + data.infeasibleAgents.join(', ');
//     }
//   } catch (e) {
//     console.error(e);
//     document.getElementById('notification').textContent = 'Lỗi server khi giải bài toán';
//   }
// }


// function buildPayload() {
//   const coordsData = JSON.parse(localStorage.getItem('vrptw_coords') || '{}');
//   const orderData  = JSON.parse(localStorage.getItem('data_demo') || '[]');
//   const vehicleType = localStorage.getItem('selected_vehicle_type');
//   const vehicleCount= parseInt(localStorage.getItem('selected_vehicle_count')||'1');
//   const key = vehicleType;

//   const agents = orderData.map((o,i) => ({
//     id: `agent-${i+1}`,
//     location: coordsData.agents[i],
//     demand: parseFloat(o['Khối lượng đặt hàng (kg)'] || o['Số lượng'] || 0),
//     timeWindow: {
//       start: o['Thời gian bắt đầu'],
//       end:   o['Thời gian kết thúc']
//     }
//   }));

//   return {
//     depot: coordsData.depot,
//     agents,
//     vehicle: {
//       type: vehicleType,
//       count: vehicleCount,
//       capacity: VEHICLE_TYPES[key].capacity,
//       costPerKm: VEHICLE_TYPES[key].costPerKm,
//       startTime: localStorage.getItem('vehicle_start_time'),
//       endTime:   localStorage.getItem('vehicle_end_time')
//     }
//   };
// }









// function renderInfo(request, response) {
//   document.getElementById('vehicleTypeInfo').textContent = request.vehicle.type;
//   document.getElementById('vehicleCountInfo').textContent = request.vehicle.count;
//   document.getElementById('totalStopsInfo').textContent = request.agents.length;
// }

// function renderRoutes(routes) {
//   // Xóa đường cũ
//   polylines.forEach(p=>map.removeLayer(p)); polylines = [];

//   const colors = ['#FF0000','#00AA00','#0000FF','#FF00FF','#00FFFF','#FFA500'];
//   routes.forEach((r,i) => {
//     const line = L.polyline(r.geometry, { color: colors[i%colors.length], weight: 6 }).addTo(map);
//     line.bindPopup(`Xe ${r.vehicleId}: ${r.path.join(' → ')}<br>`+
//                    `Dist: ${r.distanceKm}km, Cost: ${r.cost}đ`);
//     polylines.push(line);
//   });
//   // Fit map
//   const allCoords = routes.flatMap(r=>r.geometry);
//   map.fitBounds(L.latLngBounds(allCoords));
// }

// function resetSimulation() {
//   clearInterval(window.simInterval);
//   polylines.forEach(p=>map.removeLayer(p)); polylines = [];
//   document.getElementById('notification').textContent = '';
// }













let map;
let simulationRunning = false;
let simulationSpeed = 1.0;
let vehicles = [];
let routes = [];
let depotMarker = null;
let agentMarkers = [];
let polylines = {
  depotToAgent: [],
  agentToAgent: []
}

//Thêm các thông số cho xe
const VEHICLE_TYPES = {
  'to': {
    capacity: 10000,
    costPerKm: 30000,
    name: 'Xe tải lớn (10 tấn)',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/870/870181.png'
  },
  'trung-bình': {
    capacity: 5000,
    costPerKm: 20000,
    name: 'Xe tải vừa (5 tấn)',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3699/3699678.png'
  },
  'nho': {
    capacity: 2000,
    costPerKm: 10000,
    name: 'Xe tải nhỏ (2 tấn)',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2522/2522938.png'
  }
}

// Màu của các tuyến đường
const routeColors = [
  '#FF0000', '#00AA00', '#0000FF', '#FF00FF', '#00FFFF', '#FFA500',
  '#F054aa', '#00F4FF', '#FF9000', '#0090FF', '#008000', '#910707'
];

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupControls();
  loadInitialData();
});

function initMap() {
  map = L.map('map').setView([21.0278, 105.8342], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function setupControls() {
  document.getElementById('startSimulation').addEventListener('click', startSimulation);
  document.getElementById('pauseSimulation').addEventListener('click', pauseSimulation);
  document.getElementById('resetSimulation').addEventListener('click', resetSimulation);
  document.getElementById('backToResults').addEventListener('click', () => window.location.href = '/result/');
  
  document.getElementById('speedSlider').addEventListener('input', e => {
    simulationSpeed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = simulationSpeed + 'x';
    updateVehicleSpeeds();
  });
}

function loadInitialData() {
  try {
    const coordsData = JSON.parse(localStorage.getItem('vrptw_coords') || '{}');
    const vehicleType = localStorage.getItem('selected_vehicle_type') || 'trung-binh';
    const vehicleCount = parseInt(localStorage.getItem('selected_vehicle_count') || '1');
    
    updateInfoPanel(vehicleType, vehicleCount, coordsData);
    
    if (coordsData.depot && coordsData.agents) {
      renderMapMarkers(coordsData);
    } else {
      showNotification('Không tìm thấy dữ liệu tọa độ. Vui lòng quay lại trang nhập.');
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu:', error);
    showNotification('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.');
  }
}

function renderMapMarkers(coordsData) {
  // Xóa các marker cũ nếu có
  if (depotMarker) map.removeLayer(depotMarker);
  agentMarkers.forEach(marker => map.removeLayer(marker));
  agentMarkers = [];
  
  // Icon cho kho hàng
  const depotIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  // Icon cho đại lý
  const agentIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  // Thêm marker cho kho hàng
  depotMarker = L.marker(coordsData.depot, { icon: depotIcon })
    .addTo(map)
    .bindPopup("<strong>Kho hàng</strong>");
  
  // Thêm marker cho các đại lý
  coordsData.agents.forEach((agent, index) => {
    const marker = L.marker(agent, { icon: agentIcon })
      .addTo(map)
      .bindPopup(`<strong>Đại lý ${index + 1}</strong>`);
    agentMarkers.push(marker);
  });
  
  // Điều chỉnh view để hiển thị tất cả các điểm
  const allPoints = [coordsData.depot, ...coordsData.agents];
  const bounds = L.latLngBounds(allPoints);
  map.fitBounds(bounds);
}

function updateInfoPanel(vehicleType, vehicleCount, coordsData) {
  document.getElementById('vehicleTypeInfo').textContent = VEHICLE_TYPES[vehicleType]?.name || 'Không xác định';
  document.getElementById('vehicleCountInfo').textContent = vehicleCount;
  document.getElementById('totalStopsInfo').textContent = coordsData.agents?.length || 0;
  
  // Thêm thông tin thời gian di chuyển dự kiến
  const travelTimeElement = document.getElementById('travelTimeInfo');
  if (travelTimeElement) {
    travelTimeElement.textContent = 'Chưa có dữ liệu';
  }
}

async function startSimulation() {
  resetSimulation();
  
  const payload = buildPayload();
  const solverMethod = document.getElementById('solverMethod').value;
  payload.solverMethod = solverMethod;

  try {
    showNotification('Đang tính toán tuyến đường tối ưu...');
    
    const resp = await fetch('/api/solve/', {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    const data = await resp.json();
    
    if (!data.routes || data.routes.length === 0) {
      showNotification('Không tìm thấy tuyến đường phù hợp.');
      return;
    }
    
    renderInfo(payload, data);
    renderRoutes(data.routes);
    
    if (data.infeasibleAgents && data.infeasibleAgents.length) {
      showNotification('Không thể giao: ' + data.infeasibleAgents.join(', '));
    } else {
      showNotification('Tìm thấy tuyến đường tối ưu. Bắt đầu mô phỏng...');
      startVehicleSimulation(data.routes, payload.vehicle.type, payload.vehicle.count);
    }
  } catch (e) {
    console.error(e);
    showNotification('Lỗi server khi giải bài toán');
  }
}

function renderRoutes(routes) {
  // Xóa tất cả polyline cũ
  if (polylines.depotToAgent) {
    polylines.depotToAgent.forEach(p => map.removeLayer(p));
    polylines.depotToAgent = [];
  }
  
  if (polylines.agentToAgent) {
    polylines.agentToAgent.forEach(p => map.removeLayer(p));
    polylines.agentToAgent = [];
  }

  routes.forEach((route, i) => {
    const color = routeColors[i % routeColors.length];
    const polyline = L.polyline(route.geometry, { 
      color: color, 
      weight: 5,
      opacity: 0.7
    }).addTo(map);
    
    polyline.bindPopup(`
      <strong>Xe ${route.vehicleId}</strong><br>
      Tuyến: ${route.path.join(' → ')}<br>
      Khoảng cách: ${route.distanceKm.toFixed(2)} km<br>
      Chi phí: ${route.cost.toLocaleString('vi-VN')} đồng
    `);
    
    polylines.depotToAgent.push(polyline);
  });
  
  // Fit bản đồ để thấy toàn bộ tuyến đường
  const allCoords = routes.flatMap(r => r.geometry);
  if (allCoords.length > 0) {
    map.fitBounds(L.latLngBounds(allCoords));
  }
}

function startVehicleSimulation(routes, vehicleType, vehicleCount) {
  simulationRunning = true;
  vehicles = [];
  
  // Tạo xe cho mỗi tuyến đường, tối đa là vehicleCount
  const vehiclesToCreate = Math.min(routes.length, vehicleCount);
  
  for (let i = 0; i < vehiclesToCreate; i++) {
    const route = routes[i];
    if (!route || !route.geometry || route.geometry.length === 0) continue;
    
    const vehicleIcon = L.icon({
      iconUrl: VEHICLE_TYPES[vehicleType]?.iconUrl || 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    const startPoint = route.geometry[0];
    const vehicle = {
      id: `vehicle-${i+1}`,
      routeIndex: i,
      progress: 0,
      speed: simulationSpeed,
      marker: L.marker(startPoint, {icon: vehicleIcon})
        .addTo(map)
        .bindTooltip(`Xe ${i+1} (${VEHICLE_TYPES[vehicleType]?.name})`)
    };
    
    vehicles.push(vehicle);
  }
  
  // Bắt đầu vòng lặp mô phỏng
  window.simInterval = setInterval(() => {
    if (!simulationRunning) return;
    updateVehiclePositions(routes);
  }, 50);
}

function updateVehiclePositions(routes) {
  vehicles.forEach(vehicle => {
    const route = routes[vehicle.routeIndex];
    if (!route || !route.geometry || route.geometry.length < 2) return;
    
    // Cập nhật tiến độ
    vehicle.progress += 0.0003 * vehicle.speed;
    
    if (vehicle.progress >= 1) {
      // Hoàn thành tuyến đường, có thể quay về kho hoặc dừng lại
      clearInterval(window.simInterval);
      simulationRunning = false;
      showNotification('Mô phỏng hoàn tất');
      return;
    }
    
    // Tính vị trí hiện tại dựa trên tiến độ
    const currentPosition = getPositionAlongRoute(route.geometry, vehicle.progress);
    
    // Cập nhật vị trí marker
    if (vehicle.marker) {
      vehicle.marker.setLatLng(currentPosition);
      
      // Tính góc quay
      const nextPos = getPositionAlongRoute(route.geometry, Math.min(1, vehicle.progress + 0.01));
      const angle = getAngle(currentPosition, nextPos);
      vehicle.marker.setRotationAngle && vehicle.marker.setRotationAngle(angle);
    }
    
    // Cập nhật thông tin thời gian di chuyển
    const averageSpeed = 50; // km/h
    const totalDistance = route.distanceKm;
    const timeHours = totalDistance / averageSpeed;
    const remainingTime = timeHours * (1 - vehicle.progress);
    
    document.getElementById('travelTimeInfo').textContent = 
      `${(remainingTime * 60).toFixed(1)} phút còn lại`;
  });
}

function getPositionAlongRoute(coordinates, progress) {
  if (!coordinates || coordinates.length === 0) return null;
  if (coordinates.length === 1) return coordinates[0];
  
  const totalSegments = coordinates.length - 1;
  const targetSegment = Math.floor(progress * totalSegments);
  const segmentProgress = (progress * totalSegments) % 1;
  
  const start = coordinates[targetSegment];
  const end = coordinates[targetSegment + 1];
  
  // Interpolate between start and end
  return [
    start[0] + (end[0] - start[0]) * segmentProgress,
    start[1] + (end[1] - start[1]) * segmentProgress
  ];
}

function getAngle(point1, point2) {
  return Math.atan2(point2[1] - point1[1], point2[0] - point1[0]) * (180 / Math.PI);
}

function pauseSimulation() {
  simulationRunning = false;
  showNotification('Đã tạm dừng mô phỏng');
}

function resetSimulation() {
  clearInterval(window.simInterval);
  simulationRunning = false;
  
  // Xóa các xe
  vehicles.forEach(vehicle => {
    if (vehicle.marker) map.removeLayer(vehicle.marker);
  });
  vehicles = [];
  
  document.getElementById('travelTimeInfo').textContent = 'Chưa có dữ liệu';
  showNotification('');
}

function updateVehicleSpeeds() {
  vehicles.forEach(vehicle => {
    vehicle.speed = simulationSpeed;
  });
}

function showNotification(message) {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.textContent = message;
    notification.style.display = message ? 'block' : 'none';
  }
}

function buildPayload() {
  const coordsData = JSON.parse(localStorage.getItem('vrptw_coords') || '{}');
  const orderData = JSON.parse(localStorage.getItem('data_demo') || '[]');
  const vehicleType = localStorage.getItem('selected_vehicle_type') || 'trung-binh';
  const vehicleCount = parseInt(localStorage.getItem('selected_vehicle_count') || '1');
  
  const agents = orderData.map((o, i) => ({
    id: `agent-${i+1}`,
    location: coordsData.agents[i],
    demand: parseFloat(o['Khối lượng đặt hàng (kg)'] || o['Số lượng'] || 0),
    timeWindow: {
      start: o['Thời gian bắt đầu'],
      end: o['Thời gian kết thúc']
    }
  }));

  return {
    depot: coordsData.depot,
    agents,
    vehicle: {
      type: vehicleType,
      count: vehicleCount,
      capacity: VEHICLE_TYPES[vehicleType].capacity,
      costPerKm: VEHICLE_TYPES[vehicleType].costPerKm,
      startTime: localStorage.getItem('vehicle_start_time'),
      endTime: localStorage.getItem('vehicle_end_time')
    }
  };
}