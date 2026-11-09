# Cloud Run 배포용 이미지
# 1단계: Gradle wrapper로 실행 가능한 jar 빌드 (테스트는 CI·로컬에서 따로 실행)
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# 의존성 레이어를 먼저 받아 두면 소스만 바뀐 재빌드가 빨라짐
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null

COPY src ./src
RUN ./gradlew --no-daemon bootJar -x test

# 2단계: JRE만 담은 실행 이미지, root가 아닌 사용자로 실행
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 --no-create-home app
COPY --from=build /app/build/libs/*.jar app.jar
USER app

# 컨테이너 메모리 한도에 맞춰 힙 크기를 정함 (Cloud Run 512MiB~1GiB 기준)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
