from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User, UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ("skill_level", "instrument_name", "learning_goal_text", "bio")

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ("id", "email", "username", "first_name", "last_name", "profile")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "username", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        email = data["email"]
        password = data["password"]
        
        # Check if user exists first
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("This account doesn't exist. Sign up to create one.")
        
        # Now authenticate with password
        user = authenticate(email=email, password=password)
        if not user:
            raise serializers.ValidationError("Incorrect password. Please try again.")
        
        data["user"] = user
        return data
