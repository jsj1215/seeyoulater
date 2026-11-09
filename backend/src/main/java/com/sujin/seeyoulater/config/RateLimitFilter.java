package com.sujin.seeyoulater.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sujin.seeyoulater.auth.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 클라이언트 IP별 인메모리 토큰 버킷 rate limit.
 * 단일 인스턴스 데모 배포가 전제라 외부 의존성(Bucket4j, Redis) 없이 ConcurrentHashMap으로 구현함.
 * 인스턴스를 여러 대로 늘리면 버킷이 인스턴스마다 따로 생기므로 Redis 기반으로 바꿔야 함.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_NANOS = 60_000_000_000L;
    private static final int CLEANUP_THRESHOLD = 10_000;

    private final ObjectMapper objectMapper;
    private final ClientIpResolver clientIpResolver;
    private final Map<String, Rule> rules;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(ObjectMapper objectMapper,
                           ClientIpResolver clientIpResolver,
                           @Value("${app.rate-limit.login-per-minute:10}") int loginPerMinute,
                           @Value("${app.rate-limit.signup-per-minute:5}") int signupPerMinute,
                           @Value("${app.rate-limit.og-per-minute:30}") int ogPerMinute) {
        this.objectMapper = objectMapper;
        this.clientIpResolver = clientIpResolver;
        this.rules = Map.of(
                "POST /api/auth/login", new Rule("login", loginPerMinute),
                "POST /api/auth/signup", new Rule("signup", signupPerMinute),
                "GET /api/og", new Rule("og", ogPerMinute));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        Rule rule = rules.get(request.getMethod() + " " + path);
        if (rule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // 프록시 뒤에서는 신뢰하는 프록시가 덧붙인 X-Forwarded-For 값을 씀 (ClientIpResolver 참고)
        String key = rule.name() + ":" + clientIpResolver.resolve(request);
        long now = System.nanoTime();
        if (buckets.size() > CLEANUP_THRESHOLD) {
            buckets.entrySet().removeIf(e -> e.getValue().isIdle(now));
        }
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(rule.capacity(), now));
        if (bucket.tryConsume(now)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", "60");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(),
                ErrorResponse.of("Too many requests. Please try again later.", 429));
    }

    /** 테스트에서 케이스 간 버킷 상태를 초기화하기 위한 용도 */
    public void reset() {
        buckets.clear();
    }

    private record Rule(String name, int capacity) {}

    private static final class Bucket {
        private final int capacity;
        private final double refillPerNano;
        private double tokens;
        private long lastRefill;

        Bucket(int capacity, long now) {
            this.capacity = capacity;
            this.refillPerNano = (double) capacity / WINDOW_NANOS;
            this.tokens = capacity;
            this.lastRefill = now;
        }

        synchronized boolean tryConsume(long now) {
            refill(now);
            if (tokens >= 1) {
                tokens -= 1;
                return true;
            }
            return false;
        }

        synchronized boolean isIdle(long now) {
            refill(now);
            return tokens >= capacity;
        }

        private void refill(long now) {
            tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerNano);
            lastRefill = now;
        }
    }
}
