package com.sujin.seeyoulater;

import com.sujin.seeyoulater.auth.AuthCookie;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import jakarta.servlet.http.Cookie;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthApiTest extends ApiTestSupport {

    @Test
    void protectedEndpointWithoutCookieReturns401() throws Exception {
        mockMvc.perform(get("/api/bookmarks")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void corsPreflightFromAllowedOriginSucceeds() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/bookmarks")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/bookmarks")
                        .header("Origin", "https://evil.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/folders").cookie(new Cookie(AuthCookie.NAME, "not-a-jwt")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void signupSetsSecureHttpOnlyCookie() throws Exception {
        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", uniqueEmail("cookie"), "password", "password1234"))))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")));
    }

    @Test
    void signupPasswordLongerThan72Returns400() throws Exception {
        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", uniqueEmail("long"), "password", "a".repeat(73)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void signupPasswordOver72BytesWithMultibyteCharsReturns400() throws Exception {
        // 30자지만 UTF-8로 90바이트
        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", uniqueEmail("korean"), "password", "가".repeat(30)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateSignupReturns409WithoutEchoingEmail() throws Exception {
        String email = uniqueEmail("dup");
        String body = json(Map.of("email", email, "password", "password1234"));
        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", not(containsString(email))));
    }

    @Test
    void eleventhLoginWithinAMinuteReturns429() throws Exception {
        // 이메일 기준 잠금(5회)과 구분하려고 시도마다 다른 이메일을 씀 → IP 기준 제한만 검증
        for (int i = 0; i < 10; i++) {
            String body = json(Map.of("email", uniqueEmail("rl" + i), "password", "wrong-password"));
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isUnauthorized());
        }
        String body = json(Map.of("email", uniqueEmail("rl-last"), "password", "wrong-password"));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.message").isString())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void accountLocksAfterFiveFailuresEvenWithSpoofedIps() throws Exception {
        // Cloud Run 주소로 직접 요청하며 X-Forwarded-For를 바꿔도 같은 계정은 잠김
        String email = uniqueEmail("lock");
        loginAs(email);
        String wrong = json(Map.of("email", email, "password", "wrong-password"));
        for (int i = 0; i < 5; i++) {
            String spoofedIp = "203.0.113." + (i + 1);
            mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr(spoofedIp); return r; })
                            .contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        String correct = json(Map.of("email", email, "password", "password1234"));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(correct))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void successfulLoginClearsFailureCount() throws Exception {
        String email = uniqueEmail("clear");
        loginAs(email);
        String wrong = json(Map.of("email", email, "password", "wrong-password"));
        String correct = json(Map.of("email", email, "password", "password1234"));
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(correct))
                .andExpect(status().isOk());
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(correct))
                .andExpect(status().isOk());
    }

    @Test
    void loginSucceedsWithCorrectPassword() throws Exception {
        String email = uniqueEmail("ok");
        loginAs(email);
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "password1234"))))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString(AuthCookie.NAME + "=")));
    }

    @Test
    void logoutClearsCookieEvenWithInvalidToken() throws Exception {
        mockMvc.perform(post("/api/auth/logout").cookie(new Cookie(AuthCookie.NAME, "expired-or-garbage")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")));
    }
}
