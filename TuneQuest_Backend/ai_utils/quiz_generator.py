# ai_utils/quiz_generator.py
import os
import re
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
import json

load_dotenv()

MODEL_NAME = "gemini-2.5-flash"

class QuizGenerator:
    """Single-request AI using Gemini function calling"""
    
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found")
        
        self.client = genai.Client(api_key=api_key)
    
    def detect_quiz_request(self, user_message):
        """Detect quiz request using pattern matching + Gemini to generate questions (1 RPM total)"""
        
        # Step 1: Pattern matching to detect quiz intent (0 RPM, fast, reliable)
        quiz_keywords = ['quiz', 'test', 'question', 'ask me', 'challenge', 'evaluate']
        is_quiz_request = any(keyword in user_message.lower() for keyword in quiz_keywords)
        
        if not is_quiz_request:
            print(f"❌ Not a quiz request: {user_message}")
            return {'function_call': None}
        
        # Step 2: Extract parameters with pattern matching
        params = self._extract_quiz_parameters(user_message)
        print(f"📋 Extracted params: {params}")
        
        # Step 3: Use Gemini to generate actual questions (1 RPM)
        try:
            questions = self._generate_questions_with_ai(
                topic=params['topic'],
                instrument=params['instrument'],
                skill_level=params['skill_level'],
                num_questions=params['num_questions']
            )
            
            if questions and len(questions) > 0:
                print(f"✅ Gemini generated {len(questions)} questions")
                return {
                    'function_call': {
                        'name': 'create_quiz',
                        'args': {
                            'topic': params['topic'],
                            'instrument': params['instrument'],
                            'skill_level': params['skill_level'],
                            'questions': questions
                        }
                    }
                }
            else:
                print(f"⚠️ Gemini returned no questions, using fallback")
                # Return params without questions - will use hardcoded fallback
                return {
                    'function_call': {
                        'name': 'create_quiz',
                        'args': params
                    }
                }
                
        except Exception as e:
            print(f"⚠️ Error generating questions with AI: {str(e)}")
            # Fallback to hardcoded questions
            return {
                'function_call': {
                    'name': 'create_quiz',
                    'args': params
                }
            }
    
    def _generate_questions_with_ai(self, topic, instrument, skill_level, num_questions):
        """Generate quiz questions using Gemini (1 RPM) - returns array of question dicts"""
        try:
            # Check if this is ear training - different prompt format
            is_ear_training = 'ear' in topic.lower() or 'interval' in topic.lower() or 'identify by ear' in topic.lower()
            
            if is_ear_training:
                prompt = f"""Generate {num_questions} ear training quiz questions for {instrument} at {skill_level} level.

Return ONLY valid JSON array format (no markdown, no backticks):
[
  {{
    "question_text": "Listen to the audio. What interval/chord do you hear?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Explanation here",
    "audio_meta": {{
      "mode": "interval" or "chord_quality" or "single_note",
      "root_hz": 220.0,
      "semitones": 7 (for interval mode),
      "quality": "major" or "minor" (for chord_quality mode),
      "freq_hz": 110.0 (for single_note mode),
      "waveform": "sine" or "triangle"
    }}
  }}
]

Requirements:
- Each question must have exactly 4 options
- correct_answer must be one of the options
- Include audio_meta for each question
- For intervals: mode="interval", root_hz (100-400), semitones (1-12)
- For chords: mode="chord_quality", root_hz (100-400), quality="major" or "minor"
- For notes: mode="single_note", freq_hz (50-500)
- Make questions progressively harder for {skill_level} level
- Maximum {num_questions} questions"""
            else:
                prompt = f"""Generate {num_questions} music education quiz questions about {topic} for {instrument} at {skill_level} level.

Return ONLY valid JSON array format (no markdown, no backticks):
[
  {{
    "question_text": "Question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Explanation here"
  }}
]

Requirements:
- Each question must have exactly 4 options
- correct_answer must be one of the options  
- Make questions educational and appropriate for {skill_level} level
- Vary question types (theory, technique, application)
- Maximum {num_questions} questions"""

            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.8
                )
            )
            
            if response and response.text:
                raw = response.text.strip()
                # Extract JSON array even if Gemini appends extra text
                start = raw.find('[')
                end = raw.rfind(']')
                if start != -1 and end != -1 and end > start:
                    raw = raw[start:end + 1]
                questions = json.loads(raw)
                
                # Validate structure
                if isinstance(questions, list) and len(questions) > 0:
                    # Ensure each question has required fields
                    validated = []
                    for q in questions:
                        required_fields = ['question_text', 'options', 'correct_answer', 'explanation']
                        if is_ear_training:
                            required_fields.append('audio_meta')
                        
                        if all(k in q for k in required_fields):
                            # Ensure audio_meta is a dict for ear training
                            if is_ear_training and isinstance(q.get('audio_meta'), dict):
                                validated.append(q)
                            elif not is_ear_training:
                                validated.append(q)
                    
                    return validated[:num_questions]  # Cap at requested number
            
            return []
            
        except Exception as e:
            print(f"❌ Error generating questions: {str(e)}")
            return []
    
    def _extract_quiz_parameters(self, user_message):
        """Extract quiz parameters from natural language message"""
        message_lower = user_message.lower()

        # Extract number of questions - handle "10 hard questions", "give me 5", "10 questions", etc.
        num_questions = 5  # default
        # Look for a digit followed eventually by "question", or just a standalone number
        num_match = re.search(r'(\d+)\s+(?:\w+\s+)*questions?', message_lower)
        if not num_match:
            num_match = re.search(r'(\d+)\s*q\b', message_lower)
        if not num_match:
            # Last resort: grab any number in the message
            num_match = re.search(r'\b(\d+)\b', message_lower)
        if num_match:
            num_questions = int(num_match.group(1))
        num_questions = max(1, min(10, num_questions))

        # Determine skill level
        skill_level = 'beginner'
        if any(w in message_lower for w in ['advanced', 'hard', 'expert', 'difficult']):
            skill_level = 'advanced'
        elif any(w in message_lower for w in ['intermediate', 'medium']):
            skill_level = 'intermediate'

        # Extract instrument
        instruments = ['guitar', 'piano', 'violin', 'bass', 'drums', 'flute', 'trumpet', 'cello']
        instrument = 'guitar'
        for inst in instruments:
            if inst in message_lower:
                instrument = inst
                break

        # Extract topic — check multi-word topics first, then single keywords
        topic = 'music theory'
        topic_map = [
            (['ear training', 'ear train'], 'ear training'),
            (['sight reading', 'sight read'], 'sight reading'),
            (['music theory', 'theory'], 'music theory'),
            (['chord progression', 'progression'], 'chord progressions'),
            (['chord'], 'chords'),
            (['scale'], 'scales'),
            (['rhythm'], 'rhythm'),
            (['interval'], 'intervals'),
            (['note'], 'notes'),
        ]
        for keywords, mapped_topic in topic_map:
            if any(kw in message_lower for kw in keywords):
                topic = mapped_topic
                break

        return {
            'topic': topic,
            'instrument': instrument,
            'skill_level': skill_level,
            'num_questions': num_questions,
        }
    
    def _convert_args(self, args):
        """Convert protobuf args to dict safely, handling nested structures"""
        if isinstance(args, dict):
            return args
        
        try:
            # Try to convert to dict
            result = dict(args)
            
            # Handle nested arrays/objects (like questions array)
            if 'questions' in result:
                questions = result['questions']
                if not isinstance(questions, list):
                    try:
                        questions = list(questions)
                    except:
                        questions = []
                
                # Convert each question dict
                converted_questions = []
                for q in questions:
                    if isinstance(q, dict):
                        converted_questions.append(q)
                    else:
                        try:
                            q_dict = dict(q)
                            # Ensure options is a list
                            if 'options' in q_dict and not isinstance(q_dict['options'], list):
                                q_dict['options'] = list(q_dict['options'])
                            converted_questions.append(q_dict)
                        except:
                            pass
                
                result['questions'] = converted_questions
            
            return result
        except:
            try:
                return vars(args) if hasattr(args, '__dict__') else {}
            except:
                return {}
    
    def create_quiz_from_function_call(self, function_call):
        """Extract quiz questions from function call (AI-generated or fallback)"""
        try:
            # Extract arguments - handle both dict and other formats
            args = function_call.get('args', {})
            if not isinstance(args, dict):
                try:
                    args = dict(args)
                except:
                    args = vars(args) if hasattr(args, '__dict__') else {}
            
            # Check if AI already generated questions
            if 'questions' in args and args['questions']:
                questions = args['questions']
                # Ensure each question has an ID
                for i, q in enumerate(questions):
                    if 'id' not in q:
                        q['id'] = i + 1
                    # Convert options to list if needed
                    if not isinstance(q.get('options'), list):
                        try:
                            q['options'] = list(q['options'])
                        except:
                            q['options'] = []
                
                print(f"🤖 Using AI-generated questions: {len(questions)} questions")
                return questions
            
            # Fallback to hardcoded questions if AI didn't generate any
            print(f"⚠️ No AI questions found, using hardcoded fallback")
            topic = args.get('topic', 'music theory')
            instrument = args.get('instrument', 'guitar')
            skill_level = args.get('skill_level', 'beginner').lower()
            
            # Ensure skill_level is valid
            if skill_level not in ['beginner', 'intermediate', 'advanced']:
                skill_level = 'beginner'
            
            # Get number of questions and ensure it's within range
            num_questions = int(args.get('num_questions', 5))
            num_questions = max(1, min(10, num_questions))  # Clamp between 1-10
            
            # Generate quiz questions based on parameters
            questions = []
            
            # Define question templates based on topic
            if 'ear' in topic.lower() or 'interval' in topic.lower() or 'identify by ear' in topic.lower():
                # Fallback ear training questions with audio_meta
                ear_training_questions = [
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
                        'question_text': 'Listen to the single note and identify the pitch.',
                        'options': ['E', 'A', 'G', 'B'],
                        'correct_answer': 'A',
                        'explanation': 'The pitch is A2 (~110 Hz).',
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
                for i in range(min(num_questions, len(ear_training_questions))):
                    q = ear_training_questions[i].copy()
                    q['id'] = i + 1
                    questions.append(q)
                    
            elif 'chord' in topic.lower():
                chord_questions = [
                    {
                        'question_text': f'What notes make up a C major chord on {instrument}?',
                        'options': ['C-E-G', 'C-F-A', 'C-D-G', 'C-E-A'],
                        'correct_answer': 'C-E-G',
                        'explanation': f'A C major chord consists of the root (C), major third (E), and perfect fifth (G).'
                    },
                    {
                        'question_text': f'Which chord contains the notes G-B-D?',
                        'options': ['G major', 'G minor', 'C major', 'D major'],
                        'correct_answer': 'G major',
                        'explanation': 'G major chord is built from G (root), B (major third), and D (perfect fifth).'
                    },
                    {
                        'question_text': f'What type of chord is A-C-E on {instrument}?',
                        'options': ['A minor', 'A major', 'C major', 'E minor'],
                        'correct_answer': 'A minor',
                        'explanation': 'A minor chord contains A (root), C (minor third), and E (perfect fifth).'
                    },
                    {
                        'question_text': f'How many semitones are in a major third interval?',
                        'options': ['2', '3', '4', '5'],
                        'correct_answer': '4',
                        'explanation': 'A major third spans 4 semitones (e.g., C to E).'
                    },
                    {
                        'question_text': f'What distinguishes a major chord from a minor chord?',
                        'options': ['The third interval', 'The fifth interval', 'The root note', 'The octave'],
                        'correct_answer': 'The third interval',
                        'explanation': 'Major chords have a major third (4 semitones), minor chords have a minor third (3 semitones).'
                    },
                ]
                for i in range(min(num_questions, len(chord_questions))):
                    q = chord_questions[i].copy()
                    q['id'] = i + 1
                    questions.append(q)
                    
            elif 'scale' in topic.lower():
                scale_questions = [
                    {
                        'question_text': f'How many notes are in a major scale?',
                        'options': ['5', '6', '7', '8'],
                        'correct_answer': '7',
                        'explanation': 'A major scale contains 7 different notes (8 including the octave).'
                    },
                    {
                        'question_text': f'What is the pattern of whole and half steps in a major scale?',
                        'options': ['W-W-H-W-W-W-H', 'W-H-W-W-H-W-W', 'H-W-W-H-W-W-W', 'W-W-W-H-W-W-H'],
                        'correct_answer': 'W-W-H-W-W-W-H',
                        'explanation': 'Major scale pattern: Whole-Whole-Half-Whole-Whole-Whole-Half steps.'
                    },
                    {
                        'question_text': f'Which scale has all natural notes (no sharps or flats)?',
                        'options': ['C major', 'G major', 'D major', 'F major'],
                        'correct_answer': 'C major',
                        'explanation': 'C major scale uses only white keys: C-D-E-F-G-A-B-C.'
                    },
                    {
                        'question_text': f'How many notes are in a pentatonic scale?',
                        'options': ['4', '5', '6', '7'],
                        'correct_answer': '5',
                        'explanation': 'Pentatonic means "five tones" - a 5-note scale.'
                    },
                    {
                        'question_text': f'What is the relative minor of C major?',
                        'options': ['A minor', 'C minor', 'E minor', 'D minor'],
                        'correct_answer': 'A minor',
                        'explanation': 'A minor is the relative minor of C major (they share the same notes).'
                    },
                ]
                for i in range(min(num_questions, len(scale_questions))):
                    q = scale_questions[i].copy()
                    q['id'] = i + 1
                    questions.append(q)
                    
            else:
                general_questions = [
                    {
                        'question_text': f'What is a good practice tempo for {skill_level} {instrument} students?',
                        'options': ['60 BPM', '90 BPM', '120 BPM', '150 BPM'],
                        'correct_answer': '60 BPM' if skill_level == 'beginner' else ('90 BPM' if skill_level == 'intermediate' else '120 BPM'),
                        'explanation': f'Start with a comfortable tempo to build proper technique for {skill_level} level.'
                    },
                    {
                        'question_text': 'What does BPM stand for in music?',
                        'options': ['Beats Per Minute', 'Bass Per Measure', 'Bar Per Movement', 'Beat Pattern Mode'],
                        'correct_answer': 'Beats Per Minute',
                        'explanation': 'BPM (Beats Per Minute) measures the tempo or speed of music.'
                    },
                    {
                        'question_text': f'How many beats are in a measure of 4/4 time?',
                        'options': ['2', '3', '4', '6'],
                        'correct_answer': '4',
                        'explanation': '4/4 time has 4 beats per measure (the most common time signature).'
                    },
                    {
                        'question_text': 'What is the term for gradually getting louder?',
                        'options': ['Crescendo', 'Diminuendo', 'Forte', 'Piano'],
                        'correct_answer': 'Crescendo',
                        'explanation': 'Crescendo means to gradually increase in volume.'
                    },
                    {
                        'question_text': f'What is the recommended daily practice time for {skill_level} students?',
                        'options': ['15-20 minutes', '30-45 minutes', '1-2 hours', '3+ hours'],
                        'correct_answer': '15-20 minutes' if skill_level == 'beginner' else ('30-45 minutes' if skill_level == 'intermediate' else '1-2 hours'),
                        'explanation': f'Consistent daily practice is more important than long sessions for {skill_level} level.'
                    },
                ]
                for i in range(min(num_questions, len(general_questions))):
                    q = general_questions[i].copy()
                    q['id'] = i + 1
                    questions.append(q)
            
            return questions
        except Exception as e:
            print(f"Error creating quiz: {str(e)}")
            import traceback
            traceback.print_exc()
            # Return fallback questions on error
            return [{
                'id': 1,
                'question_text': 'What is music theory?',
                'options': ['Study of music', 'History of music', 'Performance technique', 'Instrument construction'],
                'correct_answer': 'Study of music',
                'explanation': 'Music theory is the study of how music works.'
            }]