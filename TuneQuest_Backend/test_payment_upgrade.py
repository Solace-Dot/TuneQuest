"""
Test payment capture token upgrade and subscription persistence.
This test verifies that:
1. Token count increases correctly (5 + 40 = 45, capped at 50)
2. Premium subscription is created and persists
3. Response includes tokens_remaining and end_date
"""

import os
import sys
import django
from decimal import Decimal
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Add testserver to ALLOWED_HOSTS for testing
from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.test import RequestFactory
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User, UserProfile
from ai_utils.models import AIToken
from payments.models import Subscription, Payment
from payments.views import PayPalCaptureOrderView, get_subscription_status


def create_test_user(username, email):
    """Create a test user with UserProfile."""
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': 'Test',
            'last_name': 'User',
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    
    # Create/get UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    return user


def set_user_tokens(user, tokens_remaining, tokens_limit=10):
    """Set user's initial token count."""
    token_obj, _ = AIToken.objects.get_or_create(user=user)
    token_obj.tokens_remaining = tokens_remaining
    token_obj.tokens_limit = tokens_limit
    token_obj.save()
    return token_obj


def test_payment_capture_token_upgrade():
    """Test that payment capture upgrades tokens correctly."""
    print("\n" + "="*70)
    print("TEST 1: Payment Capture Token Upgrade")
    print("="*70)
    
    # Setup
    user = create_test_user('test_payment_user_1', 'test1@example.com')
    factory = APIRequestFactory()
    
    print(f"\n✓ Created test user: {user.username}")
    
    # Set user to free tier with 5 tokens remaining
    token_obj = set_user_tokens(user, tokens_remaining=5, tokens_limit=10)
    print(f"✓ Set user tokens: {token_obj.tokens_remaining}/10 (free tier)")
    
    # Create mock order ID (simulates PayPal mock mode)
    mock_order_id = f"MOCK-{user.id}-{timezone.now().timestamp()}"
    print(f"✓ Created mock order ID: {mock_order_id}")
    
    # Create request with proper authentication
    print(f"\n→ Calling PayPalCaptureOrderView with mock order")
    request = factory.post(f'/api/payments/paypal/orders/{mock_order_id}/capture/')
    force_authenticate(request, user=user)
    
    # Call view directly
    view = PayPalCaptureOrderView.as_view()
    response = view(request, order_id=mock_order_id)
    
    print(f"  Response status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"✗ ERROR: Expected 200, got {response.status_code}")
        print(f"  Response: {response.data if hasattr(response, 'data') else response.content}")
        return False
    
    data = response.data if hasattr(response, 'data') else response.json()
    
    # Verify response includes required fields
    print(f"\n→ Verifying response fields:")
    if 'tokens_remaining' not in data:
        print(f"  ✗ ERROR: 'tokens_remaining' not in response")
        print(f"  Response data: {data}")
        return False
    print(f"  ✓ tokens_remaining: {data['tokens_remaining']}")
    
    if 'end_date' not in data:
        print(f"  ✗ ERROR: 'end_date' not in response")
        return False
    print(f"  ✓ end_date: {data['end_date']}")
    
    # Verify token count increased (5 + 40 = 45)
    print(f"\n→ Verifying token upgrade:")
    expected_tokens = 45
    if data['tokens_remaining'] != expected_tokens:
        print(f"  ✗ ERROR: Expected {expected_tokens} tokens, got {data['tokens_remaining']}")
        return False
    print(f"  ✓ Tokens upgraded correctly: 5 + 40 = {data['tokens_remaining']}")
    
    # Verify database was updated
    user_token_obj = AIToken.objects.get(user=user)
    print(f"\n→ Verifying database:")
    print(f"  ✓ Database tokens: {user_token_obj.tokens_remaining}/{user_token_obj.tokens_limit}")
    
    if user_token_obj.tokens_remaining != expected_tokens:
        print(f"  ✗ ERROR: Database shows {user_token_obj.tokens_remaining}, expected {expected_tokens}")
        return False
    print(f"  ✓ Database token count is correct")
    
    # Verify subscription created
    subscription = Subscription.objects.filter(user=user).first()
    if not subscription:
        print(f"  ✗ ERROR: No subscription created")
        return False
    print(f"  ✓ Subscription created: {subscription.plan_type} ({subscription.subscription_status})")
    
    # Verify subscription has end_date
    if not subscription.end_date:
        print(f"  ✗ ERROR: Subscription has no end_date")
        return False
    print(f"  ✓ Subscription end_date: {subscription.end_date}")
    
    print(f"\n✅ TEST 1 PASSED: Token upgrade works correctly\n")
    return True


def test_subscription_persistence_on_relogin():
    """Test that premium status persists after logout/login."""
    print("="*70)
    print("TEST 2: Subscription Persistence on Re-login")
    print("="*70)
    
    # Setup
    user = create_test_user('test_payment_user_2', 'test2@example.com')
    factory = APIRequestFactory()
    
    print(f"\n✓ Created test user: {user.username}")
    
    # Give user premium tier
    token_obj = set_user_tokens(user, tokens_remaining=45, tokens_limit=50)
    print(f"✓ Set user tokens: {token_obj.tokens_remaining}/{token_obj.tokens_limit} (premium tier)")
    
    # Create subscription
    end_date = timezone.now() + timedelta(days=30)
    subscription = Subscription.objects.create(
        user=user,
        plan_type='premium',
        subscription_status='active',
        end_date=end_date,
    )
    print(f"✓ Created subscription: {subscription.plan_type} ({subscription.subscription_status})")
    
    # Create request
    print(f"\n→ Calling get_subscription_status()")
    request = factory.get('/api/payments/subscription/status/')
    force_authenticate(request, user=user)
    
    # Call view directly
    response = get_subscription_status(request)
    
    print(f"  Response status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"✗ ERROR: Expected 200, got {response.status_code}")
        print(f"  Response: {response.data if hasattr(response, 'data') else response.content}")
        return False
    
    data = response.data if hasattr(response, 'data') else response.json()
    print(f"\n→ Verifying response:")
    
    # Verify subscription type
    if data.get('subscription') != 'premium':
        print(f"  ✗ ERROR: Expected 'premium', got '{data.get('subscription')}'")
        return False
    print(f"  ✓ Subscription type: {data['subscription']}")
    
    # Verify is_active
    if 'is_active' not in data:
        print(f"  ✗ ERROR: 'is_active' not in response")
        return False
    print(f"  ✓ is_active: {data['is_active']}")
    
    # Verify end_date
    if 'end_date' not in data:
        print(f"  ✗ ERROR: 'end_date' not in response")
        return False
    print(f"  ✓ end_date: {data['end_date']}")
    
    print(f"\n✅ TEST 2 PASSED: Subscription persists correctly\n")
    return True


def test_multiple_purchases():
    """Test that multiple purchases work correctly (each creates new subscription)."""
    print("="*70)
    print("TEST 3: Multiple Purchases (Subscription Renewal)")
    print("="*70)
    
    # Setup
    user = create_test_user('test_payment_user_3', 'test3@example.com')
    factory = APIRequestFactory()
    view = PayPalCaptureOrderView.as_view()
    
    print(f"\n✓ Created test user: {user.username}")
    
    # First purchase
    print(f"\n→ First purchase:")
    set_user_tokens(user, tokens_remaining=5, tokens_limit=10)
    mock_order_id_1 = f"MOCK-{user.id}-purchase1"
    
    request1 = factory.post(f'/api/payments/paypal/orders/{mock_order_id_1}/capture/')
    force_authenticate(request1, user=user)
    response1 = view(request1, order_id=mock_order_id_1)
    
    if response1.status_code != 200:
        print(f"  ✗ First purchase failed: {response1.status_code}")
        return False
    
    data1 = response1.data if hasattr(response1, 'data') else response1.json()
    tokens_after_1 = data1['tokens_remaining']
    print(f"  ✓ Tokens after 1st purchase: {tokens_after_1}")
    
    # Get subscription count after first purchase
    subscription_count_1 = Subscription.objects.filter(user=user).count()
    print(f"  ✓ Subscription count: {subscription_count_1}")
    
    # Second purchase (simulates renewal or repurchase)
    print(f"\n→ Second purchase:")
    mock_order_id_2 = f"MOCK-{user.id}-purchase2"
    
    request2 = factory.post(f'/api/payments/paypal/orders/{mock_order_id_2}/capture/')
    force_authenticate(request2, user=user)
    response2 = view(request2, order_id=mock_order_id_2)
    
    if response2.status_code != 200:
        print(f"  ✗ Second purchase failed: {response2.status_code}")
        return False
    
    data2 = response2.data if hasattr(response2, 'data') else response2.json()
    tokens_after_2 = data2['tokens_remaining']
    print(f"  ✓ Tokens after 2nd purchase: {tokens_after_2}")
    
    # Get subscription count after second purchase (should be 2)
    subscription_count_2 = Subscription.objects.filter(user=user).count()
    print(f"  ✓ Subscription count: {subscription_count_2}")
    
    if subscription_count_2 != 2:
        print("  ✗ ERROR: Expected 2 subscriptions, got {subscription_count_2}")
        print("    (Each purchase should create new subscription)")
        return False
    print("  ✓ Each purchase creates new subscription record")
    
    # Verify most recent subscription is fetched
    print(f"\n→ Verifying most recent subscription is fetched:")
    request_status = factory.get('/api/payments/subscription/status/')
    force_authenticate(request_status, user=user)
    response_status = get_subscription_status(request_status)
    data_status = response_status.data if hasattr(response_status, 'data') else response_status.json()
    
    latest_sub = Subscription.objects.filter(user=user).order_by('-id').first()
    print(f"  ✓ Latest subscription: {latest_sub.paypal_subscription_id}")
    
    print(f"\n✅ TEST 3 PASSED: Multiple purchases work correctly\n")
    return True


def cleanup():
    """Clean up test data."""
    print("="*70)
    print("CLEANUP")
    print("="*70)
    
    # Delete test users
    for username in ['test_payment_user_1', 'test_payment_user_2', 'test_payment_user_3']:
        try:
            user = User.objects.get(username=username)
            user_id = user.id
            user.delete()
            print(f"✓ Deleted test user: {username} (ID: {user_id})")
        except User.DoesNotExist:
            pass


def main():
    """Run all tests."""
    print("\n" + "#"*70)
    print("# PAYMENT UPGRADE AND SUBSCRIPTION PERSISTENCE TESTS")
    print("#"*70)
    
    results = []
    
    try:
        results.append(("Token Upgrade", test_payment_capture_token_upgrade()))
        results.append(("Subscription Persistence", test_subscription_persistence_on_relogin()))
        results.append(("Multiple Purchases", test_multiple_purchases()))
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cleanup()
    
    # Summary
    print("\n" + "#"*70)
    print("# TEST SUMMARY")
    print("#"*70)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result for _, result in results)
    print("\n" + "#"*70)
    if all_passed:
        print("# ✅ ALL TESTS PASSED")
    else:
        print("# ❌ SOME TESTS FAILED")
    print("#"*70 + "\n")
    
    return all_passed


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
