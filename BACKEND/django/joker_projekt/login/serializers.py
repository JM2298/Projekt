from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """Serializer used to validate login credentials."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        if username and password:
            user = authenticate(
                request=self.context.get("request"),
                username=username,
                password=password,
            )
        else:
            msg = _("Username and password are required.")
            raise serializers.ValidationError(msg, code="authorization")

        if not user:
            msg = _("Unable to log in with provided credentials.")
            raise serializers.ValidationError(msg, code="authorization")

        attrs["user"] = user
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer used to register new users."""

    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = get_user_model()
        fields = ("username", "email", "password", "password_confirm")

    def validate_username(self, value):
        user_model = self.Meta.model
        if user_model.objects.filter(username=value).exists():
            raise serializers.ValidationError(_("A user with that username already exists."))
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.pop("password_confirm", None)

        if password != password_confirm:
            raise serializers.ValidationError({"password_confirm": _("Passwords do not match.")})

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user_model = self.Meta.model
        user = user_model(**validated_data)

        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc

        user.set_password(password)
        user.save()
        return user
