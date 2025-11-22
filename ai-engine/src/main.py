"""
SocialX AI Engine - Main Application

FastAPI service for AI/ML operations including personality modeling,
pattern learning, and semantic analysis.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from loguru import logger
import sys

from src.config import settings
from src.database import check_database_connection, get_db
from src.personality import PersonalityAnalyzer
from src.learning import PatternLearner
from src.embeddings import embedding_service

# Configure logger
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=settings.log_level,
)
logger.add(
    "logs/ai-engine.log",
    rotation="500 MB",
    retention="10 days",
    level=settings.log_level,
)

# Initialize FastAPI app
app = FastAPI(
    title="SocialX AI Engine",
    description="AI/ML service for personality modeling and pattern learning",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
personality_analyzer = PersonalityAnalyzer()
pattern_learner = PatternLearner()


# Request/Response Models
class AnalyzePersonalityRequest(BaseModel):
    texts: List[str]


class PersonalityResponse(BaseModel):
    personality_scores: Dict[str, float]
    description: str
    writing_style: Dict[str, Any]


class LearnPatternsRequest(BaseModel):
    tweets: List[Dict[str, Any]]
    interactions: Optional[List[Dict[str, Any]]] = None


class PatternsResponse(BaseModel):
    posting_patterns: Dict[str, Any]
    content_topics: List[Dict[str, Any]]
    engagement_patterns: Optional[Dict[str, Any]] = None
    vocabulary: Dict[str, Any]
    interests: List[tuple[str, float]]


class GenerateEmbeddingRequest(BaseModel):
    text: str


class EmbeddingResponse(BaseModel):
    embedding: List[float]


class FindSimilarRequest(BaseModel):
    query: str
    candidates: List[str]
    top_k: int = 5


class SimilarityResponse(BaseModel):
    results: List[Dict[str, Any]]


# Health Check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db_healthy = check_database_connection()

    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "up" if db_healthy else "down",
        "embedding_model": settings.embedding_model,
        "version": "1.0.0",
    }


# Personality Analysis
@app.post("/analyze-personality", response_model=PersonalityResponse)
async def analyze_personality(request: AnalyzePersonalityRequest):
    """
    Analyze personality from text samples.

    Args:
        request: Contains list of text samples

    Returns:
        Personality scores and description
    """
    try:
        logger.info(f"Analyzing personality from {len(request.texts)} texts")

        # Analyze personality
        scores = personality_analyzer.analyze_texts(request.texts)

        # Get description
        description = personality_analyzer.get_personality_description(scores)

        # Analyze writing style
        writing_style = personality_analyzer.extract_writing_style(request.texts)

        logger.info("Personality analysis complete")

        return PersonalityResponse(
            personality_scores=scores,
            description=description,
            writing_style=writing_style,
        )

    except Exception as e:
        logger.error(f"Personality analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Pattern Learning
@app.post("/learn-patterns", response_model=PatternsResponse)
async def learn_patterns(request: LearnPatternsRequest, background_tasks: BackgroundTasks):
    """
    Learn behavioral patterns from user data.

    Args:
        request: Contains tweets and interaction data

    Returns:
        Learned patterns and insights
    """
    try:
        logger.info(f"Learning patterns from {len(request.tweets)} tweets")

        # Learn posting patterns
        posting_patterns = pattern_learner.learn_posting_patterns(request.tweets)

        # Extract tweet texts
        tweet_texts = [tweet.get("text", "") for tweet in request.tweets]

        # Learn content topics
        content_topics = pattern_learner.learn_content_topics(tweet_texts)

        # Learn vocabulary
        vocabulary = pattern_learner.learn_vocabulary(tweet_texts)

        # Identify interests
        interests = pattern_learner.identify_interests(
            tweet_texts, request.interactions or []
        )

        # Learn engagement patterns if interactions provided
        engagement_patterns = None
        if request.interactions:
            engagement_patterns = pattern_learner.learn_engagement_patterns(
                request.interactions
            )

        logger.info("Pattern learning complete")

        return PatternsResponse(
            posting_patterns=posting_patterns,
            content_topics=content_topics,
            engagement_patterns=engagement_patterns,
            vocabulary=vocabulary,
            interests=interests,
        )

    except Exception as e:
        logger.error(f"Pattern learning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Embedding Generation
@app.post("/generate-embedding", response_model=EmbeddingResponse)
async def generate_embedding(request: GenerateEmbeddingRequest):
    """
    Generate semantic embedding for text.

    Args:
        request: Contains text to embed

    Returns:
        Embedding vector
    """
    try:
        embedding = embedding_service.encode(request.text)
        return EmbeddingResponse(embedding=embedding.tolist())

    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Similarity Search
@app.post("/find-similar", response_model=SimilarityResponse)
async def find_similar(request: FindSimilarRequest):
    """
    Find most similar texts to a query.

    Args:
        request: Contains query and candidate texts

    Returns:
        List of similar texts with scores
    """
    try:
        logger.info(f"Finding similar texts for query among {len(request.candidates)} candidates")

        results = embedding_service.find_similar(
            request.query, request.candidates, request.top_k
        )

        formatted_results = [
            {
                "index": idx,
                "text": request.candidates[idx],
                "similarity": score,
            }
            for idx, score in results
        ]

        return SimilarityResponse(results=formatted_results)

    except Exception as e:
        logger.error(f"Similarity search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Startup Event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting SocialX AI Engine...")
    logger.info(f"Environment: {settings.python_env}")
    logger.info(f"Embedding model: {settings.embedding_model}")

    # Check database connection
    if check_database_connection():
        logger.info("Database connection established")
    else:
        logger.warning("Database connection failed")

    logger.info("✨ AI Engine ready!")


# Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down AI Engine...")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.ai_engine_port,
        reload=settings.python_env == "development",
    )
