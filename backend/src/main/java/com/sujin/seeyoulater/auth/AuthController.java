package com.sujin.seeyoulater.auth;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final long jwtExpiration;
    // 운영(HTTPS)에서는 반드시 true. Chrome/Firefox는 http://localhost에서도 Secure 쿠키를 받지만
    // Safari는 받지 않으므로 Safari로 로컬 개발할 때만 COOKIE_SECURE=false로 실행
    private final boolean cookieSecure;

    public AuthController(AuthService authService,
                          @Value("${jwt.expiration}") long jwtExpiration,
                          @Value("${app.cookie.secure:true}") boolean cookieSecure) {
        this.authService = authService;
        this.jwtExpiration = jwtExpiration;
        this.cookieSecure = cookieSecure;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        var result = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, buildCookie(result.token()).toString())
                .body(new SignupResult(result.id(), result.email()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        String token = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildCookie(token).toString())
                .body(new LoginResult(request.email()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // 발급 때와 같은 속성(path, Secure, SameSite)이어야 브라우저가 같은 쿠키로 보고 지움
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildCookie("", 0).toString())
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal UserDetails userDetails) {
        var info = authService.me(userDetails.getUsername());
        return ResponseEntity.ok(info);
    }

    private ResponseCookie buildCookie(String token) {
        return buildCookie(token, jwtExpiration / 1000);
    }

    private ResponseCookie buildCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from("accessToken", value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
    }

    record SignupResult(Long id, String email) {}
    record LoginResult(String email) {}
}
