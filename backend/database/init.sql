-- SocialX Database Schema

-- Users table (tracks the agent's identity)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    twitter_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    bio TEXT,
    profile_image_url TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    tweet_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tweets table (stores all tweets - user's and others')
CREATE TABLE IF NOT EXISTS tweets (
    id SERIAL PRIMARY KEY,
    tweet_id VARCHAR(255) UNIQUE NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    conversation_id VARCHAR(255),
    in_reply_to_user_id VARCHAR(255),
    is_own_tweet BOOLEAN DEFAULT FALSE,
    metrics JSONB DEFAULT '{}',
    entities JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tweets_tweet_id ON tweets (tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweets_author_id ON tweets (author_id);
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets (created_at);
CREATE INDEX IF NOT EXISTS idx_tweets_is_own_tweet ON tweets (is_own_tweet);

-- Interactions table (likes, retweets, replies, quotes)
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    interaction_type VARCHAR(50) NOT NULL, -- 'like', 'retweet', 'reply', 'quote', 'mention'
    tweet_id VARCHAR(255),
    target_user_id VARCHAR(255),
    performed_by_agent BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions (interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_tweet_id ON interactions (tweet_id);
CREATE INDEX IF NOT EXISTS idx_interactions_performed_by_agent ON interactions (performed_by_agent);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    display_name VARCHAR(255),
    bio TEXT,
    followers_count INTEGER,
    following_count INTEGER,
    followed_by_agent BOOLEAN DEFAULT FALSE,
    follows_agent BOOLEAN DEFAULT FALSE,
    relationship_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_follows_user_id ON follows (user_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed_by_agent ON follows (followed_by_agent);
CREATE INDEX IF NOT EXISTS idx_follows_follows_agent ON follows (follows_agent);

-- Scheduled actions (for autonomous behavior)
CREATE TABLE IF NOT EXISTS scheduled_actions (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- 'tweet', 'reply', 'like', 'retweet', 'follow'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    payload JSONB NOT NULL,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_scheduled_actions_status ON scheduled_actions (status);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_scheduled_for ON scheduled_actions (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_action_type ON scheduled_actions (action_type);

-- Learning data (stores patterns and insights)
CREATE TABLE IF NOT EXISTS learning_data (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- 'writing_style', 'topics', 'sentiment', 'timing', 'engagement_patterns'
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    confidence_score FLOAT,
    source VARCHAR(100), -- 'tweet_analysis', 'interaction_analysis', 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_data_category ON learning_data (category);
CREATE INDEX IF NOT EXISTS idx_learning_data_key ON learning_data (key);

-- Personality traits (learned personality model)
CREATE TABLE IF NOT EXISTS personality_traits (
    id SERIAL PRIMARY KEY,
    trait_name VARCHAR(100) NOT NULL UNIQUE,
    trait_value JSONB NOT NULL,
    confidence FLOAT DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_personality_traits_trait_name ON personality_traits (trait_name);

-- Content topics (topics the user engages with)
CREATE TABLE IF NOT EXISTS content_topics (
    id SERIAL PRIMARY KEY,
    topic_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    engagement_score FLOAT DEFAULT 0,
    tweet_count INTEGER DEFAULT 0,
    last_mentioned TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_topics_topic_name ON content_topics (topic_name);
CREATE INDEX IF NOT EXISTS idx_content_topics_engagement_score ON content_topics (engagement_score);

-- Agent activity log (audit trail)
CREATE TABLE IF NOT EXISTS agent_activity_log (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_log_activity_type ON agent_activity_log (activity_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created_at ON agent_activity_log (created_at);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_success ON agent_activity_log (success);

-- Conversation contexts (for maintaining conversation history)
CREATE TABLE IF NOT EXISTS conversation_contexts (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) UNIQUE NOT NULL,
    participants JSONB NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    topic VARCHAR(255),
    sentiment VARCHAR(50),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_contexts_conversation_id ON conversation_contexts (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_last_message_at ON conversation_contexts (last_message_at);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    value FLOAT NOT NULL,
    period VARCHAR(50), -- 'hourly', 'daily', 'weekly', 'monthly'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}' 
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics (metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics (timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follows_updated_at BEFORE UPDATE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_data_updated_at BEFORE UPDATE ON learning_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tweets_created_at_desc ON tweets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at_desc ON interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created_at_desc ON agent_activity_log (created_at DESC);

-- Insert initial data
INSERT INTO users (twitter_id, username, display_name)
VALUES ('placeholder', 'placeholder', 'AI Agent')
ON CONFLICT (twitter_id) DO NOTHING;

COMMENT ON TABLE tweets IS 'Stores all tweets - both user tweets and tweets from others';
COMMENT ON TABLE interactions IS 'Tracks all interactions (likes, retweets, replies, etc.)';
COMMENT ON TABLE learning_data IS 'Stores learned patterns and insights about user behavior';
COMMENT ON TABLE personality_traits IS 'Stores the learned personality model of the user';
COMMENT ON TABLE scheduled_actions IS 'Queue for autonomous actions to be performed';
COMMENT ON TABLE agent_activity_log IS 'Audit trail of all agent activities';
