from django.db import models

# Create your models here.

from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models as gis_models




class CustomUser(AbstractUser):
    
    
    display_name = models.CharField(max_length=16, unique=True, blank=True, null=True)
    character = models.JSONField(null=True, blank=True)
    opis = models.TextField(max_length=150, blank=True)
    STATUS_CHOICES = [
        ('dostępny', 'Dostępny'),
        ('niedostępny', 'Niedostępny'),
        ('niewidoczny', 'Niewidoczny')
    ]
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='dostępny', blank=True)
    latitude = models.DecimalField(max_digits=16, decimal_places=14, null=True, blank=True)
    longitude = models.DecimalField(max_digits=16, decimal_places=14, null=True, blank=True)
    LOCATION_TYPE_CHOICES = [
        ('high', 'High'),
        ('low', 'Low'),
        ('reduced', 'Reduced'),
        ('navigation', 'Navigation'),
        ('powerSave', 'Power Save'),
        ('balanced', 'Balanced')
    ]
    location_type = models.CharField(max_length=50, choices=LOCATION_TYPE_CHOICES, default='low', blank=True)
    punkt = gis_models.PointField(null=True, blank=True)
    

    def save(self, *args, **kwargs):
        if self.display_name == "":
            self.display_name = None
        # Tworzymy obiekt Point tylko jeśli są dane dla szerokości i długości geograficznej
        if self.latitude is not None and self.longitude is not None:
            from django.contrib.gis.geos import Point
            # Aktualizujemy punkt tylko jeśli współrzędne się zmieniają lub punkt nie istnieje
            if not self.punkt or (self.punkt.x != float(self.longitude) or self.punkt.y != float(self.latitude)):
                self.punkt = Point(float(self.longitude), float(self.latitude), srid=4326)
        super().save(*args, **kwargs)
