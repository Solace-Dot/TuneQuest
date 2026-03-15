from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import pytz

from .models import User, UserProfile
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response(tokens, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            # Return 200 with error message instead of 400 to avoid console errors
            error_message = next(iter(serializer.errors.values()))[0] if serializer.errors else "Login failed"
            return Response(
                {"error": str(error_message)},
                status=status.HTTP_200_OK
            )
        user = serializer.validated_data["user"]
        tokens = get_tokens_for_user(user)
        return Response(tokens, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        user_data = {}
        profile_data = {}
        
        # Extract user fields
        if 'first_name' in request.data:
            user_data['first_name'] = request.data['first_name']
        if 'last_name' in request.data:
            user_data['last_name'] = request.data['last_name']
        
        # Extract profile fields
        if 'skill_level' in request.data:
            profile_data['skill_level'] = request.data['skill_level']
        if 'instrument' in request.data:
            profile_data['instrument_name'] = request.data['instrument']
        if 'learning_goal' in request.data:
            profile_data['learning_goal_text'] = request.data['learning_goal']
        if 'bio' in request.data:
            profile_data['bio'] = request.data['bio']
        
        # Update user fields
        if user_data:
            for key, value in user_data.items():
                setattr(user, key, value)
            user.save()
        
        # Update or create UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        if profile_data:
            for key, value in profile_data.items():
                setattr(profile, key, value)
        profile.save()
        
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def delete(self, request):
        """Delete the authenticated user's account permanently."""
        user = request.user
        user_id = user.id
        user_email = user.email
        user.delete()
        return Response(
            {"detail": f"Account {user_email} has been permanently deleted."},
            status=status.HTTP_204_NO_CONTENT,
        )


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Placeholder (email sending later)
        email = request.data.get("email")
        if not User.objects.filter(email=email).exists():
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"detail": "Password reset link sent"},
            status=status.HTTP_200_OK,
        )


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh view that tracks the date tokens are refreshed at midnight PT.
    Extends the default SimplJWT TokenRefreshView to log refresh dates for audit purposes.
    """

    def post(self, request, *args, **kwargs):
        """
        Override the post method to track token refresh dates at midnight PT.
        """
        response = super().post(request, *args, **kwargs)
        
        # If token refresh was successful, update the user's last_token_refresh_date
        if response.status_code == 200:
            try:
                # Get the user from the refresh token
                refresh_token_str = request.data.get('refresh')
                if refresh_token_str:
                    refresh_token = RefreshToken(refresh_token_str)
                    user_id = refresh_token.payload.get('user_id')
                    if user_id:
                        user = User.objects.get(id=user_id)
                        # Get current date in Pacific Time
                        pt_tz = pytz.timezone('America/Los_Angeles')
                        current_date_pt = datetime.now(pt_tz).date()
                        user.last_token_refresh_date = current_date_pt
                        user.save(update_fields=['last_token_refresh_date'])
            except Exception as e:
                # Log the error but don't fail the token refresh
                print(f'[TokenRefresh] Error updating refresh date: {str(e)}')
        
        return response


class ProfileCompletionView(APIView):
    """
    API endpoints for fetching and saving user profile completion status.
    
    GET /api/auth/profile-completion/ - Fetch profile completion status
    POST /api/auth/profile-completion/ - Save profile completion status
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Fetch the user's profile completion status."""
        from .models import ProfileCompletion
        
        try:
            profile_completion = ProfileCompletion.objects.get(user=request.user)
            return Response({
                'is_completed': profile_completion.is_completed,
                'instrument_name': profile_completion.instrument_name,
                'skill_level': profile_completion.skill_level,
                'completed_at': profile_completion.completed_at,
            })
        except ProfileCompletion.DoesNotExist:
            # Return default state if not yet created
            return Response({
                'is_completed': False,
                'instrument_name': '',
                'skill_level': '',
                'completed_at': None,
            })
    
    def post(self, request):
        """Save or update profile completion status."""
        from .models import ProfileCompletion
        from django.utils import timezone
        
        is_completed = request.data.get('is_completed', False)
        instrument_name = request.data.get('instrument_name', '')
        skill_level = request.data.get('skill_level', '')
        
        profile_completion, created = ProfileCompletion.objects.get_or_create(user=request.user)
        
        profile_completion.is_completed = is_completed
        profile_completion.instrument_name = instrument_name
        profile_completion.skill_level = skill_level
        
        # Set completed_at only when profile is marked as completed
        if is_completed and not profile_completion.completed_at:
            profile_completion.completed_at = timezone.now()
        
        profile_completion.save()
        
        return Response({
            'success': True,
            'is_completed': profile_completion.is_completed,
            'instrument_name': profile_completion.instrument_name,
            'skill_level': profile_completion.skill_level,
            'completed_at': profile_completion.completed_at,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

