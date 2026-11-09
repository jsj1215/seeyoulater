package com.sujin.seeyoulater.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank @Email @Size(max = 255) String email,
    // 72는 BCrypt 입력 한계(바이트). 멀티바이트 문자는 AuthService에서 바이트 기준으로 추가 검사
    @NotBlank @Size(min = 8, max = 72) String password
) {}
