# Развёртывание HolyPilot

HolyPilot v2 состоит из веб-интерфейса, API, фоновых задач, PostgreSQL и Redis. Production развёртывание выполняет оператор по отдельному утверждённому процессу с backup, миграционными проверками и контролем доступности. Команда локальной разработки не является инструкцией для production.

## Документы

- [Архитектура и история перехода на v2](docs/architecture/v2/CONSOLIDATED_V1_V2_AUDIT_RU.md).
- [Модель окружений](docs/architecture/v2/ENVIRONMENT_MODEL_RU.md).
- [Локальная разработка](docs/architecture/v2/LOCAL_DEVELOPMENT_RU.md).
- [Staging runbook](docs/deploy/STAGING_RU.md).
- [API-only Google Ads release](docs/google-ads-api-only-release.md).

Перед выпуском проверьте актуальные CI, backup и SHA-256, миграции, OAuth callback URLs, конфигурацию Host/Origin и разрешения на запись для конкретного окружения. Технические имена контейнеров, пакетов и доменов могут содержать прежнее название: их нельзя менять только ради ребрендинга без плана миграции.

Документы [docs/beta](docs/beta) относятся к историческому Python beta-runtime и не описывают текущий v2 deployment.
