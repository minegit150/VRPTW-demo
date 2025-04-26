/**
 * Mô phỏng tuyến đường vận chuyển
 * Hiển thị xe di chuyển theo các tuyến đường đã tính toán
 */

// Thiết lập biến toàn cục
let map;
let simulationRunning = false;
let simulationSpeed = 1.0;
let vehicles = [];
let routes = [];
let depotMarker = null;
let agentMarkers = [];
let routePolylines = {
  depotToAgent: [],
  agentToAgent: []
};

// Biến lưu trữ thông tin mô phỏng
const vehicleIcons = {
  'to': 'https://cdn-icons-png.flaticon.com/128/3774/3774290.png',
  'trung-binh': 'https://cdn-icons-png.flaticon.com/128/3774/3774288.png',
  'nho': 'https://cdn-icons-png.flaticon.com/128/3774/3774257.png'
};

const vehicleNames = {
  'to': 'Xe tải lớn (10 tấn)',
  'trung-binh': 'Xe tải vừa (5 tấn)',
  'nho': 'Xe tải nhỏ (2 tấn)'
};

// Màu của các tuyến
const routeColors = {
  depotToAgent: ["#FF0000", "#00AA00", "#0000FF", "#000000", "#FFFF00", "#00FFFF", "#FF6600", "#6600FF"],
  agentToAgent: ["#F054aa", "#00F4FF", "#FF9000", "#0090FF", "#008000", "#910707"]
};

// Khởi tạo khi trang đã tải xong
document.addEventListener('DOMContentLoaded', function() {
  initializeMap();
  setupEventListeners();
  loadSimulationData();
});

// Khởi tạo bản đồ
function initializeMap() {
  // Tạo bản đồ mặc định ở Hà Nội
  map = L.map('map').setView([21.0278, 105.8342], 13);
  
  // Thêm tile layer từ OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Thiết lập các event listener
function setupEventListeners() {
  // Điều khiển mô phỏng
  document.getElementById('startSimulation').addEventListener('click', startSimulation);
  document.getElementById('pauseSimulation').addEventListener('click', pauseSimulation);
  document.getElementById('resetSimulation').addEventListener('click', resetSimulation);
  
  // Điều chỉnh tốc độ
  document.getElementById('speedSlider').addEventListener('input', function(e) {
    simulationSpeed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = simulationSpeed + 'x';
    updateVehicleSpeeds();
  });
  
  // Quay lại trang kết quả
  document.getElementById('backToResults').addEventListener('click', function() {
    window.location.href = '/result/';
  });
}

// Load dữ liệu cho mô phỏng từ localStorage
function loadSimulationData() {
  try {
    // Lấy dữ liệu từ localStorage
    const coordsData = JSON.parse(localStorage.getItem('vrptw_coords') || '{}');
    const vehicleData = {
      type: localStorage.getItem('selected_vehicle_type') || 'trung-binh',
      count: parseInt(localStorage.getItem('selected_vehicle_count') || '1')
    };
    
    // Cập nhật thông tin hiển thị
    updateSimulationInfo(coordsData, vehicleData);
    
    // Vẽ các điểm trên bản đồ
    if (coordsData.depot && coordsData.agents) {
      renderMapMarkers(coordsData);
      loadRouteData(coordsData);
    } else {
      showError("Không tìm thấy dữ liệu tọa độ. Vui lòng quay lại trang nhập.");
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu:", error);
    showError("Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.");
  }
}

// Cập nhật thông tin mô phỏng trong panel
function updateSimulationInfo(coordsData, vehicleData) {
  const vehicleTypeInfo = document.getElementById('vehicleTypeInfo');
  const vehicleCountInfo = document.getElementById('vehicleCountInfo');
  const totalStopsInfo = document.getElementById('totalStopsInfo');
  
  vehicleTypeInfo.textContent = vehicleNames[vehicleData.type] || 'Không xác định';
  vehicleCountInfo.textContent = vehicleData.count || '1';
  
  const totalAgents = coordsData.agents ? coordsData.agents.length : 0;
  totalStopsInfo.textContent = totalAgents;
}

// Hiển thị lỗi trong panel điều khiển
function showError(message) {
  const infoBox = document.querySelector('.info-box');
  infoBox.style.backgroundColor = '#FEE2E2';
  infoBox.style.borderColor = '#FCA5A5';
  infoBox.style.color = '#B91C1C';
  infoBox.innerHTML = `<div class="info-item">${message}</div>`;
}

// Vẽ các marker trên bản đồ
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

// Tải dữ liệu tuyến đường
async function loadRouteData(coordsData) {
  try {
    // Xóa các tuyến cũ nếu có
    routePolylines.depotToAgent.forEach(route => map.removeLayer(route.layer));
    routePolylines.agentToAgent.forEach(route => map.removeLayer(route.layer));
    routePolylines.depotToAgent = [];
    routePolylines.agentToAgent = [];
    routes = [];
    
    // Tải các tuyến từ kho hàng đến đại lý
    for (let i = 0; i < coordsData.agents.length; i++) {
      const color = routeColors.depotToAgent[i % routeColors.depotToAgent.length];
      const route = await fetchRoadRoute(coordsData.depot, coordsData.agents[i]);
      
      if (route) {
        const distance = (route.distance / 1000).toFixed(2);
        const duration = (route.duration / 60).toFixed(2);
        const geoLayer = L.geoJSON(route.geometry, {
          style: {
            color: color,
            weight: 5,
            opacity: 0.7
          }
        }).addTo(map);
        
        geoLayer.bindTooltip(`Kho hàng → Đại lý ${i + 1}: ${distance}km (${duration} phút)`, {
          sticky: true
        });
        
        routePolylines.depotToAgent.push({
          layer: geoLayer,
          agentIndex: i,
          routeData: route
        });
        
        routes.push({
          type: 'depotToAgent',
          from: 'depot',
          to: `agent-${i}`,
          coordinates: decode(route.geometry),
          distance: route.distance,
          duration: route.duration,
          color: color
        });
      }
    }
    
    // Tải các tuyến giữa các đại lý
    let colorIndex = 0;
    for (let i = 0; i < coordsData.agents.length; i++) {
      for (let j = i + 1; j < coordsData.agents.length; j++) {
        const color = routeColors.agentToAgent[colorIndex % routeColors.agentToAgent.length];
        colorIndex++;
        
        const route = await fetchRoadRoute(coordsData.agents[i], coordsData.agents[j]);
        
        if (route) {
          const distance = (route.distance / 1000).toFixed(2);
          const duration = (route.duration / 60).toFixed(2);
          const geoLayer = L.geoJSON(route.geometry, {
            style: {
              color: color,
              weight: 4,
              opacity: 0.6,
              dashArray: "5,8"
            }
          }).addTo(map);
          
          geoLayer.bindTooltip(`Đại lý ${i + 1} → Đại lý ${j + 1}: ${distance}km (${duration} phút)`, {
            sticky: true
          });
          
          routePolylines.agentToAgent.push({
            layer: geoLayer,
            agentIndices: [i, j],
            routeData: route
          });
          
          routes.push({
            type: 'agentToAgent',
            from: `agent-${i}`,
            to: `agent-${j}`,
            coordinates: decode(route.geometry),
            distance: route.distance,
            duration: route.duration,
            color: color
          });
        }
      }
    }
    
    // Khi tải xong tất cả tuyến đường
    console.log(`Đã tải ${routes.length} tuyến đường`);
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu tuyến đường:", error);
    showError("Đã xảy ra lỗi khi tải dữ liệu tuyến đường. Vui lòng thử lại.");
  }
}

// Lấy dữ liệu tuyến đường từ OSRM
async function fetchRoadRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length) {
      return data.routes[0];
    }
  } catch (error) {
    console.error("Lỗi khi gọi API tuyến đường:", error);
  }
  
  return null;
}

// Bắt đầu mô phỏng
function startSimulation() {
  if (simulationRunning) return;
  
  if (routes.length === 0) {
    showError("Không có dữ liệu tuyến đường để mô phỏng");
    return;
  }
  
  simulationRunning = true;
  
  // Lấy thông tin về loại xe và số lượng
  const vehicleType = localStorage.getItem('selected_vehicle_type') || 'trung-binh';
  const vehicleCount = parseInt(localStorage.getItem('selected_vehicle_count') || '1');
  
  // Tạo các xe
  createVehicles(vehicleType, vehicleCount);
  
  // Khởi động các xe theo các tuyến khác nhau
  startVehicleMovement();
}

// Tạm dừng mô phỏng
function pauseSimulation() {
  simulationRunning = false;
}

// Reset mô phỏng
function resetSimulation() {
  simulationRunning = false;
  
  // Xóa tất cả xe
  vehicles.forEach(vehicle => {
    if (vehicle.marker) {
      map.removeLayer(vehicle.marker);
    }
  });
  
  vehicles = [];
}

// Cập nhật tốc độ của các xe khi thay đổi thanh trượt
function updateVehicleSpeeds() {
  vehicles.forEach(vehicle => {
    vehicle.speed = simulationSpeed;
  });
}

// Tạo các xe tương ứng với loại và số lượng
function createVehicles(type, count) {
  // Xóa xe cũ nếu có
  vehicles.forEach(vehicle => {
    if (vehicle.marker) {
      map.removeLayer(vehicle.marker);
    }
  });
  
  vehicles = [];
  
  // Tạo icon cho xe
  const vehicleIconUrl = vehicleIcons[type] || vehicleIcons['trung-binh'];
  
  // Tạo số lượng xe theo yêu cầu
  for (let i = 0; i < count; i++) {
    const vehicle = {
      id: `vehicle-${i}`,
      type: type,
      speed: simulationSpeed,
      marker: null,
      currentRouteIndex: i % routes.length, // Phân bổ xe trên các tuyến khác nhau
      progress: 0
    };
    
    // Tạo icon xe tùy chỉnh
    const vehicleIcon = L.icon({
      iconUrl: vehicleIconUrl,
      iconSize: [32, 32],  // Kích thước của icon
      iconAnchor: [16, 16] // Điểm neo (chính giữa icon)
    });
    
    // Đặt xe vào điểm bắt đầu của tuyến
    const route = routes[vehicle.currentRouteIndex];
    if (route && route.coordinates.length > 0) {
      const startCoord = route.coordinates[0];
      
      // Tạo marker cho xe
      vehicle.marker = L.marker([startCoord[0], startCoord[1]], {
        icon: vehicleIcon
      }).addTo(map);
      
      // Thêm tooltip cho xe
      vehicle.marker.bindTooltip(`Xe ${i + 1} (${vehicleNames[type]})`);
    }
    
    vehicles.push(vehicle);
  }
}

// Bắt đầu di chuyển các xe
function startVehicleMovement() {
  if (!simulationRunning) return;
  
  // Di chuyển từng xe
  vehicles.forEach(vehicle => {
    moveVehicle(vehicle);
  });
  
  // Lặp lại
  requestAnimationFrame(startVehicleMovement);
}

// Di chuyển một xe theo tuyến đường của nó
function moveVehicle(vehicle) {
  if (!simulationRunning) return;
  
  const route = routes[vehicle.currentRouteIndex];
  if (!route || !route.coordinates || route.coordinates.length < 2) return;
  
  // Tính vị trí tiếp theo dựa trên tiến độ
  vehicle.progress += 0.0003 * vehicle.speed;
  
  if (vehicle.progress >= 1) {
    // Nếu đã hoàn thành tuyến, chuyển sang tuyến khác
    vehicle.currentRouteIndex = (vehicle.currentRouteIndex + 1) % routes.length;
    vehicle.progress = 0;
    return;
  }
  
  // Tính toán thời gian dựa trên vận tốc
  const averageSpeed = parseFloat(localStorage.getItem('average_speed')) || 50;
  const distance = route.distance / 1000; // km
  const timeHours = distance / averageSpeed;
  
  // Hiển thị thời gian
  document.getElementById('travelTimeInfo').textContent = 
      `${(timeHours * 60).toFixed(1)} phút`;
      
  // Tính toán vị trí hiện tại dựa trên tiến độ và tuyến đường
  const currentPosition = getPositionAlongRoute(route.coordinates, vehicle.progress);
  
  // Tính góc quay để xe quay đúng hướng
  if (vehicle.marker) {
    const nextPosition = getPositionAlongRoute(route.coordinates, Math.min(1, vehicle.progress + 0.01));
    const angle = getAngle(currentPosition, nextPosition);
    
    // Cập nhật vị trí và góc quay của xe
    vehicle.marker.setLatLng([currentPosition[0], currentPosition[1]]);
    
    // Xoay icon theo hướng di chuyển
    vehicle.marker.setRotationAngle && vehicle.marker.setRotationAngle(angle);
  }
}

// Tính vị trí dọc theo tuyến đường dựa vào tiến độ (0-1)
function getPositionAlongRoute(coordinates, progress) {
  if (coordinates.length === 0) return [0, 0];
  if (coordinates.length === 1) return coordinates[0];
  
  const totalPoints = coordinates.length;
  const targetIndex = Math.floor(progress * (totalPoints - 1));
  const targetFraction = (progress * (totalPoints - 1)) % 1;
  
  if (targetIndex >= totalPoints - 1) return coordinates[totalPoints - 1];
  
  const start = coordinates[targetIndex];
  const end = coordinates[targetIndex + 1];
  
  return [
    start[0] + (end[0] - start[0]) * targetFraction,
    start[1] + (end[1] - start[1]) * targetFraction
  ];
}

// Tính góc giữa hai điểm để xoay xe theo hướng di chuyển
function getAngle(point1, point2) {
  return Math.atan2(point2[1] - point1[1], point2[0] - point1[0]) * (180 / Math.PI);
}

// Giải mã geometry từ định dạng geojson
function decode(geometry) {
  if (!geometry.coordinates) return [];
  
  // Chuyển đổi từ [lng, lat] sang [lat, lng]
  return geometry.coordinates.map(coord => [coord[1], coord[0]]);
}

// Lưu lựa chọn loại xe và số lượng khi chuyển từ trang result
window.addEventListener('storage', function(e) {
  if (e.key === 'selected_vehicle_type' || e.key === 'selected_vehicle_count') {
    // Cập nhật thông tin mô phỏng khi có thay đổi
    const vehicleData = {
      type: localStorage.getItem('selected_vehicle_type') || 'trung-binh',
      count: parseInt(localStorage.getItem('selected_vehicle_count') || '1')
    };
    
    const coordsData = JSON.parse(localStorage.getItem('vrptw_coords') || '{}');
    updateSimulationInfo(coordsData, vehicleData);
    
    // Reset và bắt đầu lại mô phỏng với loại xe mới
    if (simulationRunning) {
      resetSimulation();
      startSimulation();
    }
  }
});