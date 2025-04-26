from django.contrib import admin
# from .models import

# Register your models here.
#cmt vào 18/4
# from .models import VRPProblem, VRPPoint, RoutingPlan, RouteDetail

# admin.site.register(VRPProblem)
# admin.site.register(VRPPoint)
# admin.site.register(RoutingPlan)

#cmt vào 18/4
# @admin.register(VRPPoint)
# class VRPPointAdmin(admin.ModelAdmin):
#     list_display = ('name', 'point_type', 'latitude', 'longitude', 'load', 'created_at')
#     list_filter = ('point_type', 'created_at')
#     search_fields = ('name',)

# @admin.register(VRPProblem)
# class VRPProblemAdmin(admin.ModelAdmin):
#     list_display = ('name', 'start_time', 'end_time', 'vehicle_capacity', 'depot', 'created_at')
#     list_filter = ('created_at',)
#     search_fields = ('name',)

# @admin.register(RoutingPlan)
# class RoutingPlanAdmin(admin.ModelAdmin):
#     list_display = ('problem', 'vehicle_number', 'total_distance', 'created_at')
#     list_filter = ('created_at',)

# @admin.register(RouteDetail)
# class RouteDetailAdmin(admin.ModelAdmin):
#     list_display = ('routing_plan', 'vehicle_id', 'point', 'visit_order', 'arrival_time', 'distance_from_previous')
#     list_filter = ('vehicle_id', 'routing_plan')
#     ordering = ('routing_plan', 'vehicle_id', 'visit_order')