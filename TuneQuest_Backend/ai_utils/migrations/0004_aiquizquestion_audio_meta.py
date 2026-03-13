from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_utils', '0003_aigeneratedquiz_completion_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='aiquizquestion',
            name='audio_meta',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
