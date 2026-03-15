# Generated migration for purchase_date field

from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscription',
            name='purchase_date',
            field=models.DateTimeField(auto_now_add=True, default=timezone.now, help_text='Date when subscription was purchased'),
            preserve_default=False,
        ),
    ]
