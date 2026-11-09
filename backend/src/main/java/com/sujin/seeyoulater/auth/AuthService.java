package com.sujin.seeyoulater.auth;

import com.sujin.seeyoulater.config.JwtTokenProvider;
import com.sujin.seeyoulater.user.User;
import com.sujin.seeyoulater.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Service
public class AuthService {

    // BCrypt는 72바이트 이후를 무시함(CVE-2025-22228). 글자 수(@Size)가 아니라 UTF-8 바이트 기준으로 한 번 더 검사
    private static final int BCRYPT_MAX_BYTES = 72;
    private static final String EMAIL_UNAVAILABLE = "This email cannot be used for signup";
    private static final String INVALID_CREDENTIALS = "Invalid credentials";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final int maxUsers;
    // 존재하지 않는 이메일로 로그인해도 BCrypt 비교 1회를 수행해 응답 시간으로 가입 여부를 추측하지 못하게 함
    private final String dummyHash;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       @Value("${app.max-users}") int maxUsers) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.maxUsers = maxUsers;
        this.dummyHash = passwordEncoder.encode("timing-equalizer-dummy-password");
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        if (exceedsBcryptLimit(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password: must be at most 72 bytes");
        }
        if (userRepository.count() >= maxUsers) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Registration is closed");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, EMAIL_UNAVAILABLE);
        }
        User user = new User(request.email(), passwordEncoder.encode(request.password()));
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // exists 체크와 insert 사이에 같은 이메일이 먼저 가입된 경우(UNIQUE 위반)
            throw new ResponseStatusException(HttpStatus.CONFLICT, EMAIL_UNAVAILABLE);
        }
        String token = tokenProvider.generateToken(user.getEmail());
        return new SignupResponse(user.getId(), user.getEmail(), token);
    }

    @Transactional(readOnly = true)
    public String login(LoginRequest request) {
        if (exceedsBcryptLimit(request.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        Optional<User> user = userRepository.findByEmail(request.email());
        String hash = user.map(User::getPassword).orElse(dummyHash);
        boolean matches = passwordEncoder.matches(request.password(), hash);
        if (user.isEmpty() || !matches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        return tokenProvider.generateToken(user.get().getEmail());
    }

    @Transactional(readOnly = true)
    public UserInfo me(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return new UserInfo(user.getId(), user.getEmail());
    }

    private static boolean exceedsBcryptLimit(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES;
    }

    public record SignupResponse(Long id, String email, String token) {}
    public record UserInfo(Long id, String email) {}
}
