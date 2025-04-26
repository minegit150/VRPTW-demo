from rest_framework import serializers

class TimeWindowSerializer(serializers.Serializer):
    start = serializers.DateTimeField(format="%Y-%m-%dT%H:%M")
    end   = serializers.DateTimeField(format="%Y-%m-%dT%H:%M")

class AgentSerializer(serializers.Serializer):
    id = serializers.CharField()
    location = serializers.ListField(
        child=serializers.FloatField(), min_length=2, max_length=2
    )
    demand = serializers.FloatField()
    timeWindow = TimeWindowSerializer()

class VehicleSerializer(serializers.Serializer):
    type = serializers.CharField()
    count = serializers.IntegerField(min_value=1)
    capacity = serializers.FloatField()
    costPerKm = serializers.FloatField()
    averageSpeed = serializers.FloatField()
    startTime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M")
    endTime   = serializers.DateTimeField(format="%Y-%m-%dT%H:%M")

class SolveRequestSerializer(serializers.Serializer):
    depot = serializers.ListField(
        child=serializers.FloatField(), min_length=2, max_length=2
    )
    agents = AgentSerializer(many=True)
    vehicle = VehicleSerializer()
    solverMethod = serializers.ChoiceField(choices=[
        ('cplex', 'CPLEX'),
        ('clark-wright', 'Clark-Wright'),
        ('nearest-neighbor', 'Nearest Neighbor'),
    ])

class RouteSerializer(serializers.Serializer):
    vehicleId = serializers.IntegerField()
    path = serializers.ListField(child=serializers.CharField())
    geometry = serializers.ListField(
        child=serializers.ListField(
            child=serializers.FloatField(), min_length=2, max_length=2
        )
    )
    distanceKm = serializers.FloatField()
    cost = serializers.FloatField()

class SolveResponseSerializer(serializers.Serializer):
    routes = RouteSerializer(many=True)
    infeasibleAgents = serializers.ListField(child=serializers.CharField(), required=False)
    totalCost = serializers.FloatField()