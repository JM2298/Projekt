import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


@database_sync_to_async
def save_message(sender, receiver, message):
    # Zapisujemy wiadomość w bazie danych
    from .models import Message
    message = Message.objects.create(nadawca_id=sender, odbiorca_id=receiver, message=message)
    
    print(f"Saved message from {sender} to {receiver}: {message}")

class ChatConsumer(AsyncWebsocketConsumer):
   


    async def connect(self):
        # Pobieramy identyfikator użytkownika z URL (np. 'user_id')
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.user_group_name = f'user_{self.user_id}'
        
        # Dołączamy kanał do grupy dedykowanej danemu użytkownikowi
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"User {self.user_id} connected with channel: {self.channel_name}")

    async def disconnect(self, close_code):
        # Usuwamy połączenie z grupy przy rozłączeniu
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )
        print(f"User {self.user_id} disconnected.")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            print("Received invalid JSON")
        message = data.get('message', '')
        sender = data.get('nadawca', '')
        receiver = data.get('odbiorca', '')
        await save_message(sender, receiver, message)
        


        # Wyznaczamy grupę odbiorcy – sprawdź, czy wartość 'odbiorca' jest zgodna z tym, co ustalasz przy łączeniu
        receiver_group_name = f'user_{receiver}'
        
        print(f"Routing message to group: {receiver_group_name}")

        # Przekazujemy wiadomość do odpowiedniej grupy
        await self.channel_layer.group_send(
            receiver_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'nadawca': sender,
                'odbiorca': receiver,
            }
        )
        

    async def chat_message(self, event):
        message = event['message']
        sender = event['nadawca']
        receiver = event['odbiorca']
        print(f"Dispatching message to user {self.user_id}: {message}")
        await self.send(text_data=json.dumps({
            'message': message,
            'nadawca': sender,
            'odbiorca': receiver,
        }))
        
