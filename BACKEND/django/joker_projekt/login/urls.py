from django.urls import path

from .views import LoginAPIView


app_name = "login"

urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="login"),
]
