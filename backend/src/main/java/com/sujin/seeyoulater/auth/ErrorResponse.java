package com.sujin.seeyoulater.auth;

import java.time.LocalDateTime;

/**
 * 공통 에러 응답. 기존 클라이언트는 {@code error}, 신규 클라이언트는 {@code message}를 읽으므로 같은 값을 둘 다 내려줌.
 */
public record ErrorResponse(String error, String message, int status, LocalDateTime timestamp) {
    public static ErrorResponse of(String error, int status) {
        return new ErrorResponse(error, error, status, LocalDateTime.now());
    }
}
