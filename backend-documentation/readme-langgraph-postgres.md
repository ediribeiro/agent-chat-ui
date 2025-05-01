# LangGraph PostgreSQL Database Schema Documentation

This document provides a comprehensive overview of the database schema used in the LangGraph risk analyst agent project. It details all tables, their columns, data types, and inferred relationships, serving as a reference for developers, analysts, and maintainers.

---

## Table of Contents

- [General Notes](#general-notes)
- [Entity-Relationship Overview](#entity-relationship-overview)
- [Table Descriptions](#table-descriptions)
  - [assistant](#assistant)
  - [assistant_versions](#assistant_versions)
  - [checkpoint_blobs](#checkpoint_blobs)
  - [checkpoint_writes](#checkpoint_writes)
  - [checkpoints](#checkpoints)
  - [cron](#cron)
  - [run](#run)
  - [schema_migrations](#schema_migrations)
  - [store](#store)
  - [thread](#thread)
  - [thread_ttl](#thread_ttl)
- [Inferred Relationships](#inferred-relationships)
- [Best Practices](#best-practices)
- [Fetching Risk Data for Document Generation](#fetching-risk-data-for-document-generation)
- [Example Query Patterns](#example-query-patterns)
- [Conclusion](#conclusion)

---

## General Notes

- All tables reside in the `public` schema.
- UUIDs are used extensively for primary and foreign keys, supporting distributed and concurrent workflows.
- Timestamps are stored with time zone information unless otherwise noted.
- JSONB columns are used for flexible, semi-structured data storage.
- The schema supports versioning, checkpointing, and workflow orchestration for risk analysis and document processing.

---

## Entity-Relationship Overview

Below is a high-level view of the main entities and their likely relationships:

- **assistant** and **assistant_versions**: Store assistant configurations and their historical versions.
- **thread**: Represents a workflow or session, linked to runs, checkpoints, and possibly assistants.
- **run**: Represents a specific execution instance of an assistant/thread.
- **checkpoints, checkpoint_blobs, checkpoint_writes**: Support workflow state persistence and recovery.
- **cron**: Schedules and tracks recurring tasks.
- **store**: General-purpose key-value store, likely for caching or session data.
- **thread_ttl**: Manages thread expiration and retention policies.
- **schema_migrations**: Tracks database schema changes.

---

## Table Descriptions

### assistant

| Column         | Type                     | Description                                    |
|----------------|--------------------------|------------------------------------------------|
| assistant_id   | uuid                     | Unique identifier for the assistant            |
| graph_id       | text                     | Associated workflow/graph identifier           |
| created_at     | timestamp with time zone | Creation timestamp                             |
| updated_at     | timestamp with time zone | Last update timestamp                          |
| config         | jsonb                    | Assistant configuration (flexible schema)      |
| metadata       | jsonb                    | Additional metadata                            |
| version        | integer                  | Current version                                |
| name           | text                     | Assistant name                                 |
| description    | text                     | Assistant description                          |

---

### assistant_versions

| Column         | Type                     | Description                                    |
|----------------|--------------------------|------------------------------------------------|
| assistant_id   | uuid                     | References assistant.assistant_id              |
| version        | integer                  | Version number                                 |
| graph_id       | text                     | Associated workflow/graph identifier           |
| config         | jsonb                    | Configuration snapshot for this version        |
| metadata       | jsonb                    | Additional metadata                            |
| created_at     | timestamp with time zone | Version creation timestamp                     |
| name           | text                     | Name at this version                           |

---

### checkpoint_blobs

| Column         | Type   | Description                                         |
|----------------|--------|-----------------------------------------------------|
| thread_id      | uuid   | References thread.thread_id                         |
| channel        | text   | Channel identifier                                  |
| version        | text   | Checkpoint version                                  |
| type           | text   | Type of blob                                        |
| blob           | bytea  | Binary data (serialized checkpoint state, etc.)     |
| checkpoint_ns  | text   | Namespace for checkpointing                         |

---

### checkpoint_writes

| Column         | Type   | Description                                         |
|----------------|--------|-----------------------------------------------------|
| thread_id      | uuid   | References thread.thread_id                         |
| checkpoint_id  | uuid   | References checkpoints.checkpoint_id                |
| task_id        | uuid   | Task identifier                                     |
| idx            | integer| Index or sequence number                            |
| channel        | text   | Channel identifier                                  |
| type           | text   | Type of write                                       |
| blob           | bytea  | Binary data                                         |
| checkpoint_ns  | text   | Namespace for checkpointing                         |

---

### checkpoints

| Column               | Type                     | Description                                 |
|----------------------|--------------------------|---------------------------------------------|
| thread_id            | uuid                     | References thread.thread_id                 |
| checkpoint_id        | uuid                     | Primary key for checkpoint                  |
| run_id               | uuid                     | References run.run_id                       |
| parent_checkpoint_id | uuid                     | Parent checkpoint (for hierarchy)           |
| checkpoint           | jsonb                    | Checkpoint data                             |
| metadata             | jsonb                    | Additional metadata                         |
| checkpoint_ns        | text                     | Namespace                                   |

---

### cron

| Column         | Type                     | Description                                 |
|----------------|--------------------------|---------------------------------------------|
| cron_id        | uuid                     | Unique identifier for the cron job          |
| assistant_id   | uuid                     | References assistant.assistant_id           |
| thread_id      | uuid                     | References thread.thread_id                 |
| user_id        | text                     | User identifier                             |
| payload        | jsonb                    | Job payload/configuration                   |
| schedule       | text                     | Cron schedule (e.g., "0 0 * * *")         |
| next_run_date  | timestamp with time zone | Next scheduled run                          |
| end_time       | timestamp with time zone | When the cron job ends                      |
| created_at     | timestamp with time zone | Creation timestamp                          |
| updated_at     | timestamp with time zone | Last update timestamp                       |
| metadata       | jsonb                    | Additional metadata                         |

---

### run

| Column            | Type                     | Description                                 |
|-------------------|--------------------------|---------------------------------------------|
| run_id            | uuid                     | Unique identifier for the run               |
| thread_id         | uuid                     | References thread.thread_id                 |
| assistant_id      | uuid                     | References assistant.assistant_id           |
| created_at        | timestamp with time zone | Creation timestamp                          |
| updated_at        | timestamp with time zone | Last update timestamp                       |
| metadata          | jsonb                    | Additional metadata                         |
| status            | text                     | Run status (e.g., running, completed)       |
| kwargs            | jsonb                    | Additional parameters                       |
| multitask_strategy| text                     | Strategy for multitasking                   |

---

### schema_migrations

| Column | Type    | Description                       |
|--------|---------|-----------------------------------|
| version| bigint  | Migration version number          |
| dirty  | boolean | Migration state                   |

---

### store

| Column       | Type                     | Description                                 |
|--------------|--------------------------|---------------------------------------------|
| prefix       | text                     | Key prefix/category                         |
| key          | text                     | Key                                         |
| value        | jsonb                    | Value (arbitrary data)                      |
| created_at   | timestamp with time zone | Creation timestamp                          |
| updated_at   | timestamp with time zone | Last update timestamp                       |
| expires_at   | timestamp with time zone | Expiry timestamp                            |
| ttl_minutes  | integer                  | Time to live in minutes                     |

---

### thread

| Column      | Type                     | Description                                 |
|-------------|--------------------------|---------------------------------------------|
| thread_id   | uuid                     | Unique identifier for the thread            |
| created_at  | timestamp with time zone | Creation timestamp                          |
| updated_at  | timestamp with time zone | Last update timestamp                       |
| metadata    | jsonb                    | Additional metadata                         |
| status      | text                     | Thread status                               |
| config      | jsonb                    | Thread configuration                        |
| values      | jsonb                    | Associated values                           |
| interrupts  | jsonb                    | Interrupt events                            |

---

### thread_ttl

| Column      | Type                          | Description                                 |
|-------------|-------------------------------|---------------------------------------------|
| id          | uuid                          | Unique identifier                           |
| thread_id   | uuid                          | References thread.thread_id                 |
| strategy    | text                          | Expiry strategy                             |
| ttl_minutes | numeric                       | Time to live in minutes                     |
| created_at  | timestamp without time zone   | Creation timestamp                          |
| expires_at  | timestamp without time zone   | Expiry timestamp                            |

---

## Inferred Relationships

- **assistant.assistant_id** → **assistant_versions.assistant_id**, **cron.assistant_id**, **run.assistant_id**
- **thread.thread_id** → **run.thread_id**, **checkpoints.thread_id**, **checkpoint_blobs.thread_id**, **checkpoint_writes.thread_id**, **cron.thread_id**, **thread_ttl.thread_id**
- **run.run_id** → **checkpoints.run_id**
- **checkpoints.checkpoint_id** → **checkpoint_writes.checkpoint_id**
- **thread_ttl.thread_id** → **thread.thread_id**

> **Note:** Foreign key constraints may not be explicitly defined, but these relationships are strongly implied by naming and usage patterns.

---

## Best Practices

- **Versioning:** Use the `assistant_versions` table to track changes to assistant configurations.
- **Checkpoints:** Use the `checkpoints`, `checkpoint_blobs`, and `checkpoint_writes` tables for robust workflow state management and recovery.
- **Metadata:** Leverage `metadata` and `config` JSONB columns for flexible, schema-less storage of evolving data.
- **Expiration:** Manage data retention and cleanup via the `thread_ttl` and `store` tables.
- **Auditing:** Use timestamps and versioning for auditability and reproducibility.

---

## Fetching Risk Data for Document Generation

Below are practical query examples to help you retrieve the content needed to execute the `generate_risk_doc_stream` function, based on a `thread_id` from a run:

- **Find all runs for a thread:**
  ```sql
  SELECT * FROM run WHERE thread_id = '<thread-uuid>';
  ```

- **Fetch latest checkpoint for a thread:**
  ```sql
  SELECT * FROM checkpoints WHERE thread_id = '<thread-uuid>' ORDER BY checkpoint_id DESC LIMIT 1;
  ```

- **Extract risk data from checkpoint (JSON):**
  ```sql
  SELECT checkpoint->'risk_data' AS risk_data FROM checkpoints WHERE thread_id = '<thread-uuid>' ORDER BY checkpoint_id DESC LIMIT 1;
  ```

- **Extract risk data from thread (if stored there):**
  ```sql
  SELECT values->'risk_data' AS risk_data FROM thread WHERE thread_id = '<thread-uuid>';
  ```

- **Python Example:**
  ```python
  import psycopg2
  cur.execute("""
      SELECT checkpoint
      FROM checkpoints
      WHERE thread_id = %s
      ORDER BY checkpoint_id DESC
      LIMIT 1;
  """, (thread_id,))
  row = cur.fetchone()
  risk_data = row[0].get('risk_data') if row else None
  if risk_data:
      generate_risk_doc_stream(risk_data)
  ```

> Adjust the JSON key (`'risk_data'`) as needed to match your actual schema.

---

## Example Query Patterns

- **Get all active threads:**
  ```sql
  SELECT * FROM thread WHERE status = 'active';
  ```

- **Find all runs for a given assistant:**
  ```sql
  SELECT * FROM run WHERE assistant_id = '<assistant-uuid>';
  ```

- **Fetch checkpoints for a thread:**
  ```sql
  SELECT * FROM checkpoints WHERE thread_id = '<thread-uuid>';
  ```

- **View assistant configuration history:**
  ```sql
  SELECT * FROM assistant_versions WHERE assistant_id = '<assistant-uuid>' ORDER BY version DESC;
  ```