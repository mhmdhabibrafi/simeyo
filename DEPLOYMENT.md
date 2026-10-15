# Deployment status

No public deployment has been attempted. Dockerfiles and Compose currently target development. They have not run on this machine because Docker is unavailable. Validate image tags, `docker compose config`, builds, volume ownership, startup migrations, health checks and service credentials in a Docker-capable environment.

A production deployment must add/validate PHP-FPM + Nginx, an immutable Next.js production build, HTTPS, secure cookie/CORS/stateful-host configuration, trusted proxies, private object storage, supervised queues/Reverb, least-privilege database accounts, backup/restore, monitoring and rollback. These are outstanding release gates, not working deployment claims.

Do not seed demo accounts in production. Do not run destructive reset commands on existing data. The owner authorized Git source publication to mhmdhabibrafi/simeyo. Public application deployment, force-push and infrastructure deletion remain outside the authorized scope.
