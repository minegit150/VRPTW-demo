from django.urls import path
from . import views

from rest_framework import routers, serializers, viewsets

app_name = 'VRP1'
urlpatterns = [
    path('', views.index, name = 'index'),
    path("result/", views.result, name="result"),
    path("visualization/", views.visualization, name="visualization"),
    path("visual/", views.visual, name="visual"),

    # API endpoint cho việc tính toán và trả kết quả routes
    path("api/solve/", views.SolveAPIView.as_view(), name='solve'),
]


