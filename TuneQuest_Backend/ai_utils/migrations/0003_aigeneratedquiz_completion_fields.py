from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_utils', '0002_aigeneratedquiz_aiquizquestion'),
    ]

    operations = [
        migrations.AddField(
            model_name='aigeneratedquiz',
            name='status',
            field=models.CharField(default='Not Started', max_length=20),
        ),
        migrations.AddField(
            model_name='aigeneratedquiz',
            name='best_score',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name='aigeneratedquiz',
            name='accuracy',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='aigeneratedquiz',
            name='avg_completion_time',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='aigeneratedquiz',
            name='attempt_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='aigeneratedquiz',
            name='last_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
