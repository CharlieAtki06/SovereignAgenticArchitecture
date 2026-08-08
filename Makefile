# Sovereign Agentic Architecture — root envelope, full-system orchestration.
#
# The full system spans two self-contained compose projects, each owning its
# Dockerfile + docker-compose.yml: Zone 2 (governed stack + Keycloak + mock-fhir)
# and Zone 1 (the edge). This root holds no compose of its own — it only
# orchestrates: `up` brings Zone 2 first (it creates the shared network), then the
# Zone 1 edge which joins it. Both invocations run from HERE, so the single root
# `.env` (see .env.example) configures the whole stack.
#
# Requires the two zone repos cloned side-by-side (./setup.sh) and a host Ollama
# serving the edge model (the model runtime is not containerised). Container
# commands auto-detect docker/podman.

SHELL := /bin/bash

CONTAINER_ENGINE := $(shell command -v docker >/dev/null 2>&1 && echo docker || echo podman)
COMPOSE := $(CONTAINER_ENGINE) compose

ZONE1_DIR := ../SovereignAgenticArchitectureZoneOne
ZONE2_DIR := ../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo
ZONE1 := $(COMPOSE) -f $(ZONE1_DIR)/docker-compose.yml
ZONE2 := $(COMPOSE) -f $(ZONE2_DIR)/docker-compose.yml

.PHONY: help up down ps logs edge-logs zone1-up zone1-down zone1-rebuild zone2-up zone2-down

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Bring up the full system (Zone 2 stack, then the Zone 1 edge on its network)
	$(ZONE2) up -d
	$(ZONE1) up -d
	@echo "→ edge on http://localhost:8090 ; drive it with:"
	@echo "  (cd $(ZONE1_DIR) && uv run zone1 chat --login --secret dev-secret)"

down: ## Tear down the edge, then the Zone 2 stack
	-$(ZONE1) down
	-$(ZONE2) down --remove-orphans
	@$(CONTAINER_ENGINE) network rm -f sovereign-zone2 2>/dev/null; true

zone1-up: ## Bring up only the Zone 1 edge (needs Zone 2's network to exist)
	$(ZONE1) up -d

zone1-down: ## Tear down only the Zone 1 edge
	$(ZONE1) down

zone1-rebuild: ## Rebuild Zone 1 image and restart (Zone 2 must be running — run `make zone2-up` first if not)
	@ZONE2_NET=$${ZONE2_NETWORK:-sovereign-zone2}; \
	if ! $(CONTAINER_ENGINE) network exists $$ZONE2_NET 2>/dev/null; then \
		echo "Error: Zone 2 network '$$ZONE2_NET' not found."; \
		echo "       Run 'make zone2-up' first, then retry."; \
		exit 1; \
	fi
	$(ZONE1) down
	$(ZONE1) build zone1-edge
	$(ZONE1) up -d

zone2-up: ## Bring up only the Zone 2 stack
	$(ZONE2) up -d

zone2-down: ## Tear down only the Zone 2 stack
	$(ZONE2) down

ps: ## Show all containers across both projects
	$(CONTAINER_ENGINE) ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'

logs: ## Tail the Zone 2 api logs
	$(ZONE2) logs -f api

edge-logs: ## Tail the Zone 1 edge logs
	$(ZONE1) logs -f zone1-edge
