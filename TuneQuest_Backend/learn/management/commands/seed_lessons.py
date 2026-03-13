from django.core.management.base import BaseCommand
from learn.models import Lesson

LESSONS = [
    # ── Music Theory ─────────────────────────────────────────────
    {
        "slug": "l-001",
        "title": "The Musical Alphabet",
        "category": "Music Theory",
        "difficulty": "Beginner",
        "duration_minutes": 5,
        "order": 1,
        "description": "Learn the 12 notes that form all Western music and how they relate to each other.",
        "content": [
            {
                "type": "text",
                "heading": "What is the Musical Alphabet?",
                "body": "Western music uses 12 unique pitches, repeating in cycles called octaves. The 7 natural notes are A B C D E F G — after G, we return to A at a higher pitch. Between some notes sit sharps (♯) and flats (♭), giving us all 12.",
            },
            {
                "type": "note_grid",
                "heading": "The 12 Notes",
                "notes": ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"],
            },
            {
                "type": "tip",
                "body": "💡 On a piano, white keys are natural notes (A–G) and black keys are sharps/flats.",
            },
            {
                "type": "text",
                "heading": "Enharmonic Equivalents",
                "body": "C♯ and D♭ are the same pitch played on the same key — they just have different names depending on the musical context. These are called enharmonic equivalents.",
            },
        ],
    },
    {
        "slug": "l-002",
        "title": "Reading Rhythm: Note Values",
        "category": "Music Theory",
        "difficulty": "Beginner",
        "duration_minutes": 8,
        "order": 2,
        "description": "Understand how music measures time — whole notes, half notes, quarters, and beyond.",
        "content": [
            {
                "type": "text",
                "heading": "How Music Counts Time",
                "body": "Music is divided into beats. Different note shapes indicate how many beats a note lasts. A whole note lasts 4 beats, a half note 2, a quarter note 1, and an eighth note half a beat.",
            },
            {
                "type": "rhythm_table",
                "heading": "Note Value Chart",
                "rows": [
                    {"symbol": "𝅝", "name": "Whole Note", "beats": 4},
                    {"symbol": "𝅗𝅥", "name": "Half Note", "beats": 2},
                    {"symbol": "♩", "name": "Quarter Note", "beats": 1},
                    {"symbol": "♪", "name": "Eighth Note", "beats": 0.5},
                    {"symbol": "𝅘𝅥𝅯", "name": "Sixteenth Note", "beats": 0.25},
                ],
            },
            {
                "type": "tip",
                "body": "💡 Tap your foot on each beat. Quarter notes = one tap, half notes = hold for two taps.",
            },
        ],
    },
    {
        "slug": "l-003",
        "title": "Understanding Intervals",
        "category": "Music Theory",
        "difficulty": "Intermediate",
        "duration_minutes": 10,
        "order": 3,
        "description": "Intervals are the distance between two notes — the building blocks of melody and harmony.",
        "content": [
            {
                "type": "text",
                "heading": "What Is an Interval?",
                "body": "An interval is the distance between two pitches, measured in half-steps (semitones). Every chord, scale, and melody is built from intervals. Learning to hear them is a superpower for any musician.",
            },
            {
                "type": "interval_table",
                "heading": "Common Intervals",
                "rows": [
                    {"semitones": 0, "name": "Perfect Unison", "example": "C → C"},
                    {"semitones": 1, "name": "Minor 2nd", "example": "C → C♯"},
                    {"semitones": 2, "name": "Major 2nd", "example": "C → D"},
                    {"semitones": 3, "name": "Minor 3rd", "example": "C → E♭"},
                    {"semitones": 4, "name": "Major 3rd", "example": "C → E"},
                    {"semitones": 5, "name": "Perfect 4th", "example": "C → F"},
                    {"semitones": 7, "name": "Perfect 5th", "example": "C → G"},
                    {"semitones": 12, "name": "Octave", "example": "C → C (higher)"},
                ],
            },
            {
                "type": "tip",
                "body": "💡 A Major 3rd sounds bright and happy. A Minor 3rd sounds moody and dark. Train your ear to hear the difference!",
            },
        ],
    },
    # ── Scales ───────────────────────────────────────────────────
    {
        "slug": "l-004",
        "title": "The Major Scale",
        "category": "Scales",
        "difficulty": "Beginner",
        "duration_minutes": 7,
        "order": 4,
        "description": "The major scale is the foundation of Western music. Master it and unlock every key.",
        "content": [
            {
                "type": "text",
                "heading": "The Major Scale Formula",
                "body": "A major scale is built from 7 notes using a specific pattern of whole steps (W) and half steps (H). This pattern creates the bright, happy sound you recognise from nursery rhymes and pop music.",
            },
            {
                "type": "formula",
                "heading": "Whole/Half Step Pattern",
                "steps": ["W", "W", "H", "W", "W", "W", "H"],
                "labels": ["1", "2", "3", "4", "5", "6", "7", "8"],
            },
            {
                "type": "note_grid",
                "heading": "C Major Scale",
                "notes": ["C", "D", "E", "F", "G", "A", "B", "C"],
                "highlight": True,
            },
            {
                "type": "tip",
                "body": "💡 The C Major scale uses only white keys on a piano — a great starting point for beginners!",
            },
        ],
    },
    {
        "slug": "l-005",
        "title": "The Minor Pentatonic Scale",
        "category": "Scales",
        "difficulty": "Beginner",
        "duration_minutes": 6,
        "order": 5,
        "description": "The most popular scale in rock, blues, and pop. 5 notes that sound great almost anywhere.",
        "content": [
            {
                "type": "text",
                "heading": "Why Pentatonic?",
                "body": "'Penta' means five. The minor pentatonic scale has just 5 notes — making it easy to learn and hard to sound bad with. It's the scale behind countless guitar solos and blues riffs.",
            },
            {
                "type": "formula",
                "heading": "Semitone Pattern (from root)",
                "steps": ["3", "2", "2", "3", "2"],
                "labels": ["1", "♭3", "4", "5", "♭7", "8"],
            },
            {
                "type": "note_grid",
                "heading": "A Minor Pentatonic",
                "notes": ["A", "C", "D", "E", "G", "A"],
                "highlight": True,
            },
            {
                "type": "tip",
                "body": "💡 Practice this scale over a backing track in Am — every note will sound musical!",
            },
        ],
    },
    # ── Chords ───────────────────────────────────────────────────
    {
        "slug": "l-006",
        "title": "Major & Minor Triads",
        "category": "Chords",
        "difficulty": "Beginner",
        "duration_minutes": 8,
        "order": 6,
        "description": "Learn the two most essential chord types — the foundation of all harmony.",
        "content": [
            {
                "type": "text",
                "heading": "What Is a Triad?",
                "body": "A triad is a chord built from 3 notes: the root, a third, and a fifth. The distance between the root and the third determines whether the chord is major (bright) or minor (dark).",
            },
            {
                "type": "chord_grid",
                "heading": "Triad Formulas",
                "chords": [
                    {"name": "Major Triad", "formula": "1 – M3 – P5", "example": "C – E – G", "mood": "Happy, bright, stable"},
                    {"name": "Minor Triad", "formula": "1 – m3 – P5", "example": "Am – C – E", "mood": "Sad, dark, emotional"},
                ],
            },
            {
                "type": "tip",
                "body": "💡 C Major and A Minor share the exact same notes (C, E, G / A, C, E) — they're relative chords!",
            },
        ],
    },
    {
        "slug": "l-007",
        "title": "The I–IV–V–I Chord Progression",
        "category": "Chords",
        "difficulty": "Beginner",
        "duration_minutes": 9,
        "order": 7,
        "description": "The most used chord progression in all of popular music. Hear it everywhere once you know it.",
        "content": [
            {
                "type": "text",
                "heading": "Roman Numerals in Music",
                "body": "Chords are labelled with Roman numerals based on their position in a scale. I is the tonic (home base), IV is the subdominant, V is the dominant — it creates tension that wants to resolve back to I.",
            },
            {
                "type": "chord_progression",
                "heading": "I–IV–V–I in C Major",
                "chords": [
                    {"numeral": "I", "name": "C Major", "notes": "C E G"},
                    {"numeral": "IV", "name": "F Major", "notes": "F A C"},
                    {"numeral": "V", "name": "G Major", "notes": "G B D"},
                    {"numeral": "I", "name": "C Major", "notes": "C E G"},
                ],
            },
            {
                "type": "tip",
                "body": "💡 Songs using this progression: La Bamba, Twist and Shout, Johnny B. Goode — and thousands more.",
            },
        ],
    },
    {
        "slug": "l-008",
        "title": "Seventh Chords",
        "category": "Chords",
        "difficulty": "Intermediate",
        "duration_minutes": 10,
        "order": 8,
        "description": "Add a 4th note to your triads for richer, jazzier harmony.",
        "content": [
            {
                "type": "text",
                "heading": "Going Beyond Triads",
                "body": "A seventh chord adds one more note — the 7th interval above the root — to a triad. The result is a richer, more colourful sound used in jazz, blues, soul, and modern pop.",
            },
            {
                "type": "chord_grid",
                "heading": "Types of Seventh Chords",
                "chords": [
                    {"name": "Major 7th (maj7)", "formula": "1–M3–P5–M7", "example": "C–E–G–B", "mood": "Dreamy, sophisticated"},
                    {"name": "Minor 7th (m7)", "formula": "1–m3–P5–m7", "example": "A–C–E–G", "mood": "Mellow, soulful"},
                    {"name": "Dominant 7th (7)", "formula": "1–M3–P5–m7", "example": "G–B–D–F", "mood": "Bluesy, tense"},
                ],
            },
            {
                "type": "tip",
                "body": "💡 Dominant 7th chords (like G7) create strong tension that wants to resolve to the I chord.",
            },
        ],
    },
    # ── Rhythm ───────────────────────────────────────────────────
    {
        "slug": "l-009",
        "title": "Time Signatures",
        "category": "Rhythm",
        "difficulty": "Beginner",
        "duration_minutes": 7,
        "order": 9,
        "description": "Understand the numbers at the start of a piece — they control how the music flows.",
        "content": [
            {
                "type": "text",
                "heading": "What Does the Time Signature Mean?",
                "body": "A time signature appears as two numbers stacked vertically. The top number tells you how many beats are in each measure. The bottom number tells you what type of note gets one beat (4 = quarter note).",
            },
            {
                "type": "time_sig_table",
                "heading": "Common Time Signatures",
                "rows": [
                    {"sig": "4/4", "top": "4 beats per bar", "bottom": "Quarter note = 1 beat", "feel": "Most common — pop, rock, classical"},
                    {"sig": "3/4", "top": "3 beats per bar", "bottom": "Quarter note = 1 beat", "feel": "Waltz feel — 1-2-3, 1-2-3"},
                    {"sig": "6/8", "top": "6 beats per bar", "bottom": "Eighth note = 1 beat", "feel": "Compound — flowing, two-in-a-bar feel"},
                    {"sig": "2/4", "top": "2 beats per bar", "bottom": "Quarter note = 1 beat", "feel": "March — strong, forward momentum"},
                ],
            },
            {
                "type": "tip",
                "body": "💡 4/4 is called 'common time' and written as a C symbol. It's used in the vast majority of pop music.",
            },
        ],
    },
    {
        "slug": "l-010",
        "title": "Syncopation",
        "category": "Rhythm",
        "difficulty": "Intermediate",
        "duration_minutes": 8,
        "order": 10,
        "description": "Give your playing groove and swing by accenting the off-beats — the secret to making music feel alive.",
        "content": [
            {
                "type": "text",
                "heading": "What Is Syncopation?",
                "body": "Syncopation means placing accents on beats that are normally weak, or creating notes that tie across beat boundaries. It disrupts the listener's expectation of the downbeat, creating tension and groove.",
            },
            {
                "type": "text",
                "heading": "Counting Syncopated Rhythms",
                "body": "In 4/4 time, beats 1 and 3 are strong. Beats 2 and 4 (and especially the 'ands' between beats) are weak. Syncopation accents the weak spots: '1 and 2 AND 3 and 4 AND'.",
            },
            {
                "type": "tip",
                "body": "💡 Funk, reggae, jazz, and hip-hop are built on syncopation. Clap along to a funk beat and notice how the accents fall between the main beats.",
            },
        ],
    },
    # ── Ear Training ─────────────────────────────────────────────
    {
        "slug": "l-011",
        "title": "Interval Recognition",
        "category": "Ear Training",
        "difficulty": "Beginner",
        "duration_minutes": 10,
        "order": 11,
        "description": "Train your ear to recognise the distance between notes — the core skill of all musicianship.",
        "content": [
            {
                "type": "text",
                "heading": "Why Train Your Ear?",
                "body": "Ear training means developing the ability to hear music and understand what's happening harmonically and melodically — without needing to look at sheet music. It transforms you from a note-reader into a true musician.",
            },
            {
                "type": "interval_songs",
                "heading": "Interval Mnemonics (songs to remember intervals)",
                "rows": [
                    {"interval": "Minor 2nd", "song": "\"Jaws\" theme"},
                    {"interval": "Major 2nd", "song": "\"Happy Birthday\" (first 2 notes)"},
                    {"interval": "Minor 3rd", "song": "\"Smoke on the Water\""},
                    {"interval": "Major 3rd", "song": "\"When the Saints Go Marching In\""},
                    {"interval": "Perfect 4th", "song": "\"Here Comes the Bride\""},
                    {"interval": "Perfect 5th", "song": "\"Star Wars\" theme"},
                    {"interval": "Octave", "song": "\"Somewhere Over the Rainbow\""},
                ],
            },
            {
                "type": "tip",
                "body": "💡 Associate each interval with a song you already know. Sing the first two notes of that song to identify intervals in the wild.",
            },
        ],
    },
    {
        "slug": "l-012",
        "title": "Major vs Minor Sound",
        "category": "Ear Training",
        "difficulty": "Beginner",
        "duration_minutes": 6,
        "order": 12,
        "description": "The most important sound distinction in music — why some music sounds happy and some sounds sad.",
        "content": [
            {
                "type": "text",
                "heading": "The Emotional Difference",
                "body": "Major sounds bright, uplifting, and resolved. Minor sounds dark, emotional, or melancholy. The difference comes down to just one note: the 3rd. Lower the 3rd by a half step and any major chord/scale becomes minor.",
            },
            {
                "type": "chord_grid",
                "heading": "Same Root, Different 3rd",
                "chords": [
                    {"name": "C Major", "formula": "C – E – G", "example": "C–E–G", "mood": "Bright, resolved, happy"},
                    {"name": "C Minor", "formula": "C – E♭ – G", "example": "C–E♭–G", "mood": "Dark, emotional, tense"},
                ],
            },
            {
                "type": "tip",
                "body": "💡 Practice: sing 'do-mi-sol' (major), then 'do-me-sol' (minor). Notice how just one half-step changes the entire mood.",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed the database with the 12 default Learn page lessons."

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing lessons before seeding.',
        )

    def handle(self, *args, **options):
        if options['clear']:
            deleted, _ = Lesson.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing lessons."))

        created_count = 0
        updated_count = 0

        for data in LESSONS:
            lesson, created = Lesson.objects.update_or_create(
                slug=data['slug'],
                defaults={k: v for k, v in data.items() if k != 'slug'},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created: {created_count}, Updated: {updated_count} lessons."
            )
        )
