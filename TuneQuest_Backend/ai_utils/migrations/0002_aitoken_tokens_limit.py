# Generated migration for tokens_limit field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_utils', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='aitoken',
            name='tokens_limit',
            field=models.PositiveIntegerField(default=10, help_text='Max tokens capacity: 10 for free, 50 for premium'),
        ),
    ]
