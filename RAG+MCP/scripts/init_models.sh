#!/usr/bin/env sh
# init_models.sh — Pull required Ollama models
# This script is called by the ollama-init Docker service.
set -e

OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"

wait_for_ollama() {
  echo "Waiting for Ollama at $OLLAMA_HOST..."
  until curl -sf "$OLLAMA_HOST/api/tags" > /dev/null 2>&1; do
    sleep 2
  done
  echo "Ollama is up."
}

pull_model() {
  MODEL="$1"
  echo "Pulling model: $MODEL"
  curl -sf -X POST "$OLLAMA_HOST/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" \
    --max-time 600 \
    -o /dev/null
  echo "Model ready: $MODEL"
}

wait_for_ollama
pull_model "llama3.2"
pull_model "nomic-embed-text"

echo "All models initialised successfully."
