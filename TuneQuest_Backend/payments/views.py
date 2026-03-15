"""
PayPal Payment Integration for TuneQuest Premium Subscriptions

This module handles all PayPal API interactions including:
- Order creation via PayPal Checkout
- Order capture (payment processing)
- Subscription status management
- Payment record tracking

Environment Variables Required:
- PAYPAL_MODE: 'sandbox' or 'live'
- PAYPAL_CLIENT_ID: PayPal app client ID
- PAYPAL_SECRET: PayPal app secret
- PAYPAL_CURRENCY: Payment currency (default: USD)
- PAYPAL_PREMIUM_PRICE: Premium tier price (default: 9.99)
"""

import logging
import os
import uuid
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Payment, Subscription

logger = logging.getLogger(__name__)


class PayPalError(Exception):
    """Raised when PayPal API calls fail."""
    pass


def _paypal_base_url():
    """Get PayPal API base URL based on mode (sandbox/live)."""
    mode = settings.PAYPAL_MODE.lower()
    if mode == "live":
        return "https://api-m.paypal.com"
    return "https://api-m.sandbox.paypal.com"


def _paypal_client_credentials():
    """Retrieve PayPal client credentials from settings."""
    # In mock mode, return dummy credentials
    if getattr(settings, 'PAYPAL_MOCK_MODE', False):
        return "mock_client_id", "mock_secret"
    
    client_id = settings.PAYPAL_CLIENT_ID
    secret = settings.PAYPAL_SECRET
    
    if not client_id or not secret:
        logger.error("PayPal credentials missing from settings")
        raise PayPalError("PayPal credentials are not configured on the server.")
    
    return client_id, secret


def _paypal_access_token():
    """Obtain OAuth2 access token from PayPal."""
    # Return mock token in mock mode
    if getattr(settings, 'PAYPAL_MOCK_MODE', False):
        logger.info("Mock mode: Returning test access token")
        return "mock_test_token_" + os.urandom(16).hex()
    
    try:
        client_id, secret = _paypal_client_credentials()
        response = requests.post(
            f"{_paypal_base_url()}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(client_id, secret),
            timeout=20,
        )
        
        if response.status_code >= 400:
            logger.error(f"PayPal auth failed: {response.status_code} - {response.text}")
            raise PayPalError("Unable to authenticate with PayPal.")
        
        token = response.json().get("access_token")
        if not token:
            logger.error("PayPal did not return access token")
            raise PayPalError("PayPal did not return an access token.")
        
        return token
    except requests.RequestException as e:
        logger.error(f"PayPal token request failed: {str(e)}")
        raise PayPalError(f"Connection to PayPal failed: {str(e)}")


def _paypal_request(method, endpoint, payload=None):
    """Make authenticated request to PayPal API."""
    # Handle mock mode
    if getattr(settings, 'PAYPAL_MOCK_MODE', False):
        logger.info(f"Mock mode: {method} {endpoint}")
        
        # Mock order creation
        if method == "POST" and endpoint == "/v2/checkout/orders":
            return {
                "id": f"MOCK_{uuid.uuid4().hex[:16].upper()}",
                "status": "CREATED",
                "intent": "CAPTURE",
                "purchase_units": payload.get("purchase_units", [])
            }
        
        # Mock order capture
        elif method == "POST" and "/capture" in endpoint:
            order_id = endpoint.split("/")[5]  # Extract order_id from path
            return {
                "id": order_id,
                "status": "COMPLETED",
                "intent": "CAPTURE",
                "payer": {
                    "email_address": "test@example.com",
                    "payer_id": "MOCK_PAYER_ID",
                    "name": {
                        "given_name": "Test",
                        "surname": "User"
                    }
                },
                "purchase_units": [
                    {
                        "payments": {
                            "captures": [
                                {
                                    "id": f"MOCK_CAPTURE_{uuid.uuid4().hex[:8].upper()}",
                                    "status": "COMPLETED",
                                    "amount": {
                                        "currency_code": settings.PAYPAL_CURRENCY,
                                        "value": str(settings.PAYPAL_PREMIUM_PRICE)
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        
        return {}
    
    try:
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
            logger.error(f"PayPal API error: {response.status_code} - {detail}")
            raise PayPalError(detail)
        
        return data
    except requests.RequestException as e:
        logger.error(f"PayPal API request failed: {str(e)}")
        raise PayPalError(f"PayPal connection failed: {str(e)}")


class PayPalConfigView(APIView):
    """
    Endpoint: GET /api/payments/paypal/config/
    
    Returns PayPal configuration needed for frontend checkout.
    Requires: Authentication
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return PayPal client configuration."""
        is_mock_mode = getattr(settings, 'PAYPAL_MOCK_MODE', False)
        client_id = settings.PAYPAL_CLIENT_ID
        
        # In mock mode, use a test client ID
        if is_mock_mode:
            client_id = "test-client-id-mock"
            logger.info("PayPal config in MOCK MODE")
        elif not client_id:
            logger.warning("PayPal config requested but client_id not configured")
            return Response(
                {"detail": "PayPal is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            "clientId": client_id,
            "currency": settings.PAYPAL_CURRENCY,
            "premiumPrice": settings.PAYPAL_PREMIUM_PRICE,
            "mode": settings.PAYPAL_MODE.lower(),
            "mockMode": is_mock_mode,
        })


class PayPalCreateOrderView(APIView):
    """
    Endpoint: POST /api/payments/paypal/orders/
    
    Create a PayPal order for the chosen plan.
    Requires: Authentication
    
    Request body:
    {
        "plan": "premium"  # Currently only "premium" is supported
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Create PayPal order."""
        plan = request.data.get("plan", "premium")
        
        # Validate plan
        if plan != "premium":
            logger.warning(f"User {request.user.id} requested unsupported plan: {plan}")
            return Response(
                {"detail": "Unsupported plan. Only 'premium' is available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        currency = settings.PAYPAL_CURRENCY
        amount = settings.PAYPAL_PREMIUM_PRICE

        # PayPal order payload
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "description": f"TuneQuest Premium Subscription ({currency} {amount})",
                    "custom_id": f"{request.user.id}:{plan}",
                    "amount": {
                        "currency_code": currency,
                        "value": str(amount),
                    },
                }
            ],
        }

        try:
            logger.info(f"Creating PayPal order for user {request.user.id}, plan: {plan}")
            order_data = _paypal_request("POST", "/v2/checkout/orders", payload=payload)
            order_id = order_data.get("id")
            
            if not order_id:
                logger.error("PayPal order created but no ID returned")
                raise PayPalError("PayPal order creation failed.")
            
            logger.info(f"Order created: {order_id}")
            return Response({"orderID": order_id}, status=status.HTTP_201_CREATED)
            
        except PayPalError as exc:
            logger.error(f"Order creation failed for user {request.user.id}: {str(exc)}")
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class PayPalCaptureOrderView(APIView):
    """
    Endpoint: POST /api/payments/paypal/orders/<order_id>/capture/
    
    Capture (finalize) a PayPal order and grant premium access.
    Requires: Authentication
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        """Capture PayPal order and activate subscription."""
        try:
            logger.info(f"Capturing PayPal order {order_id} for user {request.user.id}")
            capture_data = _paypal_request("POST", f"/v2/checkout/orders/{order_id}/capture", payload={})
            
        except PayPalError as exc:
            logger.error(f"Order capture failed: {str(exc)}")
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Extract payment details from response
        purchase_units = capture_data.get("purchase_units", [])
        payments = purchase_units[0].get("payments", {}) if purchase_units else {}
        captures = payments.get("captures", [])
        capture = captures[0] if captures else {}

        capture_id = capture.get("id")
        capture_status = capture.get("status", "UNKNOWN").upper()
        amount = capture.get("amount", {}).get("value", str(settings.PAYPAL_PREMIUM_PRICE))
        payer_email = (capture_data.get("payer") or {}).get("email_address", "unknown")
        payer_id = (capture_data.get("payer") or {}).get("payer_id")

        if not capture_id:
            logger.error(f"Order captured but no capture ID: {capture_data}")
            return Response(
                {"detail": "Unable to capture PayPal payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create/update subscription and payment records atomically
        try:
            with transaction.atomic():
                from datetime import timedelta
                from django.utils import timezone
                
                # Calculate end_date as 30 days from now
                end_date = timezone.now() + timedelta(days=30)
                
                # Get or create subscription
                subscription, _created = Subscription.objects.get_or_create(
                    user=request.user,
                    plan_type="premium",
                    defaults={
                        "subscription_status": "active" if capture_status == "COMPLETED" else "pending",
                        "paypal_payer_id": payer_id,
                        "paypal_subscription_id": order_id,
                        "auto_renew": False,
                        "end_date": end_date if capture_status == "COMPLETED" else None,
                    },
                )

                # Update subscription status
                subscription.subscription_status = "active" if capture_status == "COMPLETED" else "pending"
                subscription.paypal_payer_id = payer_id
                subscription.paypal_subscription_id = order_id
                subscription.auto_renew = False
                if capture_status == "COMPLETED":
                    subscription.end_date = end_date
                subscription.save()

                # Create payment record
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

                logger.info(f"Payment processed: {capture_id} for user {request.user.id}, status: {capture_status}")

        except Exception as e:
            logger.error(f"Database error during payment capture: {str(e)}")
            return Response(
                {"detail": "Payment captured but failed to update subscription. Please contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            "detail": "Payment captured successfully. Premium access activated.",
            "subscription": "premium",
            "status": capture_status,
            "transactionId": capture_id,
            "payerEmail": payer_email,
        })
