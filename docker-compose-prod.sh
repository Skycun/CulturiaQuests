#!/bin/bash
# Wrapper script for production docker-compose commands
# Usage: ./docker-compose-prod.sh [docker-compose commands]
# Examples:
#   ./docker-compose-prod.sh up -d --build
#   ./docker-compose-prod.sh logs -f backend
#   ./docker-compose-prod.sh down

docker compose -f docker-compose.prod.yml --env-file .env.production "$@"
