from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    ForgotPasswordView,
    CustomTokenRefreshView,
    ProfileCompletionView,
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("token/refresh/", CustomTokenRefreshView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("profile/", ProfileView.as_view()),
    path("profile-completion/", ProfileCompletionView.as_view()),
]
