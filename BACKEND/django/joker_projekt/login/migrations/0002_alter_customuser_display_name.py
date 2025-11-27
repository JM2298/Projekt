from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("login", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="customuser",
            name="display_name",
            field=models.CharField(max_length=16, unique=True, blank=True, null=True),
        ),
    ]
