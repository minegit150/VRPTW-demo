from django.db import models

class Location(models.Model):
    name = models.CharField(max_length=100)
    latitude = models.FloatField()
    longitude = models.FloatField()

class Vehicle(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.FloatField()
    cost_per_km = models.FloatField()

class Distance(models.Model):
    from_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='from_location')
    to_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='to_location')
    distance = models.FloatField()