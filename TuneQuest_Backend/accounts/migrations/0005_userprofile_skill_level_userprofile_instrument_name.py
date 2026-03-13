# Generated migration for profile fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_user_last_token_refresh_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='skill_level',
            field=models.CharField(blank=True, default='Beginner', max_length=50),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='instrument_name',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
