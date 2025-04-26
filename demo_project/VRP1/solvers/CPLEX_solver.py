import requests
from docplex.mp.model import Model
from datetime import datetime
import math

# OSRM server endpoint (có thể chạy local hoặc public)
OSRM_URL = 'http://router.project-osrm.org'

# Cache để tránh gọi OSRM nhiều lần
_distance_cache = {}

def get_road_distance_and_time(coord1, coord2):
    """
    Trả về (distance_km, duration_min) giữa hai điểm theo đường bộ sử dụng OSRM.
    """
    key = (tuple(coord1), tuple(coord2))
    if key in _distance_cache:
        return _distance_cache[key]
    lon1, lat1 = coord1[1], coord1[0]
    lon2, lat2 = coord2[1], coord2[0]
    url = f"{OSRM_URL}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
    resp = requests.get(url)
    resp.raise_for_status()
    data = resp.json()
    route = data['routes'][0]
    dist_km = route['distance'] / 1000.0
    dur_min = route['duration'] / 60.0
    _distance_cache[key] = (dist_km, dur_min)
    return dist_km, dur_min


def solve_cplex(depot, agents, vehicle):
    """
    Giải VRPTW bằng CPLEX (docplex) sử dụng khoảng cách đường bộ.
    depot: [lat, lng]
    agents: list of {id, location, demand, timeWindow: {start, end}}
    vehicle: {type, count, capacity, costPerKm, averageSpeed, startTime, endTime}
    Trả về dict với keys: routes, infeasibleAgents, totalCost
    """
    # --- Chuyển đổi dữ liệu ---
    n = len(agents)
    K = vehicle['count']
    base_time = vehicle['startTime']
    def to_minutes(dt):
        return (dt - base_time).total_seconds() / 60.0
    horizon = to_minutes(vehicle['endTime'])

    coords = [list(depot)] + [a['location'] for a in agents]
    demands = [0.0] + [a['demand'] for a in agents]
    tw_start = [0.0] + [to_minutes(a['timeWindow']['start']) for a in agents]
    tw_end   = [horizon] + [to_minutes(a['timeWindow']['end']) for a in agents]

    # Ma trận khoảng cách đường bộ và thời gian di chuyển
    dist = [[0.0]*(n+1) for _ in range(n+1)]
    travel_time = [[0.0]*(n+1) for _ in range(n+1)]
    for i in range(n+1):
        for j in range(n+1):
            if i != j:
                d_km, t_min = get_road_distance_and_time(coords[i], coords[j])
                dist[i][j] = d_km
                travel_time[i][j] = t_min

    # ----- Xây dựng mô hình -----
    mdl = Model(name='vrptw_cplex')
    x = {(i,j,k): mdl.binary_var(name=f"x_{i}_{j}_{k}")
         for i in range(n+1) for j in range(n+1) if i!=j for k in range(K)}
    T = {(i,k): mdl.continuous_var(lb=tw_start[i], ub=tw_end[i], name=f"T_{i}_{k}")
         for i in range(n+1) for k in range(K)}

    # Mục tiêu: minimize tổng chi phí theo đường bộ
    cost_km = vehicle['costPerKm']
    mdl.minimize(mdl.sum(dist[i][j] * cost_km * x[i,j,k] for (i,j,k) in x))

    # Ràng buộc: mỗi agent thăm 1 lần
    for j in range(1, n+1):
        mdl.add_constraint(
            mdl.sum(x[i,j,k] for i in range(n+1) if i!=j for k in range(K)) == 1,
            ctname=f"visit_{j}")
    # Flow và depot
    for k in range(K):
        mdl.add_constraint(mdl.sum(x[0,j,k] for j in range(1,n+1)) == 1, ctname=f"depart_{k}")
        mdl.add_constraint(mdl.sum(x[i,0,k] for i in range(1,n+1)) == 1, ctname=f"return_{k}")
        for h in range(1, n+1):
            mdl.add_constraint(
                mdl.sum(x[i,h,k] for i in range(n+1) if i!=h)
                == mdl.sum(x[h,j,k] for j in range(n+1) if j!=h),
                ctname=f"flow_{h}_{k}")
    # Capacity
    for k in range(K):
        mdl.add_constraint(
            mdl.sum(demands[j] * x[i,j,k] for i in range(n+1) for j in range(1,n+1) if i!=j)
            <= vehicle['capacity'], ctname=f"cap_{k}")
    # Time windows & subtours
    M = horizon + max(max(row) for row in travel_time)
    for i in range(n+1):
        for j in range(1, n+1):
            if i!=j:
                for k in range(K):
                    mdl.add_constraint(
                        T[j,k] >= T[i,k] + travel_time[i][j] - M*(1 - x[i,j,k]),
                        ctname=f"time_{i}_{j}_{k}")

    sol = mdl.solve(log_output=False)
    if sol is None:
        infeasible = [a['id'] for idx,a in enumerate(agents, start=1)
                      if any(T[idx,k].solution_value < tw_start[idx] or T[idx,k].solution_value > tw_end[idx]
                             for k in range(K))]
        return {'routes': [], 'infeasibleAgents': infeasible, 'totalCost': 0.0}

    # Trích xuất routes
    routes = []
    for k in range(K):
        path = ['depot']; cur = 0
        while True:
            next_nodes = [j for j in range(n+1) if j!=cur and x[cur,j,k].solution_value > 0.5]
            if not next_nodes or next_nodes[0] == 0:
                path.append('depot'); break
            j = next_nodes[0]; path.append(f"agent-{j}"); cur = j
        route_dist = sum(dist[i][j] for (i,j,kk) in x if kk==k and x[i,j,k].solution_value>0.5)
        route_cost = route_dist * cost_km
        geometry = [coords[0]] + [coords[int(n.split('-')[-1])] for n in path if n.startswith('agent')] + [coords[0]]
        routes.append({'vehicleId': k+1, 'path': path, 'geometry': geometry,
                       'distanceKm': route_dist, 'cost': route_cost})
    return {'routes': routes, 'infeasibleAgents': [], 'totalCost': sol.objective_value}