# # # views.py
# # from django.shortcuts import render
# # from .models import *

# # def index(request):
# #     return render(request, 'VRP1/index.html')

# # def result(request):
# #     return render(request, 'VRP1/result1.html')
    

# # def visualization(request):   
# #     return render(request, 'VRP1/visualization.html')

# # def visual(request):
# #     return render(request, 'VRP1/visual.html')








# from django.shortcuts import render
# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework import status
# from django.views.decorators.csrf import csrf_exempt
# from django.utils.decorators import method_decorator

# from .serializers import SolveRequestSerializer, SolveResponseSerializer
# from .solvers.CPLEX_solver import solve_cplex
# # from .solvers.clark_wright import solve_clark_wright
# # from .solvers.nearest_neighbor import solve_nearest_neighbor


# def index(request):
#     return render(request, 'VRP1/index.html')


# def result(request):
#     return render(request, 'VRP1/result1.html')


# def visualization(request):
#     return render(request, 'VRP1/visualization.html')


# def visual(request):
#     return render(request, 'VRP1/visual.html')



# @method_decorator(csrf_exempt, name='dispatch')
# class SolveAPIView(APIView):
#     """
#     POST /api/solve/
#     Nhận payload JSON định dạng SolveRequestSerializer,
#     chạy solver tương ứng, trả về JSON theo SolveResponseSerializer.
#     """
#     def post(self, request, *args, **kwargs):
#         # 1. Validate input
#         req_ser = SolveRequestSerializer(data=request.data)
#         req_ser.is_valid(raise_exception=True)
#         data = req_ser.validated_data

#         # 2. Dispatch theo solverMethod
#         method  = data['solverMethod']
#         depot   = data['depot']
#         agents  = data['agents']
#         vehicle = data['vehicle']

#         if method == 'cplex':
#             result = solve_cplex(depot=depot, agents=agents, vehicle=vehicle)
#         elif method == 'clark-wright':
#             result = solve_clark_wright(depot=depot, agents=agents, vehicle=vehicle)
#         elif method == 'nearest-neighbor':
#             result = solve_nearest_neighbor(depot=depot, agents=agents, vehicle=vehicle)
#         else:
#             return Response(
#                 {'detail': f"Unknown solverMethod '{method}'"},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         # 3. Validate & trả về response
#         resp_ser = SolveResponseSerializer(data=result)
#         resp_ser.is_valid(raise_exception=True)
#         return Response(resp_ser.data, status=status.HTTP_200_OK)










# apps/VRP1/views.py
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import SolveRequestSerializer, SolveResponseSerializer
from .solvers.CPLEX_solver import solve_cplex
# import các solver khác...

# @method_decorator(csrf_exempt, name='dispatch')
class SolveAPIView(APIView):
     # Thêm decorator API
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.permissions import AllowAny
    
    @permission_classes([AllowAny])
    def post(self, request, *args, **kwargs):
        serializer = SolveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        method  = data['solverMethod']
        depot   = data['depot']
        agents  = data['agents']
        vehicle = data['vehicle']

        if method == 'cplex':
            result = solve_cplex(depot=depot, agents=agents, vehicle=vehicle)
        # elif các method khác...
        else:
            return Response({'detail': f"Unknown solverMethod '{method}'"},
                            status=status.HTTP_400_BAD_REQUEST)

        resp_ser = SolveResponseSerializer(data=result)
        resp_ser.is_valid(raise_exception=True)
        return Response(resp_ser.data, status=status.HTTP_200_OK)






def index(request):
    return render(request, 'VRP1/index.html')


def result(request):
    return render(request, 'VRP1/result1.html')


def visualization(request):
    return render(request, 'VRP1/visualization.html')


def visual(request):
    return render(request, 'VRP1/visual.html')