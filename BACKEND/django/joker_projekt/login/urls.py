from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AvailableUsersAPIView,
    CurrentUserAPIView,
    LoginAPIView,
    RegisterAPIView,
)


app_name = "login"

urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("me/", CurrentUserAPIView.as_view(), name="current_user"),
    path(
        "available-users/",
        AvailableUsersAPIView.as_view(),
        name="available_users",
    ),
]
