"""
Personality Analysis Module

Analyzes tweets and interactions to build a personality model.
"""

from typing import Dict, List, Any
from collections import Counter
import numpy as np
from loguru import logger
from textblob import TextBlob
import spacy

# Load spaCy model
nlp = spacy.load("en_core_web_sm")


class PersonalityAnalyzer:
    """Analyzes text to extract personality traits."""

    # Big Five personality dimensions mapped to linguistic features
    TRAIT_INDICATORS = {
        "openness": {
            "words": [
                "creative",
                "innovative",
                "curious",
                "imaginative",
                "explore",
                "new",
                "idea",
                "art",
            ],
            "pos_tags": ["ADJ", "ADV"],
            "sentiment_weight": 0.3,
        },
        "conscientiousness": {
            "words": [
                "plan",
                "organize",
                "efficient",
                "reliable",
                "careful",
                "detail",
                "goal",
                "schedule",
            ],
            "pos_tags": ["VERB", "NOUN"],
            "sentiment_weight": 0.2,
        },
        "extraversion": {
            "words": [
                "social",
                "outgoing",
                "energetic",
                "enthusiastic",
                "party",
                "people",
                "talk",
                "fun",
            ],
            "pos_tags": ["INTJ"],
            "sentiment_weight": 0.4,
        },
        "agreeableness": {
            "words": [
                "kind",
                "helpful",
                "trust",
                "cooperative",
                "compassionate",
                "caring",
                "empathy",
                "support",
            ],
            "pos_tags": ["ADJ"],
            "sentiment_weight": 0.5,
        },
        "neuroticism": {
            "words": [
                "stress",
                "worry",
                "anxious",
                "nervous",
                "unstable",
                "emotional",
                "moody",
                "fear",
            ],
            "pos_tags": ["ADJ", "NOUN"],
            "sentiment_weight": -0.4,
        },
    }

    def __init__(self):
        logger.info("Personality analyzer initialized")

    def analyze_texts(self, texts: List[str]) -> Dict[str, float]:
        """
        Analyze a collection of texts to extract personality scores.

        Args:
            texts: List of text samples to analyze

        Returns:
            Dictionary of personality trait scores (0-1 scale)
        """
        if not texts:
            logger.warning("No texts provided for personality analysis")
            return self._default_personality()

        logger.info(f"Analyzing {len(texts)} texts for personality traits")

        # Aggregate features across all texts
        all_features = {
            "word_freq": Counter(),
            "pos_tags": Counter(),
            "sentiments": [],
            "avg_length": [],
            "complexity": [],
        }

        for text in texts:
            features = self._extract_features(text)
            all_features["word_freq"].update(features["words"])
            all_features["pos_tags"].update(features["pos_tags"])
            all_features["sentiments"].append(features["sentiment"])
            all_features["avg_length"].append(features["length"])
            all_features["complexity"].append(features["complexity"])

        # Calculate personality scores
        personality = {}

        for trait, indicators in self.TRAIT_INDICATORS.items():
            score = self._calculate_trait_score(trait, indicators, all_features)
            personality[trait] = score

        logger.info(f"Personality analysis complete: {personality}")
        return personality

    def _extract_features(self, text: str) -> Dict[str, Any]:
        """Extract linguistic features from text."""
        doc = nlp(text.lower())

        # Word frequencies
        words = [token.lemma_ for token in doc if not token.is_stop and token.is_alpha]

        # POS tags
        pos_tags = [token.pos_ for token in doc]

        # Sentiment
        blob = TextBlob(text)
        sentiment = blob.sentiment.polarity

        # Text complexity (average word length)
        complexity = np.mean([len(word) for word in words]) if words else 0

        return {
            "words": words,
            "pos_tags": pos_tags,
            "sentiment": sentiment,
            "length": len(text),
            "complexity": complexity,
        }

    def _calculate_trait_score(
        self, trait: str, indicators: Dict, features: Dict
    ) -> float:
        """Calculate score for a specific personality trait."""
        score = 0.5  # Baseline neutral

        # Word-based scoring
        trait_word_count = sum(
            features["word_freq"][word] for word in indicators["words"]
        )
        total_words = sum(features["word_freq"].values())

        if total_words > 0:
            word_ratio = trait_word_count / total_words
            score += word_ratio * 0.3

        # POS tag-based scoring
        trait_pos_count = sum(
            features["pos_tags"][pos] for pos in indicators["pos_tags"]
        )
        total_pos = sum(features["pos_tags"].values())

        if total_pos > 0:
            pos_ratio = trait_pos_count / total_pos
            score += pos_ratio * 0.2

        # Sentiment-based scoring
        avg_sentiment = np.mean(features["sentiments"])
        sentiment_contribution = avg_sentiment * indicators["sentiment_weight"]
        score += sentiment_contribution

        # Normalize to 0-1 range
        score = max(0.0, min(1.0, score))

        return round(score, 3)

    def _default_personality(self) -> Dict[str, float]:
        """Return default neutral personality scores."""
        return {
            "openness": 0.5,
            "conscientiousness": 0.5,
            "extraversion": 0.5,
            "agreeableness": 0.5,
            "neuroticism": 0.3,
        }

    def get_personality_description(self, scores: Dict[str, float]) -> str:
        """Generate a human-readable personality description."""
        descriptions = []

        if scores["openness"] > 0.6:
            descriptions.append("creative and open to new experiences")
        if scores["conscientiousness"] > 0.6:
            descriptions.append("organized and detail-oriented")
        if scores["extraversion"] > 0.6:
            descriptions.append("outgoing and energetic")
        if scores["agreeableness"] > 0.6:
            descriptions.append("friendly and cooperative")
        if scores["neuroticism"] < 0.4:
            descriptions.append("emotionally stable")

        if not descriptions:
            return "balanced and adaptable"

        return ", ".join(descriptions)

    def extract_writing_style(self, texts: List[str]) -> Dict[str, Any]:
        """Analyze writing style characteristics."""
        if not texts:
            return {}

        # Aggregate metrics
        metrics = {
            "avg_length": [],
            "avg_words_per_tweet": [],
            "punctuation_usage": [],
            "emoji_usage": [],
            "question_frequency": 0,
            "exclamation_frequency": 0,
        }

        for text in texts:
            metrics["avg_length"].append(len(text))
            metrics["avg_words_per_tweet"].append(len(text.split()))
            metrics["punctuation_usage"].append(sum(c in ",.!?;:" for c in text))
            metrics["emoji_usage"].append(
                sum(ord(c) > 127000 for c in text)
            )  # Rough emoji detection
            metrics["question_frequency"] += text.count("?")
            metrics["exclamation_frequency"] += text.count("!")

        return {
            "avg_tweet_length": round(np.mean(metrics["avg_length"]), 1),
            "avg_words": round(np.mean(metrics["avg_words_per_tweet"]), 1),
            "uses_punctuation": np.mean(metrics["punctuation_usage"]) > 2,
            "uses_emojis": np.mean(metrics["emoji_usage"]) > 0.5,
            "asks_questions": metrics["question_frequency"] / len(texts) > 0.1,
            "enthusiastic": metrics["exclamation_frequency"] / len(texts) > 0.2,
        }
