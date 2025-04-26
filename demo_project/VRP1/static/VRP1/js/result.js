// Khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  // // Nút mô phỏng - Lưu loại xe và số lượng rồi chuyển trang
  // document.getElementById('simulateButton').addEventListener('click', () => {
  //     const averageSpeed = document.getElementById('averageSpeed').value;
  //     localStorage.setItem('average_speed', averageSpeed);

  //     const vehicleType = document.getElementById('vehicleType').value;
  //     const vehicleCount = document.getElementById('vehicleCount').value;
  
  //     // Lưu thông tin xe vào localStorage để trang visualization lấy
  //     localStorage.setItem('selected_vehicle_type', vehicleType);
  //     localStorage.setItem('selected_vehicle_count', vehicleCount);
  
  //     // Chuyển hướng đến trang mô phỏng
  //     window.location.href = '/visual/';
  // });
  
  // document.getElementById('simulateButton').addEventListener('click', function() {
  //     const data = JSON.parse(localStorage.getItem('data_demo') || '[]');
  //     const totalDemand = data.reduce((sum, item) => sum + parseFloat(item['Số lượng'] || 0), 0);
    
  //     const count = parseInt(document.getElementById('vehicleCount').value);
  //     const type = document.getElementById('vehicleType').value;
    
  //     let capacity = 5000;
  //     if (type === 'to') capacity = 10000;
  //     else if (type === 'nho') capacity = 2000;
    
  //     if (totalDemand > count * capacity) {
  //       alert("Không đủ số lượng xe cần để vận chuyển. Tổng khối lượng hàng hóa vượt quá tổng tải trọng xe.");
  //       return;
  //     }
    
  //     localStorage.setItem('selected_vehicle_type', type);
  //     localStorage.setItem('selected_vehicle_count', count);
  //     localStorage.setItem('average_speed', document.getElementById('averageSpeed').value);
    
  //     window.location.href = 'visual';
  //   });









  const simulateButton = document.getElementById('simulateButton');
  if (simulateButton) {
    simulateButton.addEventListener('click', function() {
      const data = JSON.parse(localStorage.getItem('data_demo') || '[]');
      const totalDemand = data.reduce((sum, item) => sum + parseFloat(item['Số lượng'] || 0), 0);
    
      const count = parseInt(document.getElementById('vehicleCount').value);
      const type = document.getElementById('vehicleType').value;
    
      let capacity = 5000;
      if (type === 'to') capacity = 10000;
      else if (type === 'nho') capacity = 2000;
    
      if (totalDemand > count * capacity) {
        alert("Không đủ số lượng xe cần để vận chuyển. Tổng khối lượng hàng hóa vượt quá tổng tải trọng xe.");
        return;
      }
    
      localStorage.setItem('selected_vehicle_type', type);
      localStorage.setItem('selected_vehicle_count', count);
      localStorage.setItem('average_speed', document.getElementById('averageSpeed').value);
      
      // LƯU Time Window
      const startTime = document.getElementById('vehicleStartTime').value;
      const endTime   = document.getElementById('vehicleEndTime').value;
      localStorage.setItem('vehicle_start_time', startTime);
      localStorage.setItem('vehicle_end_time', endTime);
    
      window.location.href = '/visualization';
    });
  } else {
    console.warn('Mô phỏng lỗi');
  }










  // Nút quay lại
  // document.getElementById('backToIndexButton').addEventListener('click', () => {
  //     window.location.href = '/';
  // });









  // Xử lý nút quay lại
  const backButton = document.getElementById('backToIndexButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = '/';
    });
  } else {
    console.warn('Không tìm thấy nút quay lại');
  }











  try {
    loadOrderInfo();
    calculateDistances();
  } catch (e) {
    console.error('Lỗi khi khởi tạo:', e);
    document.getElementById('distanceResult').innerHTML = '<li>Lỗi khi tải dữ liệu</li>';
  }
});

//   // Load thông tin đơn hàng và khoảng cách
//   loadOrderInfo();
//   calculateDistances();
// });

// Hiển thị đơn hàng theo từng đại lý
function loadOrderInfo() {
  const data = JSON.parse(localStorage.getItem('data_demo') || '[]');
  const container = document.getElementById('orderGroups');
  container.innerHTML = '';

  // Nhóm đơn theo tên đại lý
  const groups = data.reduce((acc, item) => {
      const key = item['Tên điểm giao hàng'];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
  }, {});

  // Tạo UI cho từng nhóm
  Object.entries(groups).forEach(([agentName, orders]) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'order-group';

      // Nút toggle
      const btn = document.createElement('button');
      btn.className = 'btn-toggle';
      btn.textContent = `Đại lý ${agentName} (${orders.length} đơn)`;
      btn.addEventListener('click', () => {
          const details = groupDiv.querySelector('.group-details');
          details.style.display = details.style.display === 'none' ? 'block' : 'none';
      });
      groupDiv.appendChild(btn);

      // Chi tiết ẩn
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'group-details';
      detailsDiv.style.display = 'none';

      // Bảng chi tiết đơn
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr>
          <th>STT</th>
          <th>Thời gian bắt đầu</th>
          <th>Thời gian kết thúc</th>
          <th>Khối lượng (kg)</th>
      </tr>`;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      orders.forEach(o => {
          const row = document.createElement('tr');
          row.innerHTML = `
              <td>${o.STT}</td>
              <td>${o['Thời gian bắt đầu']}</td>
              <td>${o['Thời gian kết thúc']}</td>
              <td>${o['Khối lượng đặt hàng (kg)']}</td>`;
          tbody.appendChild(row);
      });
      table.appendChild(tbody);
      detailsDiv.appendChild(table);
      groupDiv.appendChild(detailsDiv);

      container.appendChild(groupDiv);
  });
}

// Phần calculateDistances() giữ nguyên logic đã có
const brightDepotToAgentColors = ["#FF0000","#00AA00","#0000FF","#000000","#FFFF00","#00FFFF","#FF6600","#6600FF"];
const brightAgentToAgentColors = ["#F054aa","#00F4FF","#FF9000","#0090FF","#008000","#910707"];
const defaultStyle = { weight:6, opacity:0.9 };
const highlightStyle = { weight:10, opacity:1.0 };
const dimStyle = { weight:6, opacity:0.3 };
let depotAgentPolylines = [], agentAgentPolylines = [];

// async function fetchRoadRoute(start,end) {
//   const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
//   try {
//   const resp = await fetch(url);
//   const j = await resp.json();
//   if (j.routes && j.routes.length) return j.routes[0];
//   } catch(e) { console.error(e); }
//   return null;
// }


async function fetchRoadRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP error: ${resp.status}`);
    const j = await resp.json();
    return j.routes?.[0] || null;
  } catch (e) {
    console.error("Lỗi khi gọi API OSRM:", e);
    return null;
  }
}


function resetAllPolyStyles() {
  depotAgentPolylines.forEach(o=>o.layer.setStyle(defaultStyle));
  agentAgentPolylines.forEach(o=>o.layer.setStyle(defaultStyle));
}
function highlightRelatedLines(idx,type) {
  depotAgentPolylines.forEach(o=>o.layer.setStyle(
  type==='depot'||(type==='agent'&&o.agentIndex===idx)?highlightStyle:dimStyle
  ));
  agentAgentPolylines.forEach(o=>o.layer.setStyle(
  type==='agent'&&o.agentIndices.includes(idx)?highlightStyle:(type==='depot'?defaultStyle:dimStyle)
  ));
}

async function calculateDistances() {
  const ul = document.getElementById('distanceResult'); ul.innerHTML = '';
  const saved = JSON.parse(localStorage.getItem('vrptw_coords')||'{}');
  if (!saved.depot||!saved.agents) {
  ul.innerHTML = '<li>Không tìm thấy tọa độ. Vui lòng quay lại trang nhập.</li>';
  return;
  }
  const map = L.map('map').setView(saved.depot,13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19, attribution:'&copy; OpenStreetMap contributors' }).addTo(map);
  const depotIcon = L.icon({ iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41] });
  const agentIcon = L.icon({ iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png', shadowUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41] });
  L.marker(saved.depot,{icon:depotIcon}).addTo(map).bindPopup("Kho hàng").on('click',()=>highlightRelatedLines(null,'depot'));
  let html = '<li style="font-weight:bold">Khoảng cách từ kho hàng đến đại lý:</li>';
  const allPts = [L.latLng(saved.depot[0],saved.depot[1])];
  for (let i=0; i<saved.agents.length; i++) {
  const color = brightDepotToAgentColors[i % brightDepotToAgentColors.length];
  const route = await fetchRoadRoute(saved.depot, saved.agents[i]);
  if (route) {
      const d = (route.distance/1000).toFixed(2);
      html += `<li><span class="color-dot" style="background-color:${color}"></span>Kho hàng → Đại lý ${i+1}: ${d} km</li>`;
      const geo = L.geoJSON(route.geometry,{ style:{color,...defaultStyle} }).addTo(map);
      depotAgentPolylines.push({layer:geo,agentIndex:i});
      geo.on('click',e=>{ resetAllPolyStyles(); geo.setStyle(highlightStyle); map.fitBounds(geo.getBounds()); L.popup().setLatLng(e.latlng).setContent(`Tuyến Kho hàng → Đại lý ${i+1}: ${d} km`).openOn(map); });
  } else {
      html += `<li><span class="color-dot" style="background-color:gray"></span>Kho hàng → Đại lý ${i+1}: Lỗi</li>`;
  }
  L.marker(saved.agents[i],{icon:agentIcon}).addTo(map).bindPopup(`Đại lý ${i+1}`).on('click',()=>highlightRelatedLines(i,'agent'));
  allPts.push(L.latLng(saved.agents[i][0],saved.agents[i][1]));
  }
  html += '<li style="margin-top:10px;font-weight:bold">Khoảng cách giữa các đại lý:</li>';
  let ci = 0;
  for (let i=0; i<saved.agents.length; i++) {
  for (let j=i+1; j<saved.agents.length; j++) {
      const color = brightAgentToAgentColors[(ci++) % brightAgentToAgentColors.length];
      const route = await fetchRoadRoute(saved.agents[i], saved.agents[j]);
      if (route) {
      const d = (route.distance/1000).toFixed(2);
      html += `<li><span class="color-dot" style="background-color:${color}"></span>Đại lý ${i+1} → Đại lý ${j+1}: ${d} km</li>`;
      const geo = L.geoJSON(route.geometry,{ style:{color,...defaultStyle,dashArray:"5,8"} }).addTo(map);
      agentAgentPolylines.push({layer:geo,agentIndices:[i,j]});
      geo.on('click',e=>{ resetAllPolyStyles(); geo.setStyle(highlightStyle); map.fitBounds(geo.getBounds()); L.popup().setLatLng(e.latlng).setContent(`Tuyến Đại lý ${i+1} → Đại lý ${j+1}: ${d} km`).openOn(map); });
      } else {
      html += `<li><span class="color-dot" style="background-color:gray"></span>Đại lý ${i+1} → Đại lý ${j+1}: Lỗi</li>`;
      }
  }
  }
  document.getElementById('distanceResult').innerHTML = html;
  map.fitBounds(L.latLngBounds(allPts));
  map.on('click', resetAllPolyStyles);
}
