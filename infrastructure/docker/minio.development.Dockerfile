# Optional development S3 fixture only; the community source is archived upstream.
FROM golang:1.27-alpine AS build
RUN CGO_ENABLED=0 GOBIN=/out go install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z

FROM alpine:3.24
RUN apk add --no-cache ca-certificates && mkdir /data
COPY --from=build /out/minio /usr/local/bin/minio
EXPOSE 9000 9001
VOLUME ["/data"]
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
