---
name: n8n-deployment
description: Production deployment guide for n8n. Use when setting up n8n for production, scaling, configuring queue mode, or optimizing database.
---

# n8n Deployment Skill

This skill provides production deployment and scaling guidance for n8n.

## Deployment Modes

### Default Mode (Development Only)

- Single process
- SQLite database
- Not suitable for production
- Limited scalability

### Queue Mode (Production)

- Multiple workers via Redis
- PostgreSQL database
- Horizontal scaling
- High availability

## Queue Mode Setup

### Architecture

```
                    ┌─────────────┐
                    │   Redis     │
                    │   (Queue)   │
                    └──────┬──────┘
                           │
┌─────────────┐     ┌──────┴──────┐     ┌─────────────┐
│   Main      │────▶│   Queue     │────▶│  Worker 1   │
│  Instance   │     │             │     └─────────────┘
│ (Triggers)  │     │             │────▶│  Worker 2   │
└─────────────┘     │             │     └─────────────┘
                    │             │────▶│  Worker N   │
                    └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    │ (Database)  │
                    └─────────────┘
```

### How It Works

1. **Main instance** handles triggers (webhooks, schedules)
2. **Main instance** generates execution ID, pushes to Redis
3. **Worker** picks up job from Redis queue
4. **Worker** fetches workflow from PostgreSQL
5. **Worker** executes workflow
6. **Worker** writes results to PostgreSQL
7. **Worker** notifies Redis of completion

### Environment Configuration

**Main Instance:**
```bash
# Execution mode
EXECUTIONS_MODE=queue

# Database (PostgreSQL required)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD_FILE=/run/secrets/db_password

# Redis
QUEUE_BULL_REDIS_HOST=redis
QUEUE_BULL_REDIS_PORT=6379

# Main instance settings
N8N_RUNNERS_ENABLED=true
```

**Worker Instance:**
```bash
# Same database and Redis config as main
EXECUTIONS_MODE=queue
DB_TYPE=postgresdb
# ... same DB config ...

# Worker-specific
N8N_DISABLE_UI=true
N8N_LISTEN_ADDRESS=0.0.0.0
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    secrets:
      - db_password

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  n8n:
    image: n8nio/n8n
    environment:
      - EXECUTIONS_MODE=queue
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD_FILE=/run/secrets/db_password
      - QUEUE_BULL_REDIS_HOST=redis
    ports:
      - "5678:5678"
    depends_on:
      - postgres
      - redis
    secrets:
      - db_password

  n8n-worker:
    image: n8nio/n8n
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD_FILE=/run/secrets/db_password
      - QUEUE_BULL_REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
      - n8n
    secrets:
      - db_password
    deploy:
      replicas: 3

volumes:
  postgres_data:
  redis_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Start Workers

```bash
# CLI
npx n8n worker --concurrency=10

# Docker
docker run n8nio/n8n worker --concurrency=10
```

## Scaling Guidelines

### Worker Sizing

| Workload | Workers | Concurrency | Total Capacity |
|----------|---------|-------------|----------------|
| Light | 2 | 10 | 20 concurrent |
| Medium | 3-5 | 10 | 30-50 concurrent |
| Heavy | 5-10 | 5-10 | 25-100 concurrent |
| Enterprise | 10+ | 5 | 50+ concurrent |

### Best Practices

- **Fewer workers with more CPU** > many small workers
- **Start with 2-3 workers**, scale based on metrics
- **Monitor Redis queue depth** - avoid >2-3 minute backups
- **Avoid low concurrency + many workers** - overloads DB

### Scaling Triggers

Scale **up** when:
- Redis queue consistently >100 jobs
- Average wait time >30 seconds
- CPU >70% on workers

Scale **down** when:
- Queue consistently empty
- Workers idle >50% of time
- Cost optimization needed

## Database Optimization

### PostgreSQL Configuration

```sql
-- Recommended settings (postgresql.conf)
shared_buffers = 256MB          # 25% of RAM
work_mem = 4MB
effective_cache_size = 768MB    # 75% of RAM
maintenance_work_mem = 128MB
max_connections = 200
```

### Execution History Pruning

**Auto-Pruning:**
```bash
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=30        # days
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none  # for high volume
```

**Manual Pruning:**
```sql
-- Delete executions older than 30 days
DELETE FROM execution_entity
WHERE finished_at < NOW() - INTERVAL '30 days';

-- Clean orphaned data
DELETE FROM execution_data
WHERE execution_id NOT IN (SELECT id FROM execution_entity);

-- Reclaim space
VACUUM FULL execution_entity, execution_data;
```

### Performance Indexes

```sql
-- Improve execution queries
CREATE INDEX CONCURRENTLY idx_execution_finished
ON execution_entity(finished_at);

CREATE INDEX CONCURRENTLY idx_execution_workflow
ON execution_entity(workflow_id, finished_at);

CREATE INDEX CONCURRENTLY idx_execution_status
ON execution_entity(status, finished_at);
```

### Connection Pooling

Use PgBouncer for connection pooling:

```yaml
pgbouncer:
  image: edoburu/pgbouncer
  environment:
    - DATABASE_URL=postgres://n8n:password@postgres:5432/n8n
    - POOL_MODE=transaction
    - MAX_CLIENT_CONN=1000
    - DEFAULT_POOL_SIZE=50
```

## Monitoring Setup

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/healthz` | Basic health check |
| `/healthz/readiness` | Ready to accept traffic |
| `/metrics` | Prometheus metrics |

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'n8n'
    static_configs:
      - targets: ['n8n:5678']
    metrics_path: /metrics
```

### Key Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| Queue depth | >100 | >500 |
| Execution time (avg) | >30s | >120s |
| Error rate | >5% | >15% |
| Worker CPU | >70% | >90% |
| Database connections | >80% | >95% |

### Grafana Dashboard

Monitor these panels:
- Workflow executions per minute
- Execution duration histogram
- Error rate by workflow
- Queue depth over time
- Worker utilization

## High Availability

### Multi-Region Setup

```
Region A                    Region B
┌─────────┐                ┌─────────┐
│   LB    │                │   LB    │
└────┬────┘                └────┬────┘
     │                          │
┌────┴────┐                ┌────┴────┐
│  n8n    │                │  n8n    │
│ (Main)  │                │(Standby)│
└────┬────┘                └────┬────┘
     │                          │
     └──────────┬───────────────┘
                │
         ┌──────┴──────┐
         │  PostgreSQL │
         │  (Primary)  │
         └──────┬──────┘
                │
         ┌──────┴──────┐
         │  PostgreSQL │
         │  (Replica)  │
         └─────────────┘
```

### Webhook Load Balancing

For high webhook volume:

```yaml
nginx:
  upstream n8n_webhooks {
    least_conn;
    server n8n-webhook-1:5678;
    server n8n-webhook-2:5678;
    server n8n-webhook-3:5678;
  }

  server {
    location /webhook/ {
      proxy_pass http://n8n_webhooks;
    }
  }
```

## Resource Limits

### Memory Configuration

```bash
# Node.js heap size (match to container limit)
NODE_OPTIONS=--max-old-space-size=4096  # 4GB

# Container limits
docker run --memory=4g --memory-swap=4g n8nio/n8n
```

### Timeout Configuration

```bash
# Execution timeout (seconds)
EXECUTIONS_TIMEOUT=300
EXECUTIONS_TIMEOUT_MAX=7200

# Function node timeout (milliseconds)
N8N_NODE_FUNCTION_TIMEOUT=120000
```

## Production Checklist

### Infrastructure
- [ ] PostgreSQL 13+ configured
- [ ] Redis for queue mode
- [ ] HTTPS with valid SSL
- [ ] Load balancer for webhooks
- [ ] Health checks configured

### Performance
- [ ] Queue mode enabled
- [ ] Workers sized appropriately
- [ ] Database indexes created
- [ ] Connection pooling enabled
- [ ] Execution pruning configured

### Monitoring
- [ ] Prometheus metrics exposed
- [ ] Grafana dashboards set up
- [ ] Alerts configured
- [ ] Log aggregation enabled

### Security
- [ ] Secrets via `_FILE` suffix
- [ ] `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`
- [ ] HTTPS enforced
- [ ] Webhook authentication enabled

### Backup & Recovery
- [ ] Database backups scheduled
- [ ] Workflow exports automated
- [ ] Disaster recovery plan documented
- [ ] Restore procedure tested

## Troubleshooting

### Queue Not Processing

1. Check Redis connection
2. Verify workers are running
3. Check worker logs for errors
4. Verify database connectivity

### Slow Executions

1. Check database query performance
2. Review execution history size
3. Monitor worker CPU/memory
4. Check external API latency

### Memory Issues

1. Enable queue mode (isolates execution)
2. Process data in batches
3. Increase Node.js heap size
4. Prune execution history

---

**Remember**: Production n8n requires queue mode. Never run default mode with production workloads.
