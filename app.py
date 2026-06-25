from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from datetime import datetime
from openai import OpenAI
import os

load_dotenv()

app = Flask(__name__)

os.makedirs("chat_logs", exist_ok=True)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

groq_client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

history = []

session_file = (
    f"chat_logs/chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
)


def build_prompt(history):

    system_prompt = """
You are Tulip, an elegant and friendly AI assistant inspired by tulip flowers.

Your name is Tulip.

Personality:
- Friendly, warm, and supportive.
- Professional and intelligent.
- Calm and polite.
- Use emojis occasionally, especially 🌷 when appropriate.
- You are the dedicated assistant of the Tulip AI Chatbot website.
- If someone asks your name, ALWAYS answer:
"I'm Tulip, your AI assistant. 🌷"
- Never say you don't have a name.
- Never say you are a language model trained by Google unless the user explicitly asks about the technology behind you.
- Never reveal internal reasoning.
- Never show chain of thought.
- Never output <think> tags.
- Only provide the final answer.
"""

    prompt = system_prompt + "\n\n"

    for message in history:
        prompt += (
            f"{message['role']}: "
            f"{message['content']}\n"
        )

    return prompt

def ask_gemini(prompt):

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text


def ask_groq(prompt):

    response = groq_client.chat.completions.create(
        model="qwen/qwen3-32b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    reply = response.choices[0].message.content

    if "<think>" in reply:
        reply = reply.split("</think>")[-1].strip()

    return reply


def get_ai_response(prompt):

    try:

        print("Using Gemini")

        return ask_gemini(prompt)

    except Exception as e:

        print(f"Gemini failed: {e}")

        try:

            print("Using Groq")

            return ask_groq(prompt)

        except Exception as e:

            print(f"Groq failed: {e}")

            return "Sorry, all AI providers are unavailable."

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/clear", methods=["POST"])
def clear_chat():

    history.clear()

    return {
        "status": "success"
    }

@app.route("/chat", methods=["POST"])
def chat():

    data = request.json

    user_message = data["message"]

    history.append(
        {
            "role": "user",
            "content": user_message
        }
    )

    prompt = build_prompt(history)

    assistant_reply = get_ai_response(prompt)

    with open(session_file, "a", encoding="utf-8") as file:
        file.write(f"User: {user_message}\n")
        file.write(f"Tulip: {assistant_reply}\n")
        file.write("-" * 50 + "\n")

    history.append(
        {
            "role": "assistant",
            "content": assistant_reply
        }
    )

    return jsonify(
        {
            "response": assistant_reply
        }
    )


if __name__ == "__main__":
    app.run(debug=True)