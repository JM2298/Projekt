from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from .models import Message
from .serializers import MessageSerializer, User, UserSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from django.utils.dateparse import parse_datetime


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet do obsługi wiadomości czatu.
    """
    serializer_class = MessageSerializer
    queryset = Message.objects.all()




    @action(detail=False, methods=['get'], url_path='conversation/(?P<odbiorca_id>[^/.]+)/(?P<ileWiadomosciWstecz>\d+)')
    def get_conversation(self, request, odbiorca_id=None, ileWiadomosciWstecz=None):
        max_messages = 100
        try:
            ileWiadomosciWstecz = min(int(ileWiadomosciWstecz), max_messages)
        except (ValueError, TypeError):
            return Response(
                {"error": "Wartość 'ileWiadomosciWstecz' musi być liczbą całkowitą."},
                status=400
            )

        conversation = Message.objects.filter(
            Q(nadawca_id=request.user.id, odbiorca_id=odbiorca_id) |
            Q(nadawca_id=odbiorca_id, odbiorca_id=request.user.id)
        )

        from_timestamp = request.query_params.get('from')
        if from_timestamp:
            parsed_timestamp = parse_datetime(from_timestamp)
            if not parsed_timestamp:
                return Response(
                    {"error": "Nieprawidłowy format parametru 'from'. Użyj ISO 8601."},
                    status=400
                )
            if timezone.is_naive(parsed_timestamp):
                parsed_timestamp = timezone.make_aware(parsed_timestamp, timezone.get_default_timezone())

            conversation = conversation.filter(created__gte=parsed_timestamp)

        conversation = conversation.order_by('-created')

        messages = list(conversation[:ileWiadomosciWstecz])[::-1]

        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)
    


    @action(detail=False, methods=['get'], url_path='(?P<nadawca_id>[^/.]+)/last_hour')
    def room_last_hour(self, request, nadawca_id=None):
        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)
        messages_last_hour = Message.objects.filter(
            Q(nadawca_id=request.user.id, odbiorca_id=nadawca_id) |
            Q(nadawca_id=nadawca_id, odbiorca_id=request.user.id),
            created__gte=one_hour_ago
        ).order_by('created')
        messages_last_hour = list(messages_last_hour)
        if len(messages_last_hour) < 10:
            missing = 10 - len(messages_last_hour)
            extra_messages = Message.objects.filter(
            Q(nadawca_id=request.user.id, odbiorca_id=nadawca_id) |
            Q(nadawca_id=nadawca_id, odbiorca_id=request.user.id),
            created__lt=one_hour_ago
            ).order_by('-created')[:missing]
            extra_messages = list(extra_messages)[::-1]
            combined_messages = extra_messages + messages_last_hour
        else:
            combined_messages = messages_last_hour
        serializer = MessageSerializer(combined_messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post'], url_path='room/(?P<room_name>[^/.]+)')
    def room(self, request, room_name=None):
        cache_key = f'chat_room_{room_name}_messages'
        
        if request.method == 'GET':
            # Sprawdź, czy odpowiedź dla danego pokoju jest już w cache
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)
            
            # Jeśli brak danych w cache – pobierz z bazy
            messages = Message.objects.filter(room_name=room_name)
            serializer = self.get_serializer(messages, many=True)
            data = {
                "room_name": room_name,
                "messages": serializer.data
            }
            # Zapisz dane do cache na 60 sekund (możesz zmienić timeout)
            cache.set(cache_key, data, timeout=60)
            return Response(data)

        elif request.method == 'POST':
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                serializer.save(room_name=room_name)
                # Po zapisaniu nowej wiadomości czyścimy cache, aby kolejne GET zwracały zaktualizowane dane
                cache.delete(cache_key)
                return Response({
                    "status": "Wiadomość odebrana",
                    "room": room_name,
                    "message": serializer.data
                })
            else:
                return Response(serializer.errors, status=400)
            

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Friendship
from .serializers import FriendshipSerializer
from django.contrib.auth import get_user_model
from rest_framework import viewsets, serializers
from django.utils import timezone
from datetime import timedelta
#import requests
#import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

class FriendshipViewSet(viewsets.ModelViewSet):
    """
    Endpoint do zarządzania relacjami znajomych.
    Użytkownik zalogowany (request.user) wysyła zaproszenie do znajomego.
    Drugi endpoint umożliwia zaakceptowanie zaproszenia.
    """
    permission_classes = [IsAuthenticated]
    
    serializer_class = FriendshipSerializer

    queryset = Friendship.objects.all()

    
    
    def create(self, request, *args, **kwargs):
        friend_username = request.data.get('friend_username')
        if not friend_username:
            return Response({"error": "friend_username jest wymagany."}, status=400)
        try:
            friend = User.objects.get(username=friend_username)
        except User.DoesNotExist:
            return Response({"friend_username": "Użytkownik o podanej nazwie nie istnieje."}, status=400)
        # Walidacja dodatkowych danych (jeśli są) odbywa się przez serializer.
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # if friend.bot:
        #     friendship = Friendship.objects.create(
        #         user=request.user,
        #         friend=friend,
        #         friend_message=serializer.validated_data.get('friend_message', ''),
        #         accepted=True
        #     )
        # else:
        # Tworzymy zaproszenie, ustawiając zalogowanego użytkownika jako nadawcę.
        friendship = Friendship.objects.create(
            user=request.user,
            friend=friend,
            friend_message=serializer.validated_data.get('friend_message', ''),
            accepted=False
        )
        output_serializer = self.get_serializer(friendship)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)



    

    @action(detail=True, methods=['patch'])
    def update_accepted(self, request, pk=None):
        friendship = get_object_or_404(Friendship, pk=pk, friend=request.user)
        # Use serializer for partial update to modify the 'accepted' field
        serializer = self.get_serializer(friendship, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response({"error": "Nie masz uprawnień do usunięcia tego kontaktu."}, status=status.HTTP_403_FORBIDDEN)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'], url_path='invitations', permission_classes=[IsAuthenticated])
    def invitations(self, request):
        invitations = Friendship.objects.filter(friend_id=request.user.id, accepted=False)
        serializer = self.get_serializer(invitations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='friends', permission_classes=[IsAuthenticated])
    def friends(self, request):
        friends = Friendship.objects.filter(user_id=request.user.id, accepted=True)
        serializer = self.get_serializer(friends, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'], url_path='last-view-contact')
    def last_view_contact(self, request):
        friend_id = request.data.get('friend-id')
        if not friend_id:
            return Response({"error": "friend-id jest wymagany."}, status=400)
        
        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({"error": "Użytkownik o podanej nazwie nie istnieje."}, status=400)
        
        friendship = get_object_or_404(Friendship, user=request.user, friend=friend)
        friendship.last_view_contact = timezone.now()
        friendship.save()
        
        serializer = self.get_serializer(friendship)
        return Response(serializer.data)
    
  




class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint to retrieve all users.
    """

    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserSerializer


class MessageViewSet(viewsets.ModelViewSet):
    """
    Endpoint to retrieve all messages.
    """

    permission_classes = [IsAuthenticated]
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    @action(detail=False, methods=['get'], url_path='last')
    def last_message(self, request):
        sender_id = request.query_params.get('nadawca')
        
        last_msg = self.get_queryset().filter(nadawca_id=sender_id).order_by('-created').first()
        
        
        if last_msg:
            serializer = self.get_serializer(last_msg)
            return Response(serializer.data)
        return Response({"error": "No messages available."}, status=404)

    



    
   

    


        



    

    



    
   

    