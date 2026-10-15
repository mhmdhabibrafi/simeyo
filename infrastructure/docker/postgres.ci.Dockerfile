# Disposable CI only; never substitute this image underneath an existing data volume.
FROM postgres:17-alpine
# The entrypoint only needs gosu when started as root; this fixture starts as postgres.
RUN rm /usr/local/bin/gosu
USER postgres
