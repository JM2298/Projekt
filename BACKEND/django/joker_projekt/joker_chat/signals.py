from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Friendship

@receiver(post_save, sender=Friendship)
def handle_symmetric_friendship(sender, instance, created, **kwargs):
    """
    Jeśli relacja została zaakceptowana, tworzymy (lub utrzymujemy) symetryczną relację,
    a jeśli nie – usuwamy ewentualną symetryczną relację.
    """
    if instance.accepted:
        # Jeśli relacja jest zaakceptowana, upewnij się, że istnieje symetryczna relacja
        if not Friendship.objects.filter(user=instance.friend, friend=instance.user, accepted=True).exists():
            Friendship.objects.create(user=instance.friend, friend=instance.user, accepted=True)
    else:
        # Jeśli nie zaakceptowano, usuwamy symetryczną relację, jeśli istnieje
        Friendship.objects.filter(user=instance.friend, friend=instance.user).delete()

@receiver(post_delete, sender=Friendship)
def delete_symmetric_friendship(sender, instance, **kwargs):
    """
    Usuwamy symetryczną relację, gdy usunięta zostanie jedna strona.
    """
    Friendship.objects.filter(user=instance.friend, friend=instance.user).delete()