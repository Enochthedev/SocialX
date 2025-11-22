"""
Embeddings Service

Generates and manages text embeddings for semantic search.
"""

from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from loguru import logger
from src.config import settings


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self, model_name: Optional[str] = None):
        """
        Initialize embedding service.

        Args:
            model_name: Name of the sentence transformer model to use
        """
        self.model_name = model_name or settings.embedding_model
        logger.info(f"Loading embedding model: {self.model_name}")

        try:
            self.model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise

    def encode(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text.

        Args:
            text: Text to encode

        Returns:
            Embedding vector as numpy array
        """
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding
        except Exception as e:
            logger.error(f"Failed to encode text: {e}")
            raise

    def encode_batch(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Generate embeddings for multiple texts.

        Args:
            texts: List of texts to encode
            batch_size: Batch size for encoding

        Returns:
            Matrix of embedding vectors
        """
        if not texts:
            return np.array([])

        try:
            logger.debug(f"Encoding {len(texts)} texts in batches of {batch_size}")
            embeddings = self.model.encode(
                texts, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False
            )
            return embeddings
        except Exception as e:
            logger.error(f"Failed to encode texts: {e}")
            raise

    def similarity(self, text1: str, text2: str) -> float:
        """
        Calculate cosine similarity between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Similarity score between -1 and 1
        """
        try:
            emb1 = self.encode(text1)
            emb2 = self.encode(text2)

            # Cosine similarity
            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

            return float(similarity)
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0

    def find_similar(
        self, query: str, candidates: List[str], top_k: int = 5
    ) -> List[tuple[int, float]]:
        """
        Find most similar texts to a query.

        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of top results to return

        Returns:
            List of (index, similarity_score) tuples
        """
        if not candidates:
            return []

        try:
            # Encode query and candidates
            query_emb = self.encode(query)
            candidate_embs = self.encode_batch(candidates)

            # Calculate similarities
            similarities = []
            for idx, cand_emb in enumerate(candidate_embs):
                sim = np.dot(query_emb, cand_emb) / (
                    np.linalg.norm(query_emb) * np.linalg.norm(cand_emb)
                )
                similarities.append((idx, float(sim)))

            # Sort by similarity and return top k
            similarities.sort(key=lambda x: x[1], reverse=True)
            return similarities[:top_k]

        except Exception as e:
            logger.error(f"Failed to find similar texts: {e}")
            return []

    def cluster_texts(
        self, texts: List[str], n_clusters: int = 5
    ) -> List[List[int]]:
        """
        Cluster texts based on semantic similarity.

        Args:
            texts: List of texts to cluster
            n_clusters: Number of clusters

        Returns:
            List of clusters, each containing indices of texts
        """
        if len(texts) < n_clusters:
            logger.warning(f"Not enough texts ({len(texts)}) for {n_clusters} clusters")
            return [[i] for i in range(len(texts))]

        try:
            from sklearn.cluster import KMeans

            # Generate embeddings
            embeddings = self.encode_batch(texts)

            # Cluster
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(embeddings)

            # Group by cluster
            clusters = [[] for _ in range(n_clusters)]
            for idx, label in enumerate(labels):
                clusters[label].append(idx)

            logger.info(f"Clustered {len(texts)} texts into {n_clusters} groups")
            return clusters

        except Exception as e:
            logger.error(f"Failed to cluster texts: {e}")
            return [[i] for i in range(len(texts))]


# Global instance
embedding_service = EmbeddingService()
