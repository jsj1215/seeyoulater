package com.sujin.seeyoulater.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 이메일(계정) 기준 로그인 실패 횟수 제한.
 *
 * IP 기준 제한(RateLimitFilter)만 있으면, Cloud Run 주소로 직접 요청하면서 X-Forwarded-For를 바꿔 보내는 방식으로
 * 한 계정에 비밀번호를 계속 대입할 수 있음. 계정 단위로도 실패 횟수를 세어 이 우회를 막음.
 *
 * - 존재하지 않는 이메일도 같은 규칙을 적용해 응답으로 가입 여부를 추측할 수 없게 함
 * - 성공하면 실패 기록을 지움
 * - 인메모리라 단일 인스턴스 전제 (Cloud Run max-instances 1)
 */
@Component
public class LoginAttemptLimiter {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private final int maxFailures;
    private final Duration window;
    private final Clock clock;
    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    @Autowired
    public LoginAttemptLimiter(@Value("${app.rate-limit.login-failures-per-email:5}") int maxFailures,
                               @Value("${app.rate-limit.login-lock-minutes:15}") long lockMinutes) {
        this(maxFailures, Duration.ofMinutes(lockMinutes), Clock.systemUTC());
    }

    LoginAttemptLimiter(int maxFailures, Duration window, Clock clock) {
        this.maxFailures = maxFailures;
        this.window = window;
        this.clock = clock;
    }

    /** 잠긴 계정이면 true. 로그인 검증 전에 호출 */
    public boolean isLocked(String email) {
        Attempts a = attempts.get(key(email));
        if (a == null) return false;
        if (a.isExpired(clock.instant(), window)) {
            attempts.remove(key(email), a);
            return false;
        }
        return a.count >= maxFailures;
    }

    public void recordFailure(String email) {
        Instant now = clock.instant();
        if (attempts.size() > CLEANUP_THRESHOLD) {
            attempts.values().removeIf(a -> a.isExpired(now, window));
        }
        attempts.compute(key(email), (k, a) ->
                (a == null || a.isExpired(now, window)) ? new Attempts(1, now) : new Attempts(a.count + 1, a.firstFailure));
    }

    public void recordSuccess(String email) {
        attempts.remove(key(email));
    }

    /** 테스트에서 케이스 간 상태를 초기화하기 위한 용도 */
    public void reset() {
        attempts.clear();
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private record Attempts(int count, Instant firstFailure) {
        boolean isExpired(Instant now, Duration window) {
            return now.isAfter(firstFailure.plus(window));
        }
    }
}
