from django.urls import path

from .views import (\n    PayPalCaptureOrderView,\n    PayPalConfigView,\n    PayPalCreateOrderView,\n    get_subscription_status,\n    cancel_subscription,\n)

urlpatterns = [
    path("paypal/config/", PayPalConfigView.as_view()),
    path("paypal/orders/", PayPalCreateOrderView.as_view()),
    path("paypal/orders/<str:order_id>/capture/", PayPalCaptureOrderView.as_view()),
    path("subscription/status/", get_subscription_status, name="get_subscription_status"),
    path("subscription/cancel/", cancel_subscription, name="cancel_subscription"),
]
