# Infrastructure evidence, 2026-10-15

Installed a portable official Docker Compose **v5.6.0** client under ignored `.local/tools/docker-compose.exe`; no system installation, existing database replacement or public deployment.

Actual checks:

```powershell
.local/tools/docker-compose.exe version
.local/tools/docker-compose.exe --profile '*' config --quiet
.local/tools/docker-compose.exe ps --all
```

Version and all-profile Compose configuration validation **passed**. `ps --all` **failed**: Docker Engine pipe `//./pipe/docker_engine` does not exist. No Docker Desktop/Engine service was detected and WSL has no registered Linux distribution. Windows virtualization service alone does not provide a Docker Engine.

Therefore image pulls/builds, Compose startup, Redis, MinIO, Meilisearch and container workers are **BELUM DIUJI**. A Docker-capable local or remote engine is an external prerequisite. No running-container or deployment claim is made. PostgreSQL and Laravel/Next.js run natively in the project-local test/dev setup, independently of Docker.
