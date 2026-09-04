# Sovereign Agentic Architecture — root envelope, full-system orchestration.
#
# The full system spans two self-contained compose projects, each owning its
# Dockerfile + docker-compose.yml: Zone 2 (governed stack + Keycloak + mock-fhir)
# and Zone 1 (the edge). This root holds no compose of its own — it only
# orchestrates: `up` brings Zone 2 first (it creates the shared network), then the
# Zone 1 edge which joins it. Both invocations run from HERE, so the single root
# `.env` (see .env.example) configures the whole stack.
#
# Requires the two zone repos cloned side-by-side (./setup.sh). Container
# commands auto-detect docker/podman.
#
# Model runtime — TWO paths, different Ollama requirements:
#   Container path (`make up`, `make demo-up-*`): Zone 1 runs containerised.
#     ZONE1_MODEL_ENDPOINT points at http://host.containers.internal:11434 — a
#     host Ollama must be running manually (`ollama serve`).
#   Desktop path (`make desktop-up-*`): Zone 1 runs as the Tauri desktop app.
#     The Tauri host manages Ollama automatically (ADR-0032) — no manual
#     `ollama serve` needed. llama-server is a stub; use ZONE1_MODEL_PROVIDER=ollama.

SHELL := /bin/bash

CONTAINER_ENGINE := $(shell command -v docker >/dev/null 2>&1 && echo docker || echo podman)
COMPOSE := $(CONTAINER_ENGINE) compose

ZONE1_DIR := ../SovereignAgenticArchitectureZoneOne
ZONE2_DIR := ../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo
ZONE1 := $(COMPOSE) -f $(ZONE1_DIR)/docker-compose.yml
ZONE2 := $(COMPOSE) -f $(ZONE2_DIR)/docker-compose.yml

.PHONY: help up down ps logs edge-logs zone1-up zone1-down zone1-rebuild zone2-up zone2-down \
        demo-up-nhs demo-down-nhs demo-rebuild-nhs demo-logs-nhs demo-worker-logs-nhs demo-reset-nhs \
        demo-up-infrastructure demo-down-infrastructure demo-rebuild-infrastructure demo-logs-infrastructure demo-worker-logs-infrastructure demo-reset-infrastructure \
        desktop-up-nhs desktop-down-nhs desktop-up-infrastructure desktop-down-infrastructure \
        test-demo-orchestration

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Bring up the full system (Zone 2 stack, then the Zone 1 edge on its network)
	$(ZONE2) up -d
	$(ZONE1) up -d
	@echo "→ edge on http://localhost:8090 ; drive it with:"
	@echo "  (cd $(ZONE1_DIR) && uv run zone1 chat --login --secret dev-secret)"

demo-up-nhs: ## Bring up the NHS demo profile and attach the generic Zone 1 edge
	$(MAKE) -C $(ZONE2_DIR) demo-up-nhs
	ZONE2_NETWORK=sovereign-zone2-nhs $(ZONE1) up -d

demo-down-nhs: ## Stop the NHS demo profile and its Zone 1 edge
	-ZONE2_NETWORK=sovereign-zone2-nhs $(ZONE1) down
	$(MAKE) -C $(ZONE2_DIR) demo-down-nhs

demo-rebuild-nhs: ## Rebuild the Zone 2 image used by the NHS demo
	$(MAKE) -C $(ZONE2_DIR) demo-rebuild-nhs

demo-logs-nhs: ## Tail NHS governed API logs
	$(MAKE) -C $(ZONE2_DIR) demo-logs-nhs

demo-worker-logs-nhs: ## Tail NHS governed worker logs
	$(MAKE) -C $(ZONE2_DIR) demo-worker-logs-nhs

demo-reset-nhs: ## Remove NHS demo containers and volumes (destructive)
	-ZONE2_NETWORK=sovereign-zone2-nhs $(ZONE1) down
	$(MAKE) -C $(ZONE2_DIR) demo-reset-nhs

demo-up-infrastructure: ## Bring up the Northstar infrastructure demo and edge
	$(MAKE) -C $(ZONE2_DIR) demo-up-infrastructure
	ZONE2_NETWORK=sovereign-zone2-infrastructure $(ZONE1) up -d

demo-down-infrastructure: ## Stop the Northstar infrastructure demo and edge
	-ZONE2_NETWORK=sovereign-zone2-infrastructure $(ZONE1) down
	$(MAKE) -C $(ZONE2_DIR) demo-down-infrastructure

demo-rebuild-infrastructure: ## Rebuild the Zone 2 image used by the Northstar demo
	$(MAKE) -C $(ZONE2_DIR) demo-rebuild-infrastructure

demo-logs-infrastructure: ## Tail Northstar governed API logs
	$(MAKE) -C $(ZONE2_DIR) demo-logs-infrastructure

demo-worker-logs-infrastructure: ## Tail Northstar governed worker logs
	$(MAKE) -C $(ZONE2_DIR) demo-worker-logs-infrastructure

demo-reset-infrastructure: ## Remove Northstar demo containers and volumes (destructive)
	-ZONE2_NETWORK=sovereign-zone2-infrastructure $(ZONE1) down
	$(MAKE) -C $(ZONE2_DIR) demo-reset-infrastructure

# Desktop profile targets deliberately start no `zone1-edge` container. The
# desktop owns a local sidecar, so starting both would make the selected
# profile ambiguous and leave an unused edge process running.
desktop-up-nhs: assert-no-container-edge ## Start NHS Zone 2 services and launch the NHS desktop
	$(MAKE) -C $(ZONE2_DIR) demo-up-nhs
	$(MAKE) -C $(ZONE1_DIR) desktop-dev-governed DEPLOYMENT_POLICY=nhs ZONE1_CAPABILITY_SERVER_URL=http://127.0.0.1:8000/mcp

desktop-down-nhs: ## Stop NHS services started for the desktop path
	$(MAKE) -C $(ZONE2_DIR) demo-down-nhs

desktop-up-infrastructure: assert-no-container-edge ## Start Northstar services and launch its desktop
	$(MAKE) -C $(ZONE2_DIR) demo-up-infrastructure
	$(MAKE) -C $(ZONE1_DIR) desktop-dev-governed DEPLOYMENT_POLICY=northstar-infrastructure ZONE1_CAPABILITY_SERVER_URL=http://127.0.0.1:8000/mcp

desktop-down-infrastructure: ## Stop Northstar services started for the desktop path
	$(MAKE) -C $(ZONE2_DIR) demo-down-infrastructure

assert-no-container-edge:
	@if $(CONTAINER_ENGINE) ps --format '{{.Names}}' 2>/dev/null | grep -Eq '(^|[_-])zone1-edge([_-]|$$)'; then \
		echo "A containerised Zone 1 edge is already running. Run the matching demo-down-* first."; \
		exit 2; \
	fi

test-demo-orchestration: ## Verify demo Make targets without starting services
	bash scripts/check-demo-orchestration.sh

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
