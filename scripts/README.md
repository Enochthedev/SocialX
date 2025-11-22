# SocialX Scripts

This directory contains utility scripts to help you set up and manage SocialX.

## Available Scripts

### `validate-setup.sh`
Validates that all prerequisites are installed and configured correctly.

**Usage:**
```bash
bash scripts/validate-setup.sh
```

**Checks:**
- ✓ Node.js (18+) and npm
- ✓ Python (3.11+) and pip
- ✓ Docker and Docker Compose (optional)
- ✓ PostgreSQL (if not using Docker)
- ✓ Git
- ✓ Required project files
- ✓ Environment variables in .env
- ✓ Port availability (3000, 5000, 5432, 8000, 6379)

### `quick-start.sh`
Automated setup and launch script.

**Usage:**
```bash
bash scripts/quick-start.sh
```

**Does:**
1. Creates .env from .env.example
2. Runs validation checks
3. Starts Docker containers
4. Waits for services
5. Checks health endpoints
6. Displays useful commands

### `test.sh`
Integration tests to verify everything is working.

**Usage:**
```bash
bash scripts/test.sh
```

**Tests:**
- Backend health check
- AI engine health check
- Database connections
- API endpoints
- Tweet generation

## Making Scripts Executable

```bash
chmod +x scripts/*.sh
```

## Examples

**First time setup:**
```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Validate prerequisites
./scripts/validate-setup.sh

# 3. Quick start
./scripts/quick-start.sh

# 4. Run tests
./scripts/test.sh
```

**Development workflow:**
```bash
# Start services
docker-compose up -d

# Run tests
./scripts/test.sh

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Troubleshooting

If scripts fail:

1. **Permission denied**: Run `chmod +x scripts/*.sh`
2. **Command not found**: Ensure you're in the SocialX root directory
3. **Docker errors**: Make sure Docker is running
4. **Port conflicts**: Check if ports are already in use with `lsof -i :3000`
