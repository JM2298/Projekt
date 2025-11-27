import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Populate the database with demo users and Polish locations."

    MAX_CHARACTER_VALUES = {
        "usta": 2,
        "twarz": 3,
        "wlosy": 8,
        "dodatek": 4,
        "kolorSkory": 2,
        "kolorWlosow": 3,
    }

    LOCATION_TYPE_CHOICES = [choice for choice, _ in get_user_model().LOCATION_TYPE_CHOICES]
    STATUS_CHOICES = [choice for choice, _ in get_user_model().STATUS_CHOICES]

    def add_arguments(self, parser):
        parser.add_argument(
            "--users",
            type=int,
            default=200,
            help="Number of demo users to create (default: 200).",
        )

    def handle(self, *args, **options):
        user_model = get_user_model()
        created = 0
        total = options["users"]

        for index in range(1, total + 1):
            username = f"demo_user_{index:03d}"
            email = f"{username}@example.com"
            display_name = f"Joker{index:03d}"

            if user_model.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f"User {username} already exists. Skipping."))
                continue

            character = self._generate_character()
            latitude, longitude = self._polish_coordinates()
            opis = self._random_description()
            status = random.choice(self.STATUS_CHOICES)
            location_type = random.choice(self.LOCATION_TYPE_CHOICES)

            user = user_model.objects.create_user(
                username=username,
                email=email,
                password="haslo123",
                display_name=display_name,
                character=character,
                opis=opis,
                status=status,
                latitude=latitude,
                longitude=longitude,
                location_type=location_type,
            )

            created += 1
            self.stdout.write(self.style.SUCCESS(f"Created {user.username} with Polish location {latitude}, {longitude}."))

        self.stdout.write(self.style.SUCCESS(f"Finished populating database. Created {created} user(s)."))

    def _generate_character(self):
        return {
            key: random.randint(0, max_value)
            for key, max_value in self.MAX_CHARACTER_VALUES.items()
        }

    def _polish_coordinates(self):
        latitude = Decimal(str(round(random.uniform(49.0, 54.8), 14)))
        longitude = Decimal(str(round(random.uniform(14.1, 24.2), 14)))
        return latitude, longitude

    def _random_description(self):
        descriptions = [
            "Miłośnik dobrej muzyki i gier planszowych.",
            "Uwielbiam góry, długie spacery i dobrą kawę.",
            "Programista z pasją do podróży po Polsce.",
            "Fan sportu i spontanicznych wycieczek rowerowych.",
            "Odkrywam nowe smaki i lokalne restauracje.",
        ]
        return random.choice(descriptions)
