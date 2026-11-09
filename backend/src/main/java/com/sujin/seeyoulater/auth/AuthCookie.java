package com.sujin.seeyoulater.auth;

/**
 * 인증 쿠키 이름.
 * Firebase Hosting은 Cloud Run으로 요청을 넘길 때 "__session" 이름의 쿠키만 전달하고 나머지는 제거함.
 * 화면과 API를 Hosting 한 도메인으로 묶어 배포하므로 이 이름을 써야 로그인 상태가 서버까지 전달됨.
 */
public final class AuthCookie {

    public static final String NAME = "__session";

    private AuthCookie() {
    }
}
