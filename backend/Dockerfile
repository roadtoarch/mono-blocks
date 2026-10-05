# syntax=docker/dockerfile:1.7

# ==============================================================================
# Build stage — native compile
#
# Layer order matters for caching. Each layer is rebuilt only when its inputs
# change, and everything after a changed layer is rebuilt too:
#   1. .mvn + mvnw + pom.xml  -> dependencies/plugins downloaded (rarely changes)
#   2. src/                   -> native-image compile (changes on every code change)
#
# Dependencies are resolved into a REAL layer (no --mount=type=cache) on purpose:
# type=gha / type=registry cache exports only contain layers, never cache mounts.
# ==============================================================================
FROM ghcr.io/graalvm/native-image-community:25.0.2 AS build
WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./

# -Pnative so the native-maven-plugin and its deps are resolved here too,
# otherwise they get downloaded in the (uncached-on-src-change) compile layer.
RUN chmod +x mvnw && \
    ./mvnw -B -Pnative dependency:go-offline

COPY src ./src
RUN ./mvnw -B -Pnative package -DskipTests

# ===========================================================================
# Tini binary — static download for PID-1 child-reaping on distroless
# runtimes (no libc dependency; Alpine glibc breaks on distroless).
# ===========================================================================
FROM scratch AS tini-binary
ADD https://github.com/krallin/tini/releases/download/v0.19.0/tini-static /tini

# ==============================================================================
# Runtime — minimal footprint
# ARGs live in this stage so changing APP_VERSION never invalidates the build
# stage's cache.
# ==============================================================================
FROM gcr.io/distroless/java21-debian12:nonroot

ARG APP_VERSION="unknown"

ENV APP_VERSION=${APP_VERSION} \
    SPRING_PROFILES_ACTIVE=container

WORKDIR /app

# Copy static tini (executable) and native executable from their respective stages.
COPY --from=tini-binary --chmod=755 /tini /usr/local/bin/tini
COPY --from=build --chmod=755 /app/target/spat ./spat

USER nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/tini", "--"]
CMD ["/app/spat"]
