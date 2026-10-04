FROM ghcr.io/graalvm/native-image-community:25.0.2 AS build

WORKDIR /app
COPY pom.xml mvnw .mvn/ ./
COPY src/ ./src/

RUN ./mvnw -Pnative package -DskipTests -Dskip.unit.tests=true -Dspring-boot.run.profiles=prod

### Runtime
FROM gcr.io/distroless/java-base:nonroot
ARG PORT=8080
ARG APP_VERSION="unknown"

ENV APP_VERSION=${APP_VERSION} \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0" \
    SPRING_PROFILES_ACTIVE=container

WORKDIR /app
USER 1001

COPY --from=build /app/target/spat ./spat
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD curl -f http://localhost:${PORT}/actuator/health || exit 1

ENTRYPOINT ["/app/spat"]
