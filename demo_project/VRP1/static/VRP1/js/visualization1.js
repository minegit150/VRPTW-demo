// Front-end gọi API /api/solve/, nhận kết quả và vẽ route

let map;
let simulationRunning = false;
let simulationSpeed = 1.0;
let vehicles = []; // Đảm bảo biến này được khai báo ở phạm vi toàn cục
let routes = [];
let depotMarker = null;
let agentMarkers = [];
let polylines = [];

// Thông tin về loại xe
const VEHICLE_TYPES = {
  'to':          { capacity: 10000, costPerKm: 30000, name: 'Xe tải lớn (10 tấn)', iconUrl: 'https://cdn-icons-png.flaticon.com/128/3774/3774290.png' },
  'trung-binh': { capacity: 5000,  costPerKm: 20000, name: 'Xe tải vừa (5 tấn)', iconUrl: 'https://cdn-icons-png.flaticon.com/128/3774/3774288.png' },
  'nho':         { capacity: 2000,  costPerKm: 15000, name: 'Xe tải nhỏ (2 tấn)', iconUrl: 'https://cdn-icons-png.flaticon.com/128/3774/3774257.png' }
};

// Màu sắc cho các tuyến đường
const ROUTE_COLORS = ['#FF0000','#00AA00','#0000FF','#FF00FF','#00FFFF','#FFA500', '#6600FF', '#FF6600'];

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
    
    // Kiểm tra nếu có dữ liệu tọa độ
    if (coordsData.depot && coordsData.agents && coordsData.agents.length > 0) {
      renderMapMarkers(coordsData);
      
      // Hiển thị thông tin cơ bản
      const vehicleType = localStorage.getItem('selected_vehicle_type') || 'trung-binh';
      const vehicleCount = parseInt(localStorage.getItem('selected_vehicle_count') || '1');
      updateInfoPanel(vehicleType, vehicleCount, coordsData);
    } else {
      showNotification('Không tìm thấy dữ liệu tọa độ. Vui lòng quay lại trang nhập liệu.');
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu:', error);
    showNotification('Đã xảy ra lỗi khi tải dữ liệu.');
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
  
  // Thêm thông tin thời gian di chuyển dự kiến nếu có phần tử này
  const travelTimeElement = document.getElementById('travelTimeInfo');
  if (travelTimeElement) {
    travelTimeElement.textContent = 'Chưa có dữ liệu';
  }
}

async function startSimulation() {
  // Xóa các tuyến đường và xe cũ trước khi bắt đầu
  clearSimulation();
  
  const payload = buildPayload();
  // Lấy phương pháp giải từ giao diện
  const solverMethod = document.getElementById('solverMethod').value;
  payload.solverMethod = solverMethod;

  showNotification('Đang tính toán tuyến đường tối ưu bằng phương pháp ' + solverMethod + '...');

  try {
    const resp = await fetch('/api/solve/', {
      method: 'POST', 
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    
    const data = await resp.json();
    
    if (!data.routes || data.routes.length === 0) {
      showNotification('Không tìm thấy tuyến đường phù hợp.');
      return;
    }
    
    // Lưu routes để sử dụng trong mô phỏng
    routes = data.routes;
    
    // Hiển thị thông tin và vẽ tuyến đường
    renderInfo(payload, data);
    renderRoutes(data.routes);
    
    // Bắt đầu mô phỏng xe di chuyển
    startVehicleSimulation(data.routes, payload.vehicle.type, payload.vehicle.count);
    
    if (data.infeasibleAgents && data.infeasibleAgents.length) {
      showNotification('Không thể giao: ' + data.infeasibleAgents.join(', '));
    } else {
      showNotification('Đã tìm thấy tuyến đường tối ưu.');
    }
  } catch (e) {
    console.error('Lỗi khi gọi API:', e);
    showNotification('Lỗi server khi giải bài toán');
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

function renderInfo(request, response) {
  // Hiển thị thông tin từ kết quả
  document.getElementById('vehicleTypeInfo').textContent = VEHICLE_TYPES[request.vehicle.type]?.name || request.vehicle.type;
  document.getElementById('vehicleCountInfo').textContent = request.vehicle.count;
  document.getElementById('totalStopsInfo').textContent = request.agents.length;
  
  // Hiển thị thông tin thêm về tổng chi phí, khoảng cách nếu có phần tử UI tương ứng
  if (response.totalCost !== undefined) {
    const totalCostElement = document.getElementById('totalCostInfo');
    if (totalCostElement) {
      totalCostElement.textContent = new Intl.NumberFormat('vi-VN').format(response.totalCost) + ' đ';
    }
  }
  
  if (response.totalDistance !== undefined) {
    const totalDistanceElement = document.getElementById('totalDistanceInfo');
    if (totalDistanceElement) {
      totalDistanceElement.textContent = response.totalDistance.toFixed(2) + ' km';
    }
  }
}

function renderRoutes(routes) {
  // Xóa các polyline cũ
  polylines.forEach(p => map.removeLayer(p));
  polylines = [];

  // Vẽ tuyến đường mới
  routes.forEach((route, i) => {
    const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
    
    if (!route.geometry || route.geometry.length < 2) {
      console.warn('Tuyến đường không có đủ điểm:', route);
      return;
    }
    
    const polyline = L.polyline(route.geometry, { 
      color: color, 
      weight: 5,
      opacity: 0.8
    }).addTo(map);
    
    // Thêm tooltip cho tuyến đường
    polyline.bindTooltip(`Xe ${route.vehicleId || (i+1)}: ${route.distanceKm.toFixed(2)}km`, {
      permanent: false,
      direction: 'auto'
    });
    
    // Thêm popup cho tuyến đường
    polyline.bindPopup(`
      <strong>Xe ${route.vehicleId || (i+1)}</strong><br>
      Tuyến: ${route.path.join(' → ')}<br>
      Khoảng cách: ${route.distanceKm.toFixed(2)} km<br>
      Chi phí: ${new Intl.NumberFormat('vi-VN').format(route.cost)} đ
    `);
    
    polylines.push(polyline);
  });
  
  // Fit bản đồ để hiển thị tất cả các tuyến đường
  const allCoords = routes.flatMap(r => r.geometry);
  if (allCoords.length > 0) {
    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds);
  }
}

function startVehicleSimulation(routes, vehicleType, vehicleCount) {
  simulationRunning = true;
  
  // Tạo xe cho mỗi tuyến đường, tối đa là vehicleCount
  const vehiclesToCreate = Math.min(routes.length, vehicleCount);
  
  for (let i = 0; i < vehiclesToCreate; i++) {
    const route = routes[i];
    if (!route || !route.geometry || route.geometry.length === 0) continue;
    
    // Tạo icon cho xe
    const vehicleIcon = L.icon({
      iconUrl: VEHICLE_TYPES[vehicleType]?.iconUrl || 'https://cdn-icons-png.flaticon.com/128/3774/3774288.png',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    // Đặt xe ở điểm bắt đầu (thường là kho)
    const startPoint = route.geometry[0];
    
    const vehicle = {
      id: route.vehicleId || `vehicle-${i+1}`,
      routeIndex: i,
      progress: 0,
      speed: simulationSpeed,
      marker: L.marker(startPoint, {icon: vehicleIcon})
        .addTo(map)
        .bindTooltip(`Xe ${route.vehicleId || (i+1)}`)
    };
    
    vehicles.push(vehicle);
  }
  
  // Bắt đầu vòng lặp mô phỏng
  window.simInterval = setInterval(() => {
    if (!simulationRunning) return;
    updateVehiclePositions();
  }, 50);
}

function updateVehiclePositions() {
  let allCompleted = true;
  
  vehicles.forEach(vehicle => {
    const route = routes[vehicle.routeIndex];
    if (!route || !route.geometry || route.geometry.length < 2) return;
    
    // Nếu chưa hoàn thành, đánh dấu rằng không phải tất cả đều hoàn thành
    if (vehicle.progress < 1) allCompleted = false;
    
    // Cập nhật tiến độ
    vehicle.progress += 0.0003 * vehicle.speed;
    
    if (vehicle.progress >= 1) {
      // Hoàn thành tuyến đường, dừng xe
      vehicle.progress = 1;
      return;
    }
    
    // Tính vị trí hiện tại dựa trên tiến độ
    const currentPosition = getPositionAlongRoute(route.geometry, vehicle.progress);
    
    // Cập nhật vị trí marker
    if (vehicle.marker && currentPosition) {
      vehicle.marker.setLatLng(currentPosition);
      
      // Tính góc quay cho xe (nếu có)
      const nextPos = getPositionAlongRoute(route.geometry, Math.min(1, vehicle.progress + 0.01));
      if (nextPos) {
        const angle = getAngle(currentPosition, nextPos);
        // Nếu marker có hàm setRotationAngle, sử dụng nó
        if (typeof vehicle.marker.setRotationAngle === 'function') {
          vehicle.marker.setRotationAngle(angle);
        }
      }
    }
  });
  
  // Nếu tất cả xe đều hoàn thành, dừng mô phỏng
  if (allCompleted) {
    clearInterval(window.simInterval);
    simulationRunning = false;
    showNotification('Mô phỏng hoàn tất');
  }
  
  // Cập nhật thông tin thời gian di chuyển (nếu có phần tử UI tương ứng)
  const travelTimeElement = document.getElementById('travelTimeInfo');
  if (travelTimeElement) {
    // Tính thời gian còn lại dựa trên tiến độ trung bình
    const avgProgress = vehicles.reduce((sum, v) => sum + v.progress, 0) / vehicles.length;
    const avgSpeed = 50; // km/h
    const totalDistance = routes.reduce((sum, r) => sum + r.distanceKm, 0) / routes.length;
    const timeHours = totalDistance / avgSpeed;
    const remainingTime = timeHours * (1 - avgProgress);
    
    travelTimeElement.textContent = `${(remainingTime * 60).toFixed(1)} phút còn lại`;
  }
}

function getPositionAlongRoute(coordinates, progress) {
  if (!coordinates || coordinates.length === 0) return null;
  if (coordinates.length === 1) return coordinates[0];
  
  const totalSegments = coordinates.length - 1;
  const targetSegment = Math.floor(progress * totalSegments);
  const segmentProgress = (progress * totalSegments) % 1;
  
  if (targetSegment >= totalSegments) return coordinates[totalSegments];
  
  const start = coordinates[targetSegment];
  const end = coordinates[targetSegment + 1];
  
  // Nội suy tuyến tính giữa điểm bắt đầu và kết thúc
  return [
    start[0] + (end[0] - start[0]) * segmentProgress,
    start[1] + (end[1] - start[1]) * segmentProgress
  ];
}

function getAngle(point1, point2) {
  const dx = point2[1] - point1[1];
  const dy = point2[0] - point1[0];
  return Math.atan2(dx, dy) * (180 / Math.PI);
}

function pauseSimulation() {
  simulationRunning = false;
  showNotification('Đã tạm dừng mô phỏng');
}

function resetSimulation() {
  clearSimulation();
  showNotification('Đã reset mô phỏng');
}

function clearSimulation() {
  // Xóa interval nếu đang chạy
  if (window.simInterval) {
    clearInterval(window.simInterval);
  }
  
  simulationRunning = false;
  
  // Xóa tất cả marker của xe
  if (vehicles && vehicles.length) {
    vehicles.forEach(vehicle => {
      if (vehicle.marker) {
        map.removeLayer(vehicle.marker);
      }
    });
  }
  
  // Reset mảng xe
  vehicles = [];
  
  // Reset thông tin thời gian di chuyển
  const travelTimeElement = document.getElementById('travelTimeInfo');
  if (travelTimeElement) {
    travelTimeElement.textContent = 'Chưa có dữ liệu';
  }
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