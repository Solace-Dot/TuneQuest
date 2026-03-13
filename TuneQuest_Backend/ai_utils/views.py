# ai_utils/views.py
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
import json
from ai_utils.quiz_generator import QuizGenerator
from ai_utils.practice_plan_generator import PracticePlanGenerator
from ai_utils.models import AIToken, AIGeneratedQuiz, AIQuizQuestion, AIGeneratedSong, AITimelineEvent
from learn.models import Lesson
from exercises.models import DailyPlan

TOKEN_LIMIT = 10


def _build_ear_training_questions(num_questions=5):
    """Return ear-training questions with explicit audio metadata for client playback."""
    bank = [
        {
            'question_text': 'Listen to two notes played one after the other. What interval do you hear?',
            'options': ['Major 3rd', 'Perfect 5th', 'Minor 2nd', 'Octave'],
            'correct_answer': 'Perfect 5th',
            'explanation': 'The second note is 7 semitones above the first, which is a perfect fifth.',
            'audio_meta': {'mode': 'interval', 'root_hz': 220.0, 'semitones': 7, 'waveform': 'sine'},
        },
        {
            'question_text': 'Listen to the chord. Is it major or minor?',
            'options': ['Major', 'Minor', 'Diminished', 'Augmented'],
            'correct_answer': 'Minor',
            'explanation': 'The chord has a minor third above the root, giving it a minor quality.',
            'audio_meta': {'mode': 'chord_quality', 'root_hz': 246.94, 'quality': 'minor'},
        },
        {
            'question_text': 'Listen to the interval. Identify it by ear.',
            'options': ['Minor 3rd', 'Perfect 4th', 'Major 6th', 'Minor 7th'],
            'correct_answer': 'Perfect 4th',
            'explanation': 'A perfect fourth spans 5 semitones from the root.',
            'audio_meta': {'mode': 'interval', 'root_hz': 196.0, 'semitones': 5, 'waveform': 'sine'},
        },
        {
            'question_text': 'Listen to the single note and identify the fret position on the low E string.',
            'options': ['Open string (E)', '3rd fret (G)', '5th fret (A)', '7th fret (B)'],
            'correct_answer': '5th fret (A)',
            'explanation': 'The pitch is A2 (~110 Hz), which corresponds to 5th fret on the low E string.',
            'audio_meta': {'mode': 'single_note', 'freq_hz': 110.0},
        },
        {
            'question_text': 'Listen to the chord quality and choose the best answer.',
            'options': ['Major', 'Minor', 'Suspended', 'Power chord'],
            'correct_answer': 'Major',
            'explanation': 'The chord includes a major third above the root, which defines a major chord.',
            'audio_meta': {'mode': 'chord_quality', 'root_hz': 261.63, 'quality': 'major'},
        },
    ]

    return bank[:max(1, min(num_questions, len(bank)))]

# Maps practice-plan categories → learn-page lesson categories
_PLAN_TO_LESSON_CATEGORY = {
    'Technique':    ['Scales', 'Chords'],
    'Rhythm':       ['Rhythm'],
    'Knowledge':    ['Music Theory'],
    'Repertoire':   ['Scales', 'Chords', 'Music Theory'],
    'Ear Training': ['Ear Training'],
    'Quizzes':      ['Music Theory', 'Ear Training'],
}

def _recommended_slugs(plan: dict, skill_level: str) -> list:
    """Return lesson slugs that are relevant to the generated plan."""
    # Collect lesson categories needed by the plan steps
    lesson_cats = set()
    for step in plan.get('steps', []):
        cat = step.get('category', '')
        for lc in _PLAN_TO_LESSON_CATEGORY.get(cat, []):
            lesson_cats.add(lc)

    if not lesson_cats:
        return []

    # Difficulty gate: beginners see Beginner lessons; others see up to Intermediate
    if skill_level.lower() == 'beginner':
        difficulties = ['Beginner']
    else:
        difficulties = ['Beginner', 'Intermediate']

    slugs = list(
        Lesson.objects.filter(
            category__in=lesson_cats,
            difficulty__in=difficulties,
        ).order_by('order').values_list('slug', flat=True)[:12]
    )
    return slugs

@api_view(['POST'])
@permission_classes([AllowAny])
def generate_quiz(request):
    """Single-request AI function calling - detects quiz request and stops (1 RPM)"""
    try:
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        user_message = data.get('userMessage', '')
        
        if not user_message:
            return JsonResponse({'error': 'No message provided'}, status=400)
        
        generator = QuizGenerator()
        # Single AI call - detects function call and returns it
        result = generator.detect_quiz_request(user_message)
        
        # Debug: print result
        print(f"Quiz detection result: {result}")
        
        if result.get('function_call'):
            return JsonResponse(result)
        else:
            return JsonResponse({
                'error': 'No quiz request detected in your message. Try asking for a quiz like "Give me 5 questions about guitar chords" or "Quiz me on music theory"'
            }, status=400)
            
    except Exception as e:
        print(f"Quiz generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': f'Failed to process request: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_quiz(request):
    """Create quiz from detected function call - saves to database"""
    try:
        function_call = request.data

        generator = QuizGenerator()
        questions = generator.create_quiz_from_function_call(function_call)

        # Extract metadata from function call
        args = function_call.get('args', {})
        topic = args.get('topic', 'music theory')
        desired_category = str(args.get('desired_category', '') or '').strip()
        source_title = str(args.get('source_title', '') or '').strip()
        instrument = args.get('instrument', 'guitar')
        skill_level = args.get('skill_level', 'beginner')

        if skill_level not in ['beginner', 'intermediate', 'advanced']:
            skill_level = 'beginner'

        requested_count = len(questions) if questions else int(args.get('num_questions', 5) or 5)

        topic_lower = topic.lower()
        desired_lower = desired_category.lower()
        if desired_lower == 'ear training':
            category = 'Ear Training'
        elif desired_lower == 'knowledge':
            category = 'Music Theory'
        elif desired_lower == 'quizzes':
            category = 'Music Theory'
        elif 'ear' in topic_lower or 'interval' in topic_lower or 'identify by ear' in topic_lower:
            category = 'Ear Training'
        elif 'chord' in topic_lower:
            category = 'Chord Knowledge'
        elif 'rhythm' in topic_lower:
            category = 'Rhythm'
        elif 'sight' in topic_lower or 'reading' in topic_lower:
            category = 'Sight Reading'
        else:
            category = 'Music Theory'

        # If no AI questions were generated, fall back to hardcoded for regular quizzes only
        # Ear Training should always use AI with audio_meta
        if not questions and category != 'Ear Training':
            # For non-ear-training, use hardcoded fallback
            pass
        elif not questions and category == 'Ear Training':
            # For ear training, try to generate with AI - if it fails, use hardcoded
            questions = _build_ear_training_questions(requested_count)

        title_base = source_title or topic.title()
        title = f"{title_base} Quiz ({instrument.title()})"
        lore_description = f"AI-generated quiz on {topic} for {instrument} ({skill_level} level)"
        
        # Get practice_step_id from args if provided
        practice_step_id = str(args.get('practice_step_id', '') or '').strip()

        # Save quiz to database
        user = request.user if request.user.is_authenticated else None
        quiz = AIGeneratedQuiz.objects.create(
            user=user,
            practice_step_id=practice_step_id if practice_step_id else None,
            title=title,
            topic=topic,
            instrument=instrument,
            skill_level=skill_level,
            category=category,
            lore_description=lore_description,
        )

        # Save each question
        for i, q in enumerate(questions):
            AIQuizQuestion.objects.create(
                quiz=quiz,
                question_text=q.get('question_text', ''),
                options=q.get('options', []),
                correct_answer=q.get('correct_answer', ''),
                explanation=q.get('explanation', ''),
                audio_meta=q.get('audio_meta', {}),
                order=i,
            )

        return JsonResponse({
            'id': quiz.id,
            'title': title,
            'topic': topic,
            'instrument': instrument,
            'skill_level': skill_level,
            'category': category,
            'questions': questions,
            'question_count': len(questions),
            'status': quiz.status,
            'best_score': quiz.best_score,
            'accuracy': quiz.accuracy,
            'avg_completion_time': quiz.avg_completion_time,
            'lore_description': lore_description,
            'created_at': quiz.created_at.isoformat(),
        })
    except Exception as e:
        print(f"Quiz creation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Failed to create quiz: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_ai_quizzes(request):
    """Return all AI-generated quizzes for the authenticated user"""
    quizzes = AIGeneratedQuiz.objects.filter(user=request.user).prefetch_related('questions')
    data = []
    for quiz in quizzes:
        questions_data = [
            {
                'id': q.id,
                'question_text': q.question_text,
                'options': q.options,
                'correct_answer': q.correct_answer,
                'explanation': q.explanation,
                'audio_meta': q.audio_meta,
            }
            for q in quiz.questions.all()
        ]
        data.append({
            'id': f'ai-quiz-{quiz.id}',
            'db_id': quiz.id,
            'title': quiz.title,
            'topic': quiz.topic,
            'instrument': quiz.instrument,
            'skill_level': quiz.skill_level,
            'category': quiz.category,
            'lore_description': quiz.lore_description,
            'status': quiz.status,
            'best_score': quiz.best_score,
            'accuracy': quiz.accuracy,
            'avg_completion_time': quiz.avg_completion_time,
            'question_count': quiz.question_count,
            'questions': questions_data,
            'isAIGenerated': True,
            'createdAt': quiz.created_at.isoformat(),
        })
    return JsonResponse({'quizzes': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_practice_session(request):
    """
    Persist completion stats for quiz/song sessions and sync the latest DailyPlan step.

    Expected payload:
      {
        step_id: string,
        score?: number,
        accuracy?: number,
        avg_completion_time?: number,
        quiz_db_id?: number,
      }
    """
    data = request.data if isinstance(request.data, dict) else {}

    step_id = str(data.get('step_id') or '').strip()
    score = data.get('score')
    accuracy = data.get('accuracy')
    avg_time = data.get('avg_completion_time')
    quiz_db_id = data.get('quiz_db_id')

    if not step_id and not quiz_db_id:
      return JsonResponse({'error': 'Either "step_id" or "quiz_db_id" is required.'}, status=400)

    updated_step = None
    plan_completed = None
    plan_total = None

    latest_plan = DailyPlan.objects.filter(user=request.user).order_by('-created_at').first()
    if latest_plan and isinstance(latest_plan.plan_json, dict):
        plan_json = latest_plan.plan_json
        steps = plan_json.get('steps', [])

        for step in steps:
            if str(step.get('id', '')) != step_id:
                continue

            step['status'] = 'Completed'

            if score is not None:
                prev_best = step.get('best_score')
                step['best_score'] = float(score) if prev_best is None else max(float(prev_best), float(score))
            if accuracy is not None:
                step['accuracy'] = float(accuracy)
            if avg_time is not None:
                prev = step.get('avg_completion_time')
                step['avg_completion_time'] = float(avg_time) if prev is None else (float(prev) + float(avg_time)) / 2.0

            updated_step = step
            break

        if updated_step is not None:
            completed_count = sum(1 for s in steps if s.get('status') == 'Completed')
            plan_json['steps'] = steps
            plan_json['completed_steps'] = completed_count
            plan_json['total_steps'] = len(steps)
            latest_plan.plan_json = plan_json
            latest_plan.completed_at = timezone.now() if completed_count == len(steps) and len(steps) > 0 else latest_plan.completed_at
            latest_plan.save(update_fields=['plan_json', 'completed_at'])

            plan_completed = completed_count
            plan_total = len(steps)

    updated_quiz = None
    if quiz_db_id is not None:
        try:
            quiz = AIGeneratedQuiz.objects.get(id=quiz_db_id, user=request.user)
            quiz.status = 'Completed'
            quiz.attempt_count = (quiz.attempt_count or 0) + 1
            quiz.last_completed_at = timezone.now()

            if score is not None:
                quiz.best_score = float(score) if quiz.best_score is None else max(float(quiz.best_score), float(score))
            if accuracy is not None:
                quiz.accuracy = float(accuracy)
            if avg_time is not None:
                quiz.avg_completion_time = (
                    float(avg_time)
                    if quiz.avg_completion_time is None
                    else (float(quiz.avg_completion_time) + float(avg_time)) / 2.0
                )

            quiz.save()
            updated_quiz = {
                'id': quiz.id,
                'status': quiz.status,
                'best_score': quiz.best_score,
                'accuracy': quiz.accuracy,
                'avg_completion_time': quiz.avg_completion_time,
                'attempt_count': quiz.attempt_count,
            }
        except AIGeneratedQuiz.DoesNotExist:
            return JsonResponse({'error': 'Quiz not found for this user.'}, status=404)

    return JsonResponse({
        'success': True,
        'updated_step': updated_step,
        'plan_completed_steps': plan_completed,
        'plan_total_steps': plan_total,
        'updated_quiz': updated_quiz,
    })


@api_view(['GET'])
def get_token_balance(request):
    """Return the user's remaining AI token count."""
    # Allow unauthenticated requests - return default for guests
    if not request.user.is_authenticated:
        return JsonResponse({
            'tokens_remaining': 10,
            'tokens_used': 0,
            'token_limit': TOKEN_LIMIT,
            'is_guest': True,
        })
    
    token_obj, _ = AIToken.objects.get_or_create(
        user=request.user,
        defaults={'tokens_remaining': TOKEN_LIMIT},
    )
    return JsonResponse({
        'tokens_remaining': token_obj.tokens_remaining,
        'tokens_used': token_obj.tokens_used,
        'token_limit': TOKEN_LIMIT,
        'is_guest': False,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_practice_plan(request):
    """Generate an AI practice plan, costing 1 token."""
    token_obj, _ = AIToken.objects.get_or_create(
        user=request.user,
        defaults={'tokens_remaining': TOKEN_LIMIT},
    )

    if token_obj.tokens_remaining <= 0:
        return JsonResponse(
            {'error': 'No AI tokens remaining. Upgrade to premium for more.'},
            status=402,
        )

    try:
        practice_data = request.data

        # Availability gate: currently only Acoustic Guitar is supported.
        user_ctx = practice_data.get('user_context', {}) if isinstance(practice_data, dict) else {}
        instrument = (user_ctx.get('instrument') or '').strip()
        instrument_type = (user_ctx.get('instrument_type') or '').strip()
        if instrument != 'Guitar' or (instrument_type and instrument_type != 'Acoustic'):
            return JsonResponse(
                {'error': 'Not yet available. Currently supported: Guitar (Acoustic).'},
                status=400,
            )

        generator = PracticePlanGenerator()
        plan = generator.generate(practice_data)

        # Derive recommended lessons from the plan
        skill_level = (
            practice_data.get('user_context', {}).get('skill_level', 'Beginner')
        )
        recommended_slugs = _recommended_slugs(plan, skill_level)

        # Persist plan to DB so it survives page reloads
        focus_areas = practice_data.get('focus_areas', []) if isinstance(practice_data, dict) else []
        daily_plan = DailyPlan.objects.create(
            user=request.user,
            title=plan.get('plan_title', "Today's Practice"),
            focus=plan.get('focus_summary', ''),
            duration_goal=sum(s.get('duration_minutes', 0) for s in plan.get('steps', [])),
            focus_areas=focus_areas,
            plan_json=plan,
            skill_level=skill_level,
            instrument=instrument or 'Guitar',
            recommended_lesson_slugs=recommended_slugs,
        )

        token_obj.tokens_remaining -= 1
        token_obj.tokens_used += 1
        token_obj.save()

        return JsonResponse({
            'success': True,
            'plan': plan,
            'plan_id': str(daily_plan.id),
            'recommended_lesson_slugs': recommended_slugs,
            'tokens_remaining': token_obj.tokens_remaining,
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_song_timeline(request):
    """
    Generate a level-locked song timeline using Gemini function calling.
    Costs 1 token per request. Saves to database.

    Expected payload:
        {
            song_title, skill_level, instrument,
            practice_card_title?, practice_card_description?,
            practice_card_category?, generation_intent?
        }

    Returns:
        { id, bpm, timeline, arrangement_title, is_verified, is_ai_composed,
          skill_level, song_title, tokens_remaining }
    """
    token_obj, _ = AIToken.objects.get_or_create(
        user=request.user,
        defaults={'tokens_remaining': TOKEN_LIMIT},
    )
    if token_obj.tokens_remaining <= 0:
        return JsonResponse(
            {'error': 'No AI tokens remaining. Upgrade to premium for more.'},
            status=402,
        )

    data = request.data
    song_title = (data.get('song_title') or '').strip()
    skill_level = data.get('skill_level', 'Beginner')
    instrument  = data.get('instrument', 'Guitar')
    practice_card_title = (data.get('practice_card_title') or '').strip()
    practice_card_description = (data.get('practice_card_description') or '').strip()
    practice_card_category = (data.get('practice_card_category') or '').strip()
    generation_intent = (data.get('generation_intent') or '').strip()

    if not song_title:
        return JsonResponse({'error': '"song_title" is required.'}, status=400)

    if skill_level not in ('Beginner', 'Intermediate'):
        skill_level = 'Beginner'

    try:
        from ai_utils.song_timeline_generator import SongTimelineGenerator
        generator = SongTimelineGenerator()
        result = generator.generate(
            song_title=song_title,
            skill_level=skill_level,
            instrument=instrument,
            practice_card_title=practice_card_title,
            practice_card_description=practice_card_description,
            practice_card_category=practice_card_category,
            generation_intent=generation_intent,
        )

        # Normalize skill_level to lowercase for database
        skill_level_lower = skill_level.lower()

        # Save song to database
        user = request.user if request.user.is_authenticated else None
        practice_step_id = (data.get('practice_step_id') or '').strip()
        
        song = AIGeneratedSong.objects.create(
            user=user,
            practice_step_id=practice_step_id if practice_step_id else None,
            song_title=result['song_title'],
            arrangement_title=result['arrangement_title'],
            instrument=instrument,
            skill_level=skill_level_lower,
            bpm=int(result['bpm']),
            is_verified=result['is_verified'],
            is_ai_composed=result['is_ai_composed'],
        )

        # Save each timeline event
        for order, event in enumerate(result['timeline']):
            AITimelineEvent.objects.create(
                song=song,
                beat=event['beat'],
                event_type=event['type'],
                value=event['value'],
                duration=event['duration'],
                order=order,
            )

        token_obj.tokens_remaining -= 1
        token_obj.tokens_used += 1
        token_obj.save()

        return JsonResponse({
            'success': True,
            'id': f'ai-song-{song.id}',
            'db_id': song.id,
            'tokens_remaining': token_obj.tokens_remaining,
            **result,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_song_for_step(request, step_id):
    """Get existing song for a practice step, or null if none exists"""
    try:
        song = AIGeneratedSong.objects.filter(
            user=request.user,
            practice_step_id=step_id
        ).first()
        
        if not song:
            return JsonResponse({'song': None})
        
        # Return song with timeline events
        events_data = [
            {
                'id': e.id,
                'beat': e.beat,
                'type': e.event_type,
                'value': e.value,
                'duration': e.duration,
            }
            for e in song.timeline_events.all()
        ]
        
        return JsonResponse({
            'song': {
                'id': f'ai-song-{song.id}',
                'db_id': song.id,
                'song_title': song.song_title,
                'arrangement_title': song.arrangement_title,
                'instrument': song.instrument,
                'skill_level': song.skill_level,
                'bpm': song.bpm,
                'is_verified': song.is_verified,
                'is_ai_composed': song.is_ai_composed,
                'status': song.status,
                'best_score': float(song.best_score) if song.best_score else None,
                'accuracy': float(song.accuracy) if song.accuracy else None,
                'avg_completion_time': song.avg_completion_time,
                'event_count': song.event_count,
                'timeline': events_data,
                'isAIGenerated': True,
                'createdAt': song.created_at.isoformat(),
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quiz_for_step(request, step_id):
    """Get existing quiz for a practice step, or null if none exists"""
    try:
        quiz = AIGeneratedQuiz.objects.filter(
            user=request.user,
            practice_step_id=step_id
        ).first()
        
        if not quiz:
            return JsonResponse({'quiz': None})
        
        # Return quiz with questions
        questions_data = [
            {
                'id': q.id,
                'question_text': q.question_text,
                'options': q.options,
                'correct_answer': q.correct_answer,
                'explanation': q.explanation,
                'audio_meta': q.audio_meta,
            }
            for q in quiz.questions.all()
        ]
        
        return JsonResponse({
            'quiz': {
                'id': f'ai-quiz-{quiz.id}',
                'db_id': quiz.id,
                'title': quiz.title,
                'topic': quiz.topic,
                'instrument': quiz.instrument,
                'skill_level': quiz.skill_level,
                'category': quiz.category,
                'lore_description': quiz.lore_description,
                'status': quiz.status,
                'best_score': float(quiz.best_score) if quiz.best_score else None,
                'accuracy': float(quiz.accuracy) if quiz.accuracy else None,
                'avg_completion_time': quiz.avg_completion_time,
                'question_count': quiz.question_count,
                'questions': questions_data,
                'isAIGenerated': True,
                'createdAt': quiz.created_at.isoformat(),
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_quiz(request, quiz_id):
    """Delete an AI-generated quiz (only by owner)"""
    try:
        quiz = AIGeneratedQuiz.objects.get(id=quiz_id, user=request.user)
        quiz.delete()
        return JsonResponse({'success': True, 'message': 'Quiz deleted'})
    except AIGeneratedQuiz.DoesNotExist:
        return JsonResponse({'error': 'Quiz not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_detailed_progress_summary(request):
    """
    Generate an AI-powered detailed progress summary based on user's practice data.
    Costs 1 token per request.

    Returns:
        { summary: { overall_progress, strong_areas, areas_for_improvement, ai_recommendations } }
    """
    token_obj, _ = AIToken.objects.get_or_create(
        user=request.user,
        defaults={'tokens_remaining': TOKEN_LIMIT},
    )
    if token_obj.tokens_remaining <= 0:
        return JsonResponse(
            {'error': 'No AI tokens remaining. Upgrade to premium for more.'},
            status=402,
        )

    try:
        from ai_utils.progress_summary_generator import ProgressSummaryGenerator
        
        # Get user profile info
        from accounts.models import UserProfile
        user_profile = UserProfile.objects.filter(user=request.user).first()
        instrument = user_profile.instrument if user_profile else 'Guitar'
        skill_level = user_profile.skill_level if user_profile else 'Beginner'
        learning_goal = user_profile.learning_goal if user_profile else ''

        # Get all exercises from latest plan
        latest_plan = DailyPlan.objects.filter(user=request.user).order_by('-created_at').first()
        plan_json = latest_plan.plan_json if latest_plan else {}
        steps = plan_json.get('steps', [])
        
        completed_exercises = []
        category_stats = {}
        
        # Collect exercise data
        if steps:
            for step in steps:
                category = step.get('category', 'General')
                if category not in category_stats:
                    category_stats[category] = {'completed': 0, 'total': 0}
                
                category_stats[category]['total'] += 1
                
                if step.get('status') == 'Completed':
                    completed_exercises.append(f"{step.get('title', '')} ({category})")
                    category_stats[category]['completed'] += 1
        
        # Convert to percentages
        category_percentages = {
            cat: int((stats['completed'] / stats['total'] * 100) if stats['total'] > 0 else 0)
            for cat, stats in category_stats.items()
        }
        
        total_exercises = len(steps) if steps else 0
        
        # Generate summary using AI
        generator = ProgressSummaryGenerator()
        summary = generator.generate(
            instrument=instrument,
            skill_level=skill_level,
            completed_exercises=completed_exercises,
            total_exercises=total_exercises,
            category_stats=category_percentages,
            learning_goal=learning_goal,
        )

        token_obj.tokens_remaining -= 1
        token_obj.tokens_used += 1
        token_obj.save()

        return JsonResponse({
            'success': True,
            'summary': summary,
            'tokens_remaining': token_obj.tokens_remaining,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)