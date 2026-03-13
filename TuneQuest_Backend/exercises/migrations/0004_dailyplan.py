import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exercises', '0003_exerciseobject_exercisehistorylog'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyPlan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(default="Today's Practice", max_length=255)),
                ('focus', models.CharField(blank=True, max_length=255)),
                ('duration_goal', models.IntegerField()),
                ('difficulty', models.CharField(
                    choices=[('chill', 'Chill'), ('balanced', 'Balanced'), ('push', 'Push')],
                    default='balanced',
                    max_length=20,
                )),
                ('wish', models.TextField(blank=True)),
                ('focus_areas', models.JSONField(default=list)),
                ('exercise_ids', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='daily_plans',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
