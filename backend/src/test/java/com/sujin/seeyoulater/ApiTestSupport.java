package com.sujin.seeyoulater;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sujin.seeyoulater.config.JwtTokenProvider;
import com.sujin.seeyoulater.config.RateLimitFilter;
import com.sujin.seeyoulater.user.User;
import com.sujin.seeyoulater.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class ApiTestSupport {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected UserRepository userRepository;
    @Autowired protected PasswordEncoder passwordEncoder;
    @Autowired protected JwtTokenProvider tokenProvider;
    @Autowired protected RateLimitFilter rateLimitFilter;

    @BeforeEach
    void resetRateLimit() {
        rateLimitFilter.reset();
    }

    protected static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    }

    /** 가입 API를 거치지 않고 사용자와 인증 쿠키를 바로 만듦 (signup rate limit 영향 없음) */
    protected Cookie loginAs(String email) {
        if (userRepository.findByEmail(email).isEmpty()) {
            userRepository.save(new User(email, passwordEncoder.encode("password1234")));
        }
        return new Cookie("accessToken", tokenProvider.generateToken(email));
    }

    protected String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    protected JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    protected long createBookmark(Cookie cookie, Map<String, Object> body) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/bookmarks").cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return read(result).get("id").asLong();
    }

    protected long createFolder(Cookie cookie, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/folders").cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("name", name))))
                .andExpect(status().isCreated())
                .andReturn();
        return read(result).get("id").asLong();
    }
}
