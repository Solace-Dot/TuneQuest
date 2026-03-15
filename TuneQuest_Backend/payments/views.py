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
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """Cancel user's active premium subscription."""
    try:
        subscription = Subscription.objects.filter(
            user=request.user,
            plan_type='premium',
            subscription_status='active'
        ).order_by('-id').first()  # Get most recent subscription
        
        if not subscription:
            return Response({
                'detail': 'No active premium subscription to cancel.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Mark subscription as cancelled
        subscription.subscription_status = 'cancelled'
        subscription.save()
        
        # Reset user premium status
        request.user.is_premium = False
        request.user.premium_end_date = None
        request.user.save(update_fields=['is_premium', 'premium_end_date'])
        
        # Reset tokens back to free tier (keep tokens_remaining but cap tokens_limit at 10)
        token_obj = request.user.ai_token
        if token_obj:
            # When downgrading, keep tokens_remaining but cap at free tier limit
            token_obj.tokens_remaining = min(token_obj.tokens_remaining, 10)
            token_obj.tokens_limit = 10
            token_obj.save()
        
        logger.info(f"Subscription cancelled for user {request.user.id}")
        logger.info(f"User {request.user.id} downgraded to free tier, tokens reset")
        
        return Response({
            'detail': 'Your Premium subscription has been cancelled. Access will continue until the end of your billing period.',
            'subscription': 'free'
        })
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}", exc_info=True)
        return Response({
            'detail': 'Failed to cancel subscription. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_status(request):
    """Fetch current subscription status for authenticated user."""
    try:
        # Check User.is_premium field directly (source of truth)
        if request.user.is_premium:
            # Verify premium hasn't expired
            from django.utils import timezone
            now = timezone.now()
            if request.user.premium_end_date and now >= request.user.premium_end_date:
                # Premium has expired, mark as free
                request.user.is_premium = False
                request.user.save(update_fields=['is_premium'])
                return Response({
                    'subscription': 'free',
                    'end_date': None,
                    'days_remaining': None,
                    'is_active': False,
                })
            
            # Premium is active
            from datetime import timedelta as td
            days_remaining = (request.user.premium_end_date - now).days if request.user.premium_end_date else 0
            
            return Response({
                'subscription': 'premium',
                'end_date': request.user.premium_end_date,
                'days_remaining': days_remaining,
                'is_active': True,
            })
        else:
            return Response({
                'subscription': 'free',
                'end_date': None,
                'days_remaining': None,
                'is_active': False,
            })
    except Exception as e:
        logger.error(f"Error fetching subscription status: {str(e)}", exc_info=True)
        return Response({
            'subscription': 'free',
            'end_date': None,
            'days_remaining': None,
            'is_active': False,
        })


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
        tokens_remaining = None  # Will be set after successful payment
        try:
            from datetime import timedelta
            from django.utils import timezone
            from ai_utils.models import AIToken
            
            with transaction.atomic():
                # Calculate end_date as 30 days from now
                end_date = timezone.now() + timedelta(days=30)
                
                # Create new subscription record (always create new for each purchase)
                subscription = Subscription.objects.create(
                    user=request.user,
                    plan_type="premium",
                    subscription_status="active" if capture_status == "COMPLETED" else "pending",
                    paypal_payer_id=payer_id,
                    paypal_subscription_id=order_id,
                    auto_renew=False,
                    end_date=end_date if capture_status == "COMPLETED" else None,
                )

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
                
                # If payment is successful, upgrade AI tokens (add 40 to existing)
                if capture_status == "COMPLETED":
                    token_obj, created = AIToken.objects.get_or_create(
                        user=request.user,
                        defaults={'tokens_remaining': 50, 'tokens_limit': 10},
                    )
                    
                    # If user was on free tier (limit=10), add 40 tokens. If new user, start at 50.
                    if created:
                        # New user, upgrading directly to premium with 50 tokens
                        token_obj.tokens_remaining = 50
                        token_obj.tokens_limit = 50
                    elif token_obj.tokens_limit == 10:
                        # Existing free tier user, add 40 tokens with cap at 50
                        token_obj.tokens_remaining = min(token_obj.tokens_remaining + 40, 50)
                        token_obj.tokens_limit = 50
                    
                    token_obj.save()
                    tokens_remaining = token_obj.tokens_remaining
                    
                    # Update User model: mark as premium
                    request.user.is_premium = True
                    request.user.premium_end_date = end_date
                    request.user.save(update_fields=['is_premium', 'premium_end_date'])
                    
                    logger.info(f"Premium tokens upgraded for user {request.user.id}: {token_obj.tokens_remaining}/50")
                    logger.info(f"User {request.user.id} marked as premium until {end_date}")

                logger.info(f"Payment processed: {capture_id} for user {request.user.id}, status: {capture_status}")

        except Exception as e:
            logger.error(f"Database error during payment capture: {str(e)}", exc_info=True)
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
            "tokens_remaining": tokens_remaining if capture_status == "COMPLETED" else None,
            "end_date": str(end_date) if capture_status == "COMPLETED" else None,
        })
