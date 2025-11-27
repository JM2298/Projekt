from django.contrib import admin
from .models import Friendship
from .models import Message

# Register your models here.


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "friend", "accepted", "created", "last_view_contact")
    list_filter = ("accepted", "created")
    search_fields = ("user__username", "friend__username")
    autocomplete_fields = ("user", "friend")
    readonly_fields = ("created",)
    date_hierarchy = "created"
    ordering = ("-created",)
    list_select_related = ("user", "friend")
    actions = ["mark_accepted", "mark_unaccepted"]

    def mark_accepted(self, request, queryset):
        count = queryset.update(accepted=True)
        self.message_user(request, f"{count} marked accepted.")

    def mark_unaccepted(self, request, queryset):
        count = queryset.update(accepted=False)
        self.message_user(request, f"{count} marked unaccepted.")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "nadawca", "odbiorca", "short_message", "created")
    search_fields = ("nadawca__username", "odbiorca__username", "message")
    autocomplete_fields = ("nadawca", "odbiorca")
    readonly_fields = ("created",)
    date_hierarchy = "created"
    ordering = ("-created",)
    list_select_related = ("nadawca", "odbiorca")

    def short_message(self, obj):
        return obj.message[:50]
    short_message.short_description = "Message"
