from django.urls import path

from .views import (
    PayPalCaptureOrderView,
    PayPalConfigView,
    PayPalCreateOrderView,
    get_subscription_status,
    cancel_subscription,
)

urlpatterns = [
    path("paypal/config/", PayPalConfigView.as_view()),
    path("paypal/orders/", PayPalCreateOrderView.as_view()),
    path("paypal/orders/<str:order_id>/capture/", PayPalCaptureOrderView.as_view()),
    path("subscription/status/", get_subscription_status, name="get_subscription_status"),
    path("subscription/cancel/", cancel_subscription, name="cancel_subscription"),
]
