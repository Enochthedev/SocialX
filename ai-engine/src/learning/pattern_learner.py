"""
Pattern Learning Module

Learns patterns from user behavior, engagement, and content.
"""

from typing import List, Dict, Any, Tuple
import numpy as np
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from loguru import logger
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer


class PatternLearner:
    """Learns behavioral patterns from user data."""

    def __init__(self):
        self.tfidf = TfidfVectorizer(max_features=100, stop_words="english")
        logger.info("Pattern learner initialized")

    def learn_posting_patterns(
        self, tweets: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze when the user typically posts.

        Args:
            tweets: List of tweet dictionaries with timestamps

        Returns:
            Dictionary with posting patterns
        """
        if not tweets:
            return {"best_hours": [], "best_days": [], "avg_per_day": 0}

        # Extract timestamps
        hours = []
        days = []

        for tweet in tweets:
            created_at = tweet.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

            if created_at:
                hours.append(created_at.hour)
                days.append(created_at.strftime("%A"))

        # Find most common posting hours
        hour_counts = Counter(hours)
        best_hours = [h for h, _ in hour_counts.most_common(5)]

        # Find most common days
        day_counts = Counter(days)
        best_days = [d for d, _ in day_counts.most_common(3)]

        # Calculate average tweets per day
        if tweets:
            date_range = self._calculate_date_range(tweets)
            avg_per_day = len(tweets) / max(date_range, 1)
        else:
            avg_per_day = 0

        pattern = {
            "best_hours": best_hours,
            "best_days": best_days,
            "avg_per_day": round(avg_per_day, 2),
            "total_analyzed": len(tweets),
        }

        logger.info(f"Posting patterns learned: {pattern}")
        return pattern

    def learn_content_topics(
        self, tweets: List[str], n_clusters: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Discover main content topics using clustering.

        Args:
            tweets: List of tweet texts
            n_clusters: Number of topic clusters to identify

        Returns:
            List of topic clusters with keywords
        """
        if len(tweets) < n_clusters:
            logger.warning(f"Not enough tweets ({len(tweets)}) for {n_clusters} clusters")
            return []

        try:
            # Create TF-IDF matrix
            tfidf_matrix = self.tfidf.fit_transform(tweets)

            # Cluster tweets
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(tfidf_matrix)

            # Extract keywords for each cluster
            topics = []
            feature_names = self.tfidf.get_feature_names_out()

            for i in range(n_clusters):
                # Get cluster center
                center = kmeans.cluster_centers_[i]

                # Get top keywords
                top_indices = center.argsort()[-10:][::-1]
                keywords = [feature_names[idx] for idx in top_indices]

                # Count tweets in cluster
                cluster_size = np.sum(clusters == i)

                topics.append(
                    {
                        "cluster_id": i,
                        "keywords": keywords[:5],
                        "tweet_count": int(cluster_size),
                        "prominence": round(float(cluster_size / len(tweets)), 3),
                    }
                )

            # Sort by prominence
            topics.sort(key=lambda x: x["prominence"], reverse=True)

            logger.info(f"Discovered {len(topics)} content topics")
            return topics

        except Exception as e:
            logger.error(f"Failed to learn content topics: {e}")
            return []

    def learn_engagement_patterns(
        self, interactions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze what types of content get the most engagement.

        Args:
            interactions: List of interaction records

        Returns:
            Engagement patterns and preferences
        """
        if not interactions:
            return {}

        # Categorize by interaction type
        by_type = defaultdict(int)
        by_hour = defaultdict(int)

        for interaction in interactions:
            itype = interaction.get("interaction_type", "unknown")
            by_type[itype] += 1

            created_at = interaction.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(
                        created_at.replace("Z", "+00:00")
                    )
                by_hour[created_at.hour] += 1

        # Most engaging hours
        engaging_hours = sorted(by_hour.items(), key=lambda x: x[1], reverse=True)[:5]

        pattern = {
            "total_interactions": len(interactions),
            "by_type": dict(by_type),
            "most_engaging_hours": [h for h, _ in engaging_hours],
            "avg_per_day": len(interactions) / 30,  # Rough estimate
        }

        logger.info(f"Engagement patterns learned: {pattern}")
        return pattern

    def learn_vocabulary(self, tweets: List[str]) -> Dict[str, Any]:
        """
        Learn the user's vocabulary and language style.

        Args:
            tweets: List of tweet texts

        Returns:
            Vocabulary statistics and common phrases
        """
        if not tweets:
            return {}

        # Combine all tweets
        all_text = " ".join(tweets).lower()

        # Extract common words
        words = all_text.split()
        word_freq = Counter(words)

        # Remove very common words
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for"}
        filtered_freq = {
            word: count
            for word, count in word_freq.items()
            if word not in stop_words and len(word) > 2
        }

        # Get most common words
        common_words = [word for word, _ in sorted(
            filtered_freq.items(), key=lambda x: x[1], reverse=True
        )[:20]]

        # Detect common phrases (bigrams)
        bigrams = []
        for tweet in tweets:
            words_in_tweet = tweet.lower().split()
            for i in range(len(words_in_tweet) - 1):
                bigrams.append(f"{words_in_tweet[i]} {words_in_tweet[i + 1]}")

        common_phrases = [phrase for phrase, _ in Counter(bigrams).most_common(10)]

        vocabulary = {
            "unique_words": len(set(words)),
            "total_words": len(words),
            "common_words": common_words,
            "common_phrases": common_phrases,
            "avg_word_length": round(np.mean([len(w) for w in words]), 2),
        }

        logger.info(f"Vocabulary learned: {vocabulary['unique_words']} unique words")
        return vocabulary

    def identify_interests(
        self, tweets: List[str], interactions: List[Dict[str, Any]]
    ) -> List[Tuple[str, float]]:
        """
        Identify user interests based on content and interactions.

        Args:
            tweets: List of tweet texts
            interactions: List of interaction records

        Returns:
            List of (interest, score) tuples
        """
        interests = defaultdict(float)

        # Analyze tweet content
        if tweets:
            try:
                tfidf_matrix = self.tfidf.fit_transform(tweets)
                feature_names = self.tfidf.get_feature_names_out()

                # Calculate average TF-IDF scores
                avg_scores = np.mean(tfidf_matrix.toarray(), axis=0)

                # Get top scoring terms
                for idx, score in enumerate(avg_scores):
                    if score > 0.1:  # Threshold
                        interests[feature_names[idx]] += score

            except Exception as e:
                logger.error(f"Failed to extract interests from tweets: {e}")

        # Weight by engagement
        if interactions:
            for interaction in interactions:
                metadata = interaction.get("metadata", {})
                text = metadata.get("text", "")
                if text:
                    # Simple keyword extraction
                    for word in text.lower().split():
                        if len(word) > 3:
                            interests[word] += 0.1

        # Sort and return top interests
        sorted_interests = sorted(interests.items(), key=lambda x: x[1], reverse=True)[
            :15
        ]

        logger.info(f"Identified {len(sorted_interests)} interests")
        return sorted_interests

    def _calculate_date_range(self, tweets: List[Dict[str, Any]]) -> int:
        """Calculate the date range spanned by tweets in days."""
        dates = []

        for tweet in tweets:
            created_at = tweet.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if created_at:
                dates.append(created_at)

        if len(dates) < 2:
            return 1

        date_range = (max(dates) - min(dates)).days
        return max(date_range, 1)
