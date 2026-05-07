# Changelog and Roadmap

## Current Version: 1.0

---

## Implemented Features

| Feature | Status | Priority | Document |
|---------|--------|----------|----------|
| Config validation (Zod + semantic) | Implemented | P0 | doc_03 |
| Dynamic API generation (CRUD) | Implemented | P0 | doc_05 |
| Dynamic UI rendering (component registry) | Implemented | P0 | doc_04 |
| JSONB hybrid database | Implemented | P0 | doc_06 |
| CSV Import (with field mapping) | Implemented | P0 | doc_08 |
| Event-based Notifications (email) | Implemented | P0 | doc_08 |
| Multiple Login Methods (email + Google OAuth) | Implemented | P0 | doc_08 |
| Config hot reload (POST /config + polling) | Implemented | P0 | doc_05 |
| Tenant isolation (app_id + user_id scoping) | Implemented | P0 | doc_06, doc_07 |
| LLM-based config generation (Anthropic Claude) | Implemented | Bonus | doc_08 |

---

## Planned Features

| Feature | Priority | Target Version | Notes |
|---------|----------|---------------|-------|
| Role-based access control (RBAC) | P1 | 1.1 | Roles defined in config, enforced at middleware |
| Config marketplace | P2 | 1.2 | Share and import configs between users |
| Plugin architecture | P2 | 1.2 | Custom field types, custom page types |
| Export to code | P2 | 1.2 | Generate standalone Next.js project from config |
| Complex workflows | P3 | 2.0 | Multi-step forms, approval chains |
| Visual config editor | P3 | 2.0 | GUI for editing config without writing JSON |

---

## Dropped Features

| Feature | Reason | Decision Date |
|---------|--------|--------------|
| Multi-language / i18n | Added complexity without strengthening core value proposition; Multiple Auth Methods chosen as Feature 3 instead | Permanent |

---

## Breaking Changes Log

| Version | Change | Migration Required |
|---------|--------|--------------------|
| 1.0 | Initial release | N/A |

---

CHANGES APPLIED:
- Guide section used: 11 (update roadmap)
- Contradictions resolved: Multi-language removed from planned features and moved to "Dropped Features" section; Multiple Auth Methods added as P0/Implemented; OAuth updated to Implemented; CSV and Notifications updated to Implemented; added clear status for all features
- Removed: Multi-language as P1/Planned; emoji from headers