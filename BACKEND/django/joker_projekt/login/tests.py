from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken


class LoginAPITestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@example.com",
            password="strong-password",
        )
        self.url = reverse("login:login")

    def test_login_returns_jwt_tokens(self):
        response = self.client.post(
            self.url,
            {"username": "testuser", "password": "strong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        refresh = RefreshToken(response.data["refresh"])
        self.assertEqual(refresh["user_id"], self.user.id)

        try:
            access_payload = AccessToken(response.data["access"]).payload
        except TokenError:
            self.fail("Access token returned by login endpoint is invalid")

        self.assertEqual(access_payload["user_id"], self.user.id)

    def test_login_with_invalid_credentials_fails(self):
        response = self.client.post(
            self.url,
            {"username": "testuser", "password": "wrong"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
