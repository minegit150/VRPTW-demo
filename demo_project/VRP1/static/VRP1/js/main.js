<script>
        let map;
        let depotMarker = null;
        let agentMarkers = [];
        let directionsService;
        let distanceMatrix = [];

        function initMap() {
            map = new google.maps.Map(document.getElementById("map"), {
                center: { lat: 21.0278, lng: 105.8342 },
                zoom: 13
            });

            directionsService = new google.maps.DirectionsService();

            map.addListener("click", (e) => {
                const latlng = e.latLng;
                if (!depotMarker) {
                    depotMarker = new google.maps.Marker({
                        position: latlng,
                        map,
                        draggable: true,
                        label: "D"
                    });
                    document.getElementById("depot").value = latlng.lat().toFixed(6) + ", " + latlng.lng().toFixed(6);
                    depotMarker.addListener("dragend", updateDepot);
                } else {
                    const agentMarker = new google.maps.Marker({
                        position: latlng,
                        map,
                        draggable: true,
                        label: `${agentMarkers.length + 1}`
                    });
                    agentMarkers.push(agentMarker);
                    updateAgents();
                    agentMarker.addListener("dragend", updateAgents);
                }
            });
        }

        function updateDepot() {
            const pos = depotMarker.getPosition();
            document.getElementById("depot").value = pos.lat().toFixed(6) + ", " + pos.lng().toFixed(6);
            calculateDistances();
        }

        function updateAgents() {
            const addresses = agentMarkers.map(marker => {
                const pos = marker.getPosition();
                return pos.lat().toFixed(6) + ", " + pos.lng().toFixed(6);
            });
            document.getElementById("agent_addresses").value = addresses.join("\n");
            calculateDistances();
        }

        function calculateDistances() {
            if (!depotMarker || agentMarkers.length === 0) return;

            const origin = depotMarker.getPosition();
            const destinations = agentMarkers.map(marker => marker.getPosition());

            let promises = destinations.map(destination => {
                return new Promise((resolve, reject) => {
                    directionsService.route({
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING
                    }, (result, status) => {
                        if (status === "OK") {
                            const distance = result.routes[0].legs[0].distance.text;
                            resolve(distance);
                        } else {
                            reject("Lỗi khi lấy khoảng cách");
                        }
                    });
                });
            });

            Promise.all(promises).then(distances => {
                distanceMatrix = distances;
                document.getElementById("distance_matrix").value = distances.join("\n");
            }).catch(error => {
                alert("Lỗi khi tính khoảng cách: " + error);
            });
        }
        
    let distanceMatrixService;

    function initMap() {
        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat: 21.0278, lng: 105.8342 },
            zoom: 13
        });

        directionsService = new google.maps.DirectionsService();
        distanceMatrixService = new google.maps.DistanceMatrixService();

        map.addListener("click", (e) => {
            const latlng = e.latLng;
            if (!depotMarker) {
                depotMarker = new google.maps.Marker({
                    position: latlng,
                    map,
                    draggable: true,
                    label: "D"
                });
                document.getElementById("depot").value = latlng.lat().toFixed(6) + ", " + latlng.lng().toFixed(6);
                depotMarker.addListener("dragend", updateDepot);
            } else {
                const agentMarker = new google.maps.Marker({
                    position: latlng,
                    map,
                    draggable: true,
                    label: `${agentMarkers.length + 1}`
                });
                agentMarkers.push(agentMarker);
                updateAgents();
                agentMarker.addListener("dragend", updateAgents);
            }
        });
    }

    function updateDepot() {
        const pos = depotMarker.getPosition();
        document.getElementById("depot").value = pos.lat().toFixed(6) + ", " + pos.lng().toFixed(6);
        updateAgents();
    }

    function updateAgents() {
        const addresses = agentMarkers.map(marker => {
            const pos = marker.getPosition();
            return pos.lat().toFixed(6) + ", " + pos.lng().toFixed(6);
        });
        document.getElementById("agent_addresses").value = addresses.join("\n");

        // Tính toán lại toàn bộ ma trận
        calculateFullDistanceMatrix();
    }

    function calculateFullDistanceMatrix() {
        if (!depotMarker) return;

        const allPoints = [depotMarker.getPosition(), ...agentMarkers.map(m => m.getPosition())];

        distanceMatrixService.getDistanceMatrix({
            origins: allPoints,
            destinations: allPoints,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC
        }, (response, status) => {
            if (status !== "OK") {
                alert("Lỗi khi lấy ma trận khoảng cách: " + status);
                return;
            }

            const matrix = response.rows.map(row =>
                row.elements.map(elem =>
                    elem.status === "OK" ? (elem.distance.value / 1000).toFixed(2) : "NaN"
                )
            );

            // Hiển thị dưới dạng text cho textarea
            const matrixText = matrix.map(row => row.join(", ")).join("\n");
            document.getElementById("distance_matrix").value = matrixText;
        });
    }
</script>