# Contributing to SocialX

Thank you for your interest in contributing to SocialX! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- Clear, descriptive title
- Detailed steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, Python version)
- Relevant logs (redact sensitive information!)
- Screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear, descriptive title
- Provide detailed description of the proposed functionality
- Explain why this enhancement would be useful
- List any alternative solutions you've considered

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write or update tests as needed
5. Update documentation
6. Commit with clear messages
7. Push to your fork
8. Create a Pull Request

#### Pull Request Guidelines

- Follow the existing code style
- Write clear commit messages
- Update documentation for any changed functionality
- Add tests for new features
- Ensure all tests pass
- Keep PRs focused - one feature/fix per PR

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 16+
- Docker & Docker Compose

### Local Development

1. Clone your fork:
```bash
git clone https://github.com/yourusername/SocialX.git
cd SocialX
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Install dependencies:
```bash
# Backend
cd backend
npm install

# AI Engine
cd ../ai-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Start services:
```bash
# Start databases with Docker
docker-compose up -d postgres chromadb redis

# Start backend
cd backend
npm run dev

# Start AI engine (in another terminal)
cd ai-engine
source venv/bin/activate
uvicorn src.main:app --reload --port 5000
```

## Code Style

### TypeScript/JavaScript

- Use ESLint and Prettier
- Follow existing patterns
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Prefer `const` over `let`
- Use async/await over promises

Run linting:
```bash
cd backend
npm run lint
npm run format
```

### Python

- Follow PEP 8
- Use Black for formatting
- Use type hints
- Add docstrings to functions and classes
- Use meaningful variable names

Run formatting:
```bash
cd ai-engine
black src/
ruff check src/
mypy src/
```

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### AI Engine Tests

```bash
cd ai-engine
pytest
```

### Writing Tests

- Test new features
- Test edge cases
- Test error handling
- Use descriptive test names
- Keep tests focused and simple

## Documentation

- Update README.md for user-facing changes
- Update SETUP.md for setup-related changes
- Add inline comments for complex logic
- Update API documentation
- Include examples where helpful

## Architecture Guidelines

### Backend (Node.js/TypeScript)

- Use services for business logic
- Keep controllers thin
- Use dependency injection where appropriate
- Handle errors gracefully
- Log important events
- Use TypeScript types effectively

### AI Engine (Python)

- Keep modules focused and single-purpose
- Use type hints
- Handle exceptions properly
- Log ML/AI operations
- Document complex algorithms
- Use async where beneficial

### Database

- Use migrations for schema changes
- Index frequently queried columns
- Document complex queries
- Avoid N+1 queries
- Use transactions for multi-step operations

## Commit Message Guidelines

Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(agent): add sentiment analysis for replies

Implement sentiment analysis to better match reply tone with
the original tweet's sentiment.

Closes #123
```

```
fix(twitter): handle rate limit errors gracefully

Add exponential backoff when Twitter API rate limits are hit.
Log rate limit events for monitoring.
```

## Review Process

1. Maintainers review PRs for:
   - Code quality
   - Test coverage
   - Documentation
   - Functionality
   - Breaking changes

2. Address review feedback
3. Once approved, maintainers will merge

## Areas for Contribution

### High Priority

- [ ] Improved safety filters
- [ ] Better personality modeling
- [ ] Enhanced engagement algorithms
- [ ] Performance optimizations
- [ ] Test coverage improvements

### Features

- [ ] Instagram integration
- [ ] LinkedIn integration
- [ ] Multi-account support
- [ ] Advanced analytics dashboard
- [ ] Conversation threading improvements
- [ ] Image generation and posting
- [ ] Hashtag optimization
- [ ] A/B testing for content

### Documentation

- [ ] Video tutorials
- [ ] More examples
- [ ] API documentation
- [ ] Architecture diagrams
- [ ] Best practices guide

### Infrastructure

- [ ] Kubernetes deployment
- [ ] Monitoring dashboards
- [ ] Automated testing pipeline
- [ ] Performance benchmarks
- [ ] Security audits

## Questions?

- Open an issue for questions
- Check existing documentation
- Review closed issues for similar questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to SocialX! 🎉
