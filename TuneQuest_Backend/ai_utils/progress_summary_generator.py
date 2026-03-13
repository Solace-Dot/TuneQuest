import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = "gemini-2.5-flash"

SUMMARY_FUNCTION = {
    "name": "analyze_practice_progress",
    "description": "Analyze a student's practice progress and generate personalized insights",
    "parameters": {
        "type": "object",
        "properties": {
            "overall_progress": {
                "type": "string",
                "description": "Overall progress summary statement (e.g., '78% improvement in rhythm accuracy')",
            },
            "strong_areas": {
                "type": "array",
                "description": "List of areas where the student excels",
                "items": {"type": "string"},
            },
            "areas_for_improvement": {
                "type": "array",
                "description": "List of areas needing more practice",
                "items": {"type": "string"},
            },
            "ai_recommendations": {
                "type": "array",
                "description": "Personalized practice recommendations for the next week",
                "items": {"type": "string"},
            },
        },
        "required": ["overall_progress", "strong_areas", "areas_for_improvement", "ai_recommendations"],
    },
}


class ProgressSummaryGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        self.client = genai.Client(api_key=api_key)

    def generate(
        self,
        instrument: str,
        skill_level: str,
        completed_exercises: list,
        total_exercises: int,
        category_stats: dict,
        learning_goal: str = "",
    ) -> dict:
        """
        Generate AI-powered progress summary based on practice data.

        Args:
            instrument: Guitar, Piano, etc.
            skill_level: Beginner, Intermediate, Advanced
            completed_exercises: List of completed exercise titles/categories
            total_exercises: Total exercises in the plan
            category_stats: Dict like {'Technique': 75, 'Rhythm': 60, ...}
            learning_goal: Optional user's learning goal

        Returns:
            dict with overall_progress, strong_areas, areas_for_improvement, ai_recommendations
        """
        completion_pct = int((len(completed_exercises) / total_exercises * 100) if total_exercises > 0 else 0)
        
        # Build a summary of practice data for context
        categories_summary = ", ".join(
            [f"{cat}: {pct}% complete" for cat, pct in category_stats.items()]
        )
        
        goal_context = f"User's learning goal: {learning_goal}. " if learning_goal.strip() else ""

        prompt = f"""You are a music practice coach for the TuneQuest learning app.
Analyze this student's practice progress and generate encouraging, actionable insights.

STUDENT PROFILE:
- Instrument: {instrument}
- Skill Level: {skill_level}
- Overall Progress: {completion_pct}% exercises complete ({len(completed_exercises)}/{total_exercises})
- Category Breakdown: {categories_summary}
{goal_context}

PRACTICE CATEGORIES COMPLETED:
{', '.join(completed_exercises[:20]) if completed_exercises else 'No exercises completed yet'}

Generate a progress analysis with:
1. Overall progress statement (one encouraging sentence with a specific metric)
2. 2-3 areas where they show strong performance (be specific to their category stats)
3. 2-3 areas that need more focused practice (identify from lower-scoring categories)
4. 3-4 personalized recommendations for their next practice session

Be encouraging and specific to their instrument, skill level, and actual progress data."""

        tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=SUMMARY_FUNCTION["name"],
                    description=SUMMARY_FUNCTION["description"],
                    parameters=SUMMARY_FUNCTION["parameters"],
                )
            ]
        )

        response = self.client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(tools=[tool]),
        )

        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    args = dict(part.function_call.args)
                    return {
                        "overall_progress": str(args.get("overall_progress", "You're making great progress!")),
                        "strong_areas": list(args.get("strong_areas", [])),
                        "areas_for_improvement": list(args.get("areas_for_improvement", [])),
                        "ai_recommendations": list(args.get("ai_recommendations", [])),
                    }

        raise ValueError("Gemini did not return a structured progress summary")
