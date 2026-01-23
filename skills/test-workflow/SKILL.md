---
name: test-workflow
description: Test n8n workflow via webhook or sub-workflow pattern
version: 2.0.0
author: piternow
tags: [n8n, workflow, test, webhook, sub-workflow, automation]
---

# Test Workflow Skill

Автоматическое тестирование n8n workflows с поддержкой двух паттернов.

## Паттерны тестирования

### Pattern 1: Webhook Trigger (прямой вызов)

Для workflows с Webhook trigger - вызываем webhook напрямую.

```bash
# По ID workflow (автоматически находит webhook path)
./scripts/test-workflow.sh <workflow_id>

# С данными
./scripts/test-workflow.sh <workflow_id> '{"key": "value"}'

# По webhook path напрямую
./scripts/test-workflow.sh --path <webhook_path>
```

### Pattern 2: Sub-workflow (через Test Runner)

Для workflows с Execute Sub-workflow Trigger - вызываем через универсальный Test Runner.

```bash
# Тест через Test Runner
./scripts/test-workflow.sh --runner <workflow_id>

# С данными
./scripts/test-workflow.sh --runner <workflow_id> '{"input": "data"}'
```

## Архитектура

### Pattern 1: Direct Webhook

```
┌─────────────────┐
│  Workflow ID    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get webhook URL │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Active? │
    └────┬────┘
    NO   │   YES
    │    │    │
    ▼    │    ▼
┌──────┐ │ ┌──────────────┐
│Activ.│─┘ │ Call webhook │
└──────┘   └──────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Get execution  │
         └────────────────┘
```

### Pattern 2: Sub-workflow via Test Runner

```
┌─────────────────────────────────────────────────┐
│           Test Runner Workflow                  │
│  ┌──────────┐    ┌────────────────────┐         │
│  │ Webhook  │───▶│ Execute Sub-workflow│        │
│  │ /test-   │    │ (dynamic by ID)     │        │
│  │  runner  │    └─────────┬──────────┘         │
│  └──────────┘              │                    │
│                 ┌──────────▼──────────┐         │
│                 │ Respond to Webhook  │         │
│                 └─────────────────────┘         │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│           Target Workflow                       │
│  ┌──────────────────────┐    ┌─────────────┐    │
│  │ Execute Sub-workflow │───▶│ Your Logic  │    │
│  │ Trigger              │    │ ...         │    │
│  └──────────────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────┘
```

## Какой паттерн использовать?

| Trigger Type | Рекомендация |
|--------------|--------------|
| Webhook | Pattern 1 (прямой вызов) |
| Execute Sub-workflow Trigger | Pattern 2 (Test Runner) |
| Manual Trigger | Заменить на Execute Sub-workflow Trigger |
| Schedule Trigger | Добавить Execute Sub-workflow Trigger как альтернативу |

## Environment

Требуется в `.env`:
```
N8N_URL=https://n8n.hully.one
N8N_API_KEY=your-api-key
TEST_RUNNER_PATH=test-runner  # webhook path для Test Runner
```
