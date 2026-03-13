import os
import google.generativeai as genai
from django.http import JsonResponse

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")


def ask_gemini(request):
    print("Key:", os.getenv("GEMINI_API_KEY"))
    prompt = request.GET.get("q")

    response = model.generate_content(prompt)

    return JsonResponse({
        "prompt": prompt,
        "response": response.text
    })


def quiz_generator(request):
    pass


def project_plan_generator(request):
    pass


def progress_analyzer(request):
    pass
