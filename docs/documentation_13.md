# System Limitations and Design Decisions

## Purpose

This document explains:
- What the system deliberately does NOT do
- Why certain architectural decisions were made
- Known limitations

---

## Key Design Decisions

### 1. Runtime Generation vs Code Generation

> 📌 Decision: Runtime interpretation of config

**Why:**
- Faster iteration
- No rebuild required
- Dynamic updates

**Trade-off:**
- Slight performance overhead
- Harder debugging

---

### 2. JSONB Hybrid Schema

> 📌 Decision: Use JSONB for flexibility

**Why:**
- Avoid constant migrations
- Support dynamic fields

**Trade-off:**
- Complex queries
- Harder indexing

---

### 3. Single Backend Engine

> 📌 Decision: One generic API engine

**Why:**
- Reduces duplication
- Easier maintenance

**Trade-off:**
- Less control per endpoint
- Complex abstraction layer

---

## Known Limitations

### 1. Complex Business Logic

Not suitable for:
- Highly custom workflows
- Complex domain logic

---

### 2. Performance at Scale

- JSON parsing overhead
- Dynamic rendering cost

---

### 3. Debugging Difficulty

- Errors originate from config
- Harder to trace than static code

---

### 4. Limited UI Customization

- Bound by component registry
- Deep customization requires extension

---

## Future Improvements

- Caching layer for config
- Static optimization (hybrid generation)
- Plugin architecture

---