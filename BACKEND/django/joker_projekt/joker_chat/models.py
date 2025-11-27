# Create your models here.
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.utils.text import slugify

User = get_user_model()

class Message(models.Model):
    nadawca = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='nadawca',
        
    )
    odbiorca = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='odbiorca',
        
    )
    message = models.TextField()
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.created}: {self.message[:50]}"
    

class Friendship(models.Model):
    user = models.ForeignKey(User, related_name='friendships', on_delete=models.CASCADE)
    friend = models.ForeignKey(User, related_name='friends_of', on_delete=models.CASCADE)
    friend_message = models.TextField(max_length=150, blank=True)
     
    accepted = models.BooleanField(default=False)  # Czy relacja została zaakceptowana
    created = models.DateTimeField(auto_now_add=True)
    last_view_contact = models.DateTimeField(null=True, blank=True)

    



    class Meta:
        unique_together = ('user', 'friend')

    def __str__(self):
        return f"{self.user.username} ↔ {self.friend.username} (accepted: {self.accepted})"
    
