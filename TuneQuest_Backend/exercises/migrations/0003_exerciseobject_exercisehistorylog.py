import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exercises', '0002_instrument_fileupload_exerciseattempt_aiactivitylog_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ExerciseObject',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('category', models.CharField(
                    choices=[
                        ('Quizzes', 'Quizzes'),
                        ('Knowledge', 'Knowledge'),
                        ('Ear Training', 'Ear Training'),
                        ('Technique', 'Technique'),
                        ('Rhythm', 'Rhythm'),
                        ('Repertoire', 'Repertoire'),
                    ],
                    max_length=50,
                )),
                ('route_to', models.CharField(editable=False, max_length=20)),
                ('skill_level', models.CharField(
                    choices=[
                        ('Beginner', 'Beginner'),
                        ('Intermediate', 'Intermediate'),
                        ('Advanced', 'Advanced'),
                    ],
                    default='Beginner',
                    max_length=50,
                )),
                ('status', models.CharField(
                    choices=[
                        ('Not Started', 'Not Started'),
                        ('In Progress', 'In Progress'),
                        ('Completed', 'Completed'),
                    ],
                    default='Not Started',
                    max_length=50,
                )),
                ('lore_description', models.TextField(blank=True)),
                ('technical_payload', models.JSONField(default=dict)),
                ('best_score', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('accuracy', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('avg_completion_time', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='exercise_objects',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='ExerciseHistoryLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('category', models.CharField(max_length=50)),
                ('skill_level', models.CharField(max_length=50)),
                ('best_score', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('accuracy', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('archived_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='exercise_history',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
