# Sovereign Agentic Architecture

Sovereign Agentic Architecture is a three-zone reference architecture for
enterprise AI: local agency at the Edge, deterministic governance at the
Gateway, and deliberately bounded access to enterprise reasoning and data.

The root repository is the public documentation and orchestration envelope. It
contains no Zone 1 or Zone 2 application source and never executes either zone
as a library.

## Explore the architecture

- [Architecture portal](https://charlieatki06.github.io/SovereignAgenticArchitecture/)
- [Interactive atlas](https://charlieatki06.github.io/SovereignAgenticArchitecture/atlas)
- [Demo talk-through](https://charlieatki06.github.io/SovereignAgenticArchitecture/demo)
- [Engineering reference](https://charlieatki06.github.io/SovereignAgenticArchitecture/docs/)

The portal is built from the LikeC4 model in [`architecture/`](architecture/).
Its status claims resolve to the immutable zone revisions recorded in
[`architecture/evidence.lock.json`](architecture/evidence.lock.json).

## Quick start

```bash
git clone https://github.com/CharlieAtki06/SovereignAgenticArchitecture.git
cd SovereignAgenticArchitecture
./setup.sh
make docs-install
make docs-dev
```

`setup.sh` clones the two private zone repositories as sibling checkouts. To
build the public portal without either private repository, run:

```bash
make docs-build
```

Evidence validation is deliberately separate because it needs read access to
the pinned private revisions:

```bash
make docs-evidence
```

The supported application demo commands remain `make desktop-up-nhs` and
`make desktop-up-infrastructure`; see the
[local demo runbook](docs/dev/local-demo-runbook.md) before using them.

## Repository ownership

| Repository | Owns |
|---|---|
| This root repository | Cross-zone language, context map, architecture model, boundary contracts, ADRs, portal, onboarding, and orchestration commands |
| [Zone 1](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne) | Edge Experiences and the Edge Runtime |
| [Zone 2](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo) | Governance Gateway implementation, Integration Definitions, connectors, policy, audit, and projections |
| Enterprise systems | Reasoning models and Systems of Record reached only through Gateway connectors |

Start with the [system map](docs/system-map.md), the
[glossary](docs/glossary.md), and the root [context map](CONTEXT-MAP.md). The
exact App-enabled wire contract is defined only in the
[data boundary and projection contract](docs/data-boundary-and-projection-contract.md).
