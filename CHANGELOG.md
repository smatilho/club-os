# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source foundation for Club OS.
- Architecture blueprint and ADR set for:
  - multi-tenant model
  - modular monolith first
  - unified web app route areas (`/public`, `/member`, `/admin`)
  - RBAC and capability-based authorization
  - deployment portability (managed + self-host/cloud profiles)
- Module manifest and contract docs for feature inventory and extension boundaries.
- Security and operations baselines:
  - policy engine contract
  - RBAC matrix
  - reliability baseline (SLO/RTO/RPO targets)
- Contribution and project policies:
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `SUPPORT.md`
  - `LICENSE`
- CI and architecture guardrails:
  - required baseline file checks
  - placeholder script checks
  - provider-SDK boundary checks (allowed only in `infrastructure`)
  - schema and documentation consistency tests
