# Generated migration for AIGeneratedQuiz and AIQuizQuestion models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ai_utils', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AIGeneratedQuiz',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('topic', models.CharField(max_length=100)),
                ('instrument', models.CharField(default='guitar', max_length=100)),
                ('skill_level', models.CharField(
                    choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')],
                    default='beginner',
                    max_length=20,
                )),
                ('category', models.CharField(default='Music Theory', max_length=100)),
                ('lore_description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='ai_quizzes',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AIQuizQuestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_text', models.TextField()),
                ('options', models.JSONField()),
                ('correct_answer', models.CharField(max_length=500)),
                ('explanation', models.TextField(blank=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('quiz', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='questions',
                    to='ai_utils.aigeneratedquiz',
                )),
            ],
            options={
                'ordering': ['order'],
            },
        ),
    ]
