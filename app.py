
from flask import Flask, render_template, request, jsonify
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from collections import Counter
import re

app = Flask(__name__)
analyzer = SentimentIntensityAnalyzer()


def analyze_text(text):
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Please enter some text to analyze.")

    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]

    if compound >= 0.05:
        sentiment = "Positive"
        emoji = "😊"
    elif compound <= -0.05:
        sentiment = "Negative"
        emoji = "😞"
    else:
        sentiment = "Neutral"
        emoji = "😐"

    words = re.findall(r"\b[\w']+\b", text)
    sentences = [
        s for s in re.split(r"[.!?]+", text) if s.strip()
    ]

    return {
        "text": text,
        "sentiment": sentiment,
        "emoji": emoji,
        "scores": {
            "positive": round(scores["pos"] * 100, 2),
            "negative": round(scores["neg"] * 100, 2),
            "neutral": round(scores["neu"] * 100, 2),
            "compound": round(compound, 4)
        },
        "statistics": {
            "characters": len(text),
            "words": len(words),
            "sentences": len(sentences)
        }
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}

    try:
        result = analyze_text(data.get("text", ""))
        return jsonify(result)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.route("/api/batch", methods=["POST"])
def batch_analyze():
    data = request.get_json(silent=True) or {}
    texts = data.get("texts", [])

    if not isinstance(texts, list) or not texts:
        return jsonify({"error": "Please provide a list of texts."}), 400

    if len(texts) > 100:
        return jsonify({"error": "Maximum 100 texts per batch."}), 400

    results = []

    for index, text in enumerate(texts):
        try:
            result = analyze_text(text)
            result["index"] = index
            results.append(result)
        except ValueError as error:
            results.append({"index": index, "error": str(error)})

    valid = [r for r in results if "sentiment" in r]
    distribution = Counter(r["sentiment"] for r in valid)

    return jsonify({
        "results": results,
        "total": len(texts),
        "analyzed": len(valid),
        "distribution": {
            "positive": distribution.get("Positive", 0),
            "negative": distribution.get("Negative", 0),
            "neutral": distribution.get("Neutral", 0)
        }
    })


if __name__ == "__main__":
    app.run(debug=True)
