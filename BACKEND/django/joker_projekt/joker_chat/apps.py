from django.apps import AppConfig


class JokerChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'joker_chat'

    def ready(self):
        import joker_chat.signals  # import sygnałów, aby zostały zarejestrowane
