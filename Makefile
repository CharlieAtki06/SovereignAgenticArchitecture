# Sovereign Agentic Architecture — root envelope, full-system orchestration.
#
# The full system spans two compose projects: Zone 2 (its own repo, the governed
# stack + Keycloak + mock-fhir) and the Zone 1 edge (this repo's docker-compose.yml,
# an overlay that joins Zone 2's `sovereign-zone2` network). `up` sequences them:
# Zone 2 first (it creates the shared network), then the edge on top.
#
# Requires the two zone repos cloned side-by-side (./setup.sh) and a host Ollama
# serving the edge model (ZONE1_MODEL_ENDPOINT — the model runtime is not
# containerised). Container commands auto-detect docker/podman.

SHELL := /bin/bash

CONTAINER_ENGINE := $(shell command -v docker >/dev/null 2>&1 && echo docker || echo podman)
COMPOSE := $(CONTAINER_ENGINE) compose

ZONE2_DIR := ../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo

.PHONY: help up down ps logs edge-logs zone2-up zone2-down

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Bring up the full system (Zone 2 stack, then the Zone 1 edge on its network)
	$(COMPOSE) -f $(ZONE2_DIR)/docker-compose.yml up -d
	$(COMPOSE) up -d
	@echo "→ edge on http://localhost:8090 ; drive it with:"
	@echo "  (cd ../SovereignAgenticArchitectureZoneOne && uv run zone1 chat --as-user clinician-a --secret dev-secret)"

down: ## Tear down the edge, then the Zone 2 stack
	-$(COMPOSE) down
	$(COMPOSE) -f $(ZONE2_DIR)/docker-compose.yml down

zone2-up: ## Bring up only the Zone 2 stack
	$(COMPOSE) -f $(ZONE2_DIR)/docker-compose.yml up -d

zone2-down: ## Tear down only the Zone 2 stack
	$(COMPOSE) -f $(ZONE2_DIR)/docker-compose.yml down

ps: ## Show all containers across both projects
	$(CONTAINER_ENGINE) ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'

logs: ## Tail the Zone 2 api logs
	$(COMPOSE) -f $(ZONE2_DIR)/docker-compose.yml logs -f api

edge-logs: ## Tail the Zone 1 edge logs
	$(COMPOSE) logs -f zone1-edge
