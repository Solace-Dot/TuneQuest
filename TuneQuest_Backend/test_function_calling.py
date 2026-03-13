# test_function_calling.py - Simple test for the single-request AI system
import os
from ai_utils.quiz_generator import QuizGenerator

def test_single_request_system():
    """Test the single-request function calling system"""
    
    print("🎯 Testing Single-Request AI Function Calling System")
    print("=" * 60)
    
    # Make sure you have GEMINI_API_KEY in your .env file
    if not os.getenv('GEMINI_API_KEY'):
        print("❌ Please add GEMINI_API_KEY to your .env file")
        return
    
    try:
        generator = QuizGenerator()
        
        # Test different quiz requests
        test_messages = [
            "Give me a 5-question quiz on guitar chords for beginners",
            "Create 3 questions about piano scales for intermediate students", 
            "I want a quiz about music theory",
            "Hello there, how are you?"  # Non-quiz message
        ]
        
        for i, message in enumerate(test_messages, 1):
            print(f"\n📝 Test {i}: {message}")
            print("-" * 50)
            
            # Single Request (1 RPM) - AI detects function call
            result = generator.detect_quiz_request(message)
            
            if result.get('function_call'):
                print("✅ Function call detected!")
                print(f"Function: {result['function_call']['name']}")
                print(f"Args: {result['function_call']['args']}")
                
                # Generate quiz from function call
                questions = generator.create_quiz_from_function_call(result['function_call'])
                print(f"📚 Generated {len(questions)} questions")
                
                # Show first question as example
                if questions:
                    q = questions[0]
                    print(f"Sample Q: {q['question_text']}")
                    print(f"Options: {q['options']}")
                    print(f"Answer: {q['correct_answer']}")
            else:
                print("❌ No quiz request detected")
                
        print("\n" + "=" * 60)
        print("🎯 Test completed - This used only 1 RPM per request!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == '__main__':
    test_single_request_system()