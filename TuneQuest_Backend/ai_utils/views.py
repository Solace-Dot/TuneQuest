# ai_utils/views.py
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
from ai_utils.quiz_generator import QuizGenerator
from ai_utils.practice_plan_generator import PracticePlanGenerator
from ai_utils.models import AIToken, AIGeneratedQuiz, AIQuizQuestion, AIGeneratedSong, AITimelineEvent
from learn.models import Lesson, LessonProgress
from exercises.models import DailyPlan
from payments.models import Subscription

TOKEN_LIMIT_FREE = 10
TOKEN_LIMIT_PREMIUM = 50


def _get_token_limit_for_user(user):
    """Determine token limit based on premium subscription status stored in User model."""
    if not user.is_authenticated:
        return TOKEN_LIMIT_FREE
    
    # Check User.is_premium field directly (source of truth, no query needed)
    if user.is_premium:
        # Verify premium hasn't expired
        if user.premium_end_date:
            from django.utils import timezone
            now = timezone.now()
            if now >= user.premium_end_date:
                # Premium expired, downgrade
                user.is_premium = False
                user.save(update_fields=['is_premium'])
                return TOKEN_LIMIT_FREE
        
        return TOKEN_LIMIT_PREMIUM
    
    return TOKEN_LIMIT_FREE


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


def _create_learning_cards_from_plan(plan: dict, skill_level: str, instrument: str, user) -> list:
    """
    Generate and create AI-learning cards for this specific user based on the practice plan.
    
    CARDS MATCH PLAN CATEGORIES:
    - FREE TIER: Max 5 cards (max 1 per category from plan)
    - PREMIUM TIER: Max 10 cards (max 3 per category from plan)
    
    CRITICAL: Deletes user's old AI-generated lessons first, then creates new ones.
    This ensures lessons don't accumulate across plan regenerations.
    """
    import uuid
    
    # CLEAR old AI-generated lessons for this user BEFORE creating new ones
    old_lessons_qs = Lesson.objects.filter(user=user)
    deleted_count = old_lessons_qs.count()
    
    # Clear associated progress first
    LessonProgress.objects.filter(lesson__in=old_lessons_qs).delete()
    
    # Then delete the lessons
    old_lessons_qs.delete()
    print(f"[CLEAR] Deleted {deleted_count} old lessons for user {user.id}")
    
    # Determine if user is premium
    subscription = Subscription.objects.filter(
        user=user,
        plan_type='premium',
        subscription_status='active'
    ).order_by('-id').first()
    
    is_premium = subscription and subscription.is_active if subscription else False
    max_cards = 10 if is_premium else 5
    max_per_category = 3 if is_premium else 1
    print(f"[CARD GEN] User {user.id} is {'PREMIUM' if is_premium else 'FREE'} - Max {max_cards} cards (max {max_per_category} per category)")
    
    # Get the categories from the practice plan
    plan_categories = set()
    for step in plan.get('steps', []):
        cat = step.get('category', '').strip()
        if cat:
            plan_categories.add(cat)
    print(f"[CARD GEN] Plan categories: {plan_categories}")
    
    created_slugs = []
    step_count = 0
    category_counts = {cat: 0 for cat in plan_categories}  # Track cards per category
    used_topics = set()  # Track topics we've used to avoid duplicates
    
    # Define learning objectives per category
    category_topics = {
        'Technique': [
            'Basic Finger Placement', 'String Muting Techniques', 'Barre Chord Fundamentals',
            'Fingerpicking Patterns', 'Palm Muting Techniques', 'Harmonic Techniques',
            'Sweep Picking Intro', 'Vibrato and Expression', 'Dynamic Control', 'Alternate Picking Speed'
        ],
        'Rhythm': [
            'Basic Time Signatures', 'Strumming Patterns', 'Eighth Note Grooves',
            'Sixteenth Note Rhythms', 'Syncopation', 'Polyrhythms Intro', 'Triplet Feels',
            'Swing Rhythms', 'Odd Time Signatures', 'Rhythm Handwriting'
        ],
        'Knowledge': [
            'Major and Minor Scales', 'Chord Construction Basics', 'Intervals and Harmony',
            'Music Theory Fundamentals', 'Key Signatures', 'Voice Leading Basics',
            'Chord Progressions', 'Mode Theory Intro', 'Harmonic Function', 'Enharmonic Equivalents'
        ],
        'Repertoire': [
            'Learning Simple Songs', 'Popular Rock Songs', 'Classic Standards',
            'Acoustic Fingerstyle Songs', 'Blues Progressions', 'Jazz Standards Intro',
            'Contemporary Hits', 'Classic Rock Riffs', 'Folk Song Adaptations', 'Song Analysis'
        ],
        'Ear Training': [
            'Interval Recognition', 'Chord Quality Identification', 'Melodic Dictation',
            'Rhythmic Dictation', 'Scale Identification', 'Perfect Pitch Training',
            'Relative Pitch Development', 'Harmonic Ear Training', 'Note Recognition by Sound', 'Chord Progression Ear'
        ],
        'Quizzes': [
            'Music Theory Quiz', 'Scale Recognition Quiz', 'Chord Identification Quiz',
            'Interval Ear Training', 'Rhythm Recognition', 'Music History Quiz'
        ]
    }
    
    # Helper function to create a lesson
    def create_lesson_from_topic(topic, category):
        nonlocal step_count
        if step_count >= max_cards:
            return None
        
        # Check category limit
        if category_counts.get(category, 0) >= max_per_category:
            return None
        
        # Ensure we don't duplicate topics
        if topic in used_topics:
            return None
        
        difficulty = skill_level if skill_level in ['Beginner', 'Intermediate', 'Advanced'] else 'Beginner'
        unique_id = str(uuid.uuid4())[:8]
        slug = f"ai-{category.lower().replace(' ', '-')}-{step_count}-{unique_id}"[:20]
        
        content = [
            {'type': 'text', 'heading': 'Overview', 'body': f'Master {topic.lower()} for {instrument}. This AI-generated lesson provides structured learning and practice guidance.'},
            {'type': 'text', 'heading': 'What You\'ll Learn', 'body': f'In this lesson, you will:\n• Understand the core concepts of {topic.lower()}\n• Develop practical skills through guided exercises\n• Apply these concepts to real musical situations\n• Build confidence and proficiency step by step'},
            {'type': 'tip', 'body': f'🎯 Focus Area: This lesson emphasizes {topic.lower()} which is essential for {instrument} players at the {difficulty} level.'},
            {'type': 'text', 'heading': 'Practice Tips', 'body': 'Break the lesson into small, manageable sections\nPractice each section until comfortable\nCombine sections into a complete practice routine\nReview regularly to reinforce learning'}
        ]
        
        try:
            lesson = Lesson.objects.create(
                slug=slug,
                title=topic,
                category=_map_category_to_lesson_category(category),
                difficulty=difficulty,
                duration_minutes=20,
                description=f'An AI-generated lesson on {topic.lower()}',
                content=content,
                order=step_count,
                user=user
            )
            created_slugs.append(lesson.slug)
            used_topics.add(topic)
            step_count += 1
            category_counts[category] = category_counts.get(category, 0) + 1
            print(f"[CARD GEN] Created card {step_count}/{max_cards}: {topic} in {category}")
            return lesson
        except Exception as e:
            print(f"Error creating lesson {slug}: {e}")
            return None
    
    # Fill cards from plan categories first
    for category in plan_categories:
        if category not in category_topics:
            print(f"[CARD GEN] Skipping unknown category: {category}")
            continue
        
        # Add up to max_per_category cards from this category
        for topic in category_topics[category]:
            if step_count >= max_cards or category_counts[category] >= max_per_category:
                break
            create_lesson_from_topic(topic, category)
    
    print(f"[CARD GEN] Created {step_count} total cards for user {user.id} ({max_cards} max)")
    print(f"[CARD GEN] Categories breakdown: {category_counts}")
    return created_slugs


def _map_category_to_lesson_category(category: str) -> str:
    """Map practice plan category to lesson category."""
    mapping = {
        'Technique': 'Chords',
        'Rhythm': 'Rhythm',
        'Knowledge': 'Music Theory',
        'Repertoire': 'Scales',
        'Ear Training': 'Ear Training',
        'Quizzes': 'Music Theory',
    }
    return mapping.get(category, 'Music Theory')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
        error_str = str(e)
        print(f"Quiz generation error: {error_str}")
        
        if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str or 'quota' in error_str.lower():
            print(f"[QUIZ GEN] API quota exceeded")
            return JsonResponse({
                'error': 'Out of api request'
            }, status=429)
        
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': f'Failed to process request: {error_str}'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
def get_token_balance(request):
    """Return the user's remaining AI token count and limit."""
    from rest_framework.response import Response
    
    token_limit = _get_token_limit_for_user(request.user)
    token_obj, created = AIToken.objects.get_or_create(
        user=request.user,
        defaults={'tokens_remaining': token_limit, 'tokens_limit': token_limit},
    )
    
    # If token limit has changed (e.g., upgraded to premium or cancelled), sync it
    if token_obj.tokens_limit != token_limit:
        if token_limit == TOKEN_LIMIT_FREE:
            # Downgrading from premium to free: cap tokens_remaining at 10
            token_obj.tokens_remaining = min(token_obj.tokens_remaining, TOKEN_LIMIT_FREE)
        
        # Update tokens_limit to match subscription status
        token_obj.tokens_limit = token_limit
        token_obj.save()
    
    return Response({
        'tokens_remaining': token_obj.tokens_remaining,
        'tokens_used': token_obj.tokens_used,
        'tokens_limit': token_obj.tokens_limit,
        'is_guest': False,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_message(request):
    """
    Process a chat message and return AI response.
    Costs 1 token per message.
    
    Expected payload:
        {
            message: string (user message)
        }
    
    Returns:
        { response: string (AI response), tokens_remaining: int }
    """
    from ai_utils.quiz_generator import QuizGenerator
    
    message = request.data.get('message', '').strip()
    if not message:
        return JsonResponse({'error': 'Message cannot be empty'}, status=400)
    
    # Get user token
    token_obj, _ = AIToken.objects.get_or_create(
        user=request.user,
        defaults={'tokens_remaining': _get_token_limit_for_user(request.user), 'tokens_limit': _get_token_limit_for_user(request.user)},
    )
    
    # Check if user has tokens
    if token_obj.tokens_remaining <= 0:
        return JsonResponse(
            {'error': 'No AI tokens remaining. Upgrade to premium for more.'},
            status=402,
        )
    
    try:
        # Use quiz generator's Gemini client for chat responses
        generator = QuizGenerator()
        
        # Build a prompt for TuneQuest assistant
        system_prompt = """You are TuneQuest, a friendly music practice assistant. 
        You help users with practice plans, learning strategies, instrument tips, and music theory.
        Keep responses concise (2-3 sentences max) and encouraging.
        If user asks about generating a practice plan, quiz, or song, mention they can use the dedicated buttons in the app."""
        
        # Call Gemini with the user message
        response = generator.client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                {
                    'role': 'user',
                    'parts': [{'text': f"{system_prompt}\n\nUser: {message}"}]
                }
            ]
        )
        
        ai_response = response.text if response.text else "I couldn't generate a response. Please try again."
        
        # Deduct token
        token_obj.tokens_remaining -= 1
        token_obj.tokens_used += 1
        token_obj.save()
        
        return JsonResponse({
            'response': ai_response,
            'tokens_remaining': token_obj.tokens_remaining,
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Failed to process message: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_practice_plan(request):
    """Generate an AI practice plan, costing 1 token.
    
    Free tier users limited to 3 regenerations per month.
    Premium tier users unlimited regenerations.
    """
    from payments.models import Subscription
    from datetime import datetime
    
    # Check if user is free tier and has exceeded regeneration limit
    subscription = Subscription.objects.filter(
        user=request.user,
        plan_type='premium',
        subscription_status='active'
    ).order_by('-id').first()
    
    is_premium = subscription and subscription.is_active if subscription else False
    
    if not is_premium:
        # Free tier: check regeneration limit (3 per month)
        from django.utils import timezone
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        plans_this_month = DailyPlan.objects.filter(
            user=request.user,
            created_at__gte=current_month_start
        ).count()
        
        if plans_this_month >= 3:
            return JsonResponse(
                {'error': 'Free tier limited to 3 practice plans per month. Upgrade to premium for unlimited plans.'},
                status=402,
            )
    
    token_obj, _ = AIToken.objects.get_or_create(
        user=request.user,
        defaults={'tokens_remaining': _get_token_limit_for_user(request.user), 'tokens_limit': _get_token_limit_for_user(request.user)},
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

        # Use the is_premium from earlier check instead of querying again
        max_steps_per_category = 3 if is_premium else 1
        print(f"[PLAN GEN] User {request.user.id} is {'PREMIUM' if is_premium else 'FREE'} - Max {max_steps_per_category} steps per category")
        
        # LIMIT PLAN STEPS BY TIER: Max 1 per category (FREE) or 3 per category (PREMIUM)
        if 'steps' in plan:
            steps = plan['steps']
            category_counts = {}
            filtered_steps = []
            
            for step in steps:
                category = step.get('category', 'Unknown')
                current_count = category_counts.get(category, 0)
                
                if current_count < max_steps_per_category:
                    filtered_steps.append(step)
                    category_counts[category] = current_count + 1
                else:
                    print(f"[PLAN GEN] Removing step: {step.get('title', '')} from {category} (max {max_steps_per_category} per category)")
            
            plan['steps'] = filtered_steps
            print(f"[PLAN GEN] Limited plan: {len(steps)} steps → {len(filtered_steps)} steps")

        # Derive recommended lessons from the plan
        skill_level = (
            practice_data.get('user_context', {}).get('skill_level', 'Beginner')
        )
        recommended_slugs = _recommended_slugs(plan, skill_level)
        print(f"[PLAN GEN] Starting for user {request.user.id} - checking for old lessons...")
        
        # Create AI-generated learning cards based on the plan
        ai_generated_learning_slugs = _create_learning_cards_from_plan(plan, skill_level, instrument, request.user)
        print(f"[PLAN GEN] Created {len(ai_generated_learning_slugs)} AI learning cards for user {request.user.id}")
        
        # Verify the lessons were created correctly
        user_lessons_count = Lesson.objects.filter(user=request.user).count()
        print(f"[PLAN GEN] FINAL CHECK: User {request.user.id} now has {user_lessons_count} total lessons")
        
        if user_lessons_count > 20:
            print(f"[PLAN GEN] ⚠️ WARNING: User {request.user.id} has {user_lessons_count} lessons (should be ~10)!")
            # List them all for debugging
            lesson_list = list(Lesson.objects.filter(user=request.user).values_list('slug', 'user_id')[:50])
            print(f"[PLAN GEN] First 50 lessons: {lesson_list}")

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
            recommended_lesson_slugs=recommended_slugs + ai_generated_learning_slugs,
        )

        token_obj.tokens_remaining -= 1
        token_obj.tokens_used += 1
        token_obj.save()

        return JsonResponse({
            'success': True,
            'plan': plan,
            'plan_id': str(daily_plan.id),
            'recommended_lesson_slugs': recommended_slugs + ai_generated_learning_slugs,
            'ai_generated_lesson_slugs': ai_generated_learning_slugs,
            'tokens_remaining': token_obj.tokens_remaining,
        })

    except Exception as e:
        error_str = str(e)
        
        # Check for Google API quota exceeded (429 error)
        if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str or 'quota' in error_str.lower():
            print(f"[PLAN GEN] API quota exceeded for user {request.user.id}")
            return JsonResponse({
                'error': 'Out of api request'
            }, status=429)
        
        return JsonResponse({'error': error_str}, status=500)


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
        defaults={'tokens_remaining': _get_token_limit_for_user(request.user), 'tokens_limit': _get_token_limit_for_user(request.user)},
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
        error_str = str(e)
        
        if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str or 'quota' in error_str.lower():
            print(f"[CHAT] API quota exceeded for user {request.user.id}")
            return JsonResponse({
                'error': 'Out of api request'
            }, status=429)
        
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': error_str}, status=500)


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


@api_view(['POST', 'GET'])
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
        instrument = user_profile.instrument_name if user_profile and user_profile.instrument_name else 'Guitar'
        skill_level = user_profile.skill_level if user_profile and user_profile.skill_level else 'Beginner'
        learning_goal = user_profile.learning_goal_text if user_profile and user_profile.learning_goal_text else ''

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