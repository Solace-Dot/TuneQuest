import os
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Payment, Subscription


class PayPalError(Exception):
    """Raised when PayPal API calls fail."""


def _paypal_base_url():
    mode = settings.PAYPAL_MODE.lower()
    if mode == "live":
        return "https://api-m.paypal.com"
    return "https://api-m.sandbox.paypal.com"


def _paypal_client_credentials():
    client_id = settings.PAYPAL_CLIENT_ID
    secret = settings.PAYPAL_SECRET
    if not client_id or not secret:
        raise PayPalError("PayPal credentials are not configured on the server.")
    return client_id, secret


def _paypal_access_token():
    client_id, secret = _paypal_client_credentials()
    response = requests.post(
        f"{_paypal_base_url()}/v1/oauth2/token",
        data={"grant_type": "client_credentials"},
        auth=(client_id, secret),
        timeout=20,
    )
    if response.status_code >= 400:
        raise PayPalError("Unable to authenticate with PayPal.")
    token = response.json().get("access_token")
    if not token:
        raise PayPalError("PayPal did not return an access token.")
    return token


def _paypal_request(method, endpoint, payload=None):
    token = _paypal_access_token()
    response = requests.request(
        method=method,
        url=f"{_paypal_base_url()}{endpoint}",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    data = response.json() if response.content else {}
    if response.status_code >= 400:
        detail = data.get("message") or data.get("error_description") or "PayPal request failed."
        raise PayPalError(detail)
    return data


class PayPalConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        client_id = settings.PAYPAL_CLIENT_ID
        if not client_id:
            return Response(
                {"detail": "PayPal is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "clientId": client_id,
                "currency": settings.PAYPAL_CURRENCY,
                "premiumPrice": settings.PAYPAL_PREMIUM_PRICE,
            }
        )


class PayPalCreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan", "premium")
        if plan != "premium":
            return Response(
                {"detail": "Unsupported plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        currency = settings.PAYPAL_CURRENCY
        amount = settings.PAYPAL_PREMIUM_PRICE

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "description": "TuneQuest Premium Subscription",
                    "custom_id": f"{request.user.id}:premium",
                    "amount": {
                        "currency_code": currency,
                        "value": amount,
                    },
                }
            ],
        }

        try:
            order_data = _paypal_request("POST", "/v2/checkout/orders", payload=payload)
        except PayPalError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"orderID": order_data.get("id")}, status=status.HTTP_201_CREATED)


class PayPalCaptureOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        try:
            capture_data = _paypal_request("POST", f"/v2/checkout/orders/{order_id}/capture", payload={})
        except PayPalError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        purchase_units = capture_data.get("purchase_units", [])
        payments = purchase_units[0].get("payments", {}) if purchase_units else {}
        captures = payments.get("captures", [])
        capture = captures[0] if captures else {}

        capture_id = capture.get("id")
        capture_status = capture.get("status", "UNKNOWN").upper()
        amount = capture.get("amount", {}).get("value", settings.PAYPAL_PREMIUM_PRICE)
        payer_id = (capture_data.get("payer") or {}).get("payer_id")

        if not capture_id:
            return Response(
                {"detail": "Unable to capture PayPal payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            subscription, _created = Subscription.objects.get_or_create(
                user=request.user,
                plan_type="premium",
                defaults={
                    "subscription_status": "active",
                    "paypal_payer_id": payer_id,
                    "paypal_subscription_id": order_id,
                    "auto_renew": False,
                },
            )

            subscription.subscription_status = "active" if capture_status == "COMPLETED" else "pending"
            subscription.paypal_payer_id = payer_id
            subscription.paypal_subscription_id = order_id
            subscription.auto_renew = False
            subscription.save()

            Payment.objects.update_or_create(
                transaction_id=capture_id,
                defaults={
                    "subscription": subscription,
                    "user": request.user,
                    "payment_gateway": "paypal",
                    "amount": Decimal(str(amount)),
                    "status": capture_status.lower(),
                },
            )

        return Response(
            {
                "detail": "Payment captured successfully.",
                "subscription": "premium",
                "status": capture_status,
                "transactionId": capture_id,
            }
        )
