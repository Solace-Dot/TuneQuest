"""
ai/gemini/client.py
───────────────────────
Central place to initialise the Gemini SDK so every util
imports the same configured client instead of duplicating setup code.
"""
import google.generativeai as genai
from django.conf import settings


def get_model(model_name: str = "gemini-1.5-flash") -> genai.GenerativeModel:
    """
    Return a configured GenerativeModel instance.

    Parameters
    ----------
    model_name : str
        Gemini model to use.
        • "gemini-1.5-flash"  – fast, great for quizzes / practice plans
        • "gemini-1.5-pro"    – slower but more nuanced (premium analysis)

    Usage
    -----
        from ai_app.gemini_client import get_model
        model  = get_model()
        result = model.generate_content("Your prompt here")
        print(result.text)
    """
    if not settings.GEMINI_API_KEY:
        raise EnvironmentError(
            "GEMINI_API_KEY is not set. Add it to your .env file."
        )

    genai.configure(api_key=settings.GEMINI_API_KEY)

    generation_config = genai.types.GenerationConfig(
        temperature=0.7,       # balanced creativity vs. accuracy
        top_p=0.9,
        top_k=40,
        max_output_tokens=2048,
    )

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]

    return genai.GenerativeModel(
        model_name=model_name,
        generation_config=generation_config,
        safety_settings=safety_settings,
    )
