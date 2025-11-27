from rest_framework import serializers
from .models import Message, Friendship
from django.contrib.auth import get_user_model

User = get_user_model()

class MessageSerializer(serializers.ModelSerializer):

    nadawca_display_name = serializers.ReadOnlyField(source='nadawca.display_name')
    odbiorca_display_name = serializers.ReadOnlyField(source='odbiorca.display_name')
    class Meta:
        model = Message
        fields = ['id', 'message', 'created', 'nadawca', 'odbiorca', 'nadawca_display_name', 'odbiorca_display_name']






class FriendshipSerializer(serializers.ModelSerializer):
    # Używamy pola do zapisu tylko nazwy użytkownika przyjaciela
    friend_username = serializers.CharField(write_only=True)
    # Do odczytu korzystamy z ReadOnlyField, aby nie próbować przypisywać wartości do obiektu
    friend = serializers.ReadOnlyField(source='friend.username')
    user_display_name = serializers.CharField(source='user.display_name', read_only=True)
    user_mordka = serializers.CharField(source='user.character', read_only=True)
    user_opis = serializers.CharField(source='user.opis', read_only=True)
    user_bot = serializers.BooleanField(source='user.bot', read_only=True)
    user_endpoint = serializers.URLField(source='user.endpoint', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    friend_display_name = serializers.CharField(source='friend.display_name', read_only=True)
    friend_mordka = serializers.CharField(source='friend.character', read_only=True)
    friend_opis = serializers.CharField(source='friend.opis', read_only=True)
    friend_status = serializers.CharField(source='friend.status', read_only=True)
    friend_bot = serializers.BooleanField(source='friend.bot', read_only=True)
    friend_endpoint = serializers.URLField(source='friend.endpoint', read_only=True)
    friend_id = serializers.IntegerField(source='friend.id', read_only=True)
    


    class Meta:
        model = Friendship
        fields = ('id', 'friend', 'friend_username', 'friend_message', 'accepted', 'created', 'user_display_name', 'user_mordka', 'user_opis', 'user_bot', 'user_endpoint', 'user_id', 'friend_display_name', 'friend_mordka', \
                  'friend_opis', 'friend_status', 'friend_bot', 'friend_endpoint', 'friend_id', 'last_view_contact')
        read_only_fields = ('created',)
    
    
    
    



User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'display_name', 'username', 'email', 'character']



