from django.urls import path

from .views import PayPalCaptureOrderView, PayPalConfigView, PayPalCreateOrderView

urlpatterns = [
    path("paypal/config/", PayPalConfigView.as_view()),
    path("paypal/orders/", PayPalCreateOrderView.as_view()),
    path("paypal/orders/<str:order_id>/capture/", PayPalCaptureOrderView.as_view()),
]
