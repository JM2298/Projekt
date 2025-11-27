from rest_framework.routers import DefaultRouter


from .api_views import ChatMessageViewSet, FriendshipViewSet, MessageViewSet, UserViewSet
from django.urls import include, path

router = DefaultRouter()
router.register(r'messages', ChatMessageViewSet, basename='chat-message')
router.register(r'friendships', FriendshipViewSet, basename='friendships')
router.register(r'wiadomosci', MessageViewSet, basename='wiadomosci')
router.register(r'users', UserViewSet, basename='users')


urlpatterns = [
    path('joker-chat/', include(router.urls)),

]