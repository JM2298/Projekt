from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model

User = get_user_model()

class ZapytaniaDoBota(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Calculate allowed messages based on user level (poziom).
        poziom = getattr(user, 'poziom', None)
        if poziom and 1 <= poziom <= 10:
            allowed_messages = poziom * 5
        else:
            allowed_messages = 50  # Default limit for levels above 10 or unspecified.

        if getattr(user, 'zapytania', 0) >= allowed_messages:
            return False

        user.zapytania = getattr(user, 'zapytania', 0) + 1
        user.save(update_fields=['zapytania'])

        return True

