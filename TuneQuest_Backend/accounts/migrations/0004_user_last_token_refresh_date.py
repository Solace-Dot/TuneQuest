# Generated migration for adding last_token_refresh_date field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_remove_userprofile_profile_picture_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='last_token_refresh_date',
            field=models.DateField(blank=True, help_text='Last date (PT) when token was refreshed at midnight', null=True),
        ),
    ]
