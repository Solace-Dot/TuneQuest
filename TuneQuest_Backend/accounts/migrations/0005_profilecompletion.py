# Generated migration for ProfileCompletion model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_user_last_token_refresh_date'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProfileCompletion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_completed', models.BooleanField(default=False, help_text='Whether profile setup is complete')),
                ('instrument_name', models.CharField(blank=True, help_text="User's instrument", max_length=100)),
                ('skill_level', models.CharField(blank=True, help_text="User's skill level", max_length=50)),
                ('completed_at', models.DateTimeField(blank=True, help_text='When profile was completed', null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile_completion', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
