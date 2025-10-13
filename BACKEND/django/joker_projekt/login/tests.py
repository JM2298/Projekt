from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


class LoginAPITestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="testuser",
            email="test@example.com",
            password="strong-password",
        )
        self.url = reverse("login:login")

    def test_login_returns_token(self):
        response = self.client.post(
            self.url,
            {"username": "testuser", "password": "strong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertTrue(Token.objects.filter(key=response.data["token"], user=self.user).exists())

    def test_login_with_invalid_credentials_fails(self):
        response = self.client.post(
            self.url,
            {"username": "testuser", "password": "wrong"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("token", response.data)
