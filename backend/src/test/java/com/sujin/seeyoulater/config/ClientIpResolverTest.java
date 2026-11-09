package com.sujin.seeyoulater.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    @Test
    void usesRemoteAddrWhenNoProxyIsTrusted() {
        ClientIpResolver resolver = new ClientIpResolver(0);
        assertThat(resolver.resolve("1.1.1.1, 2.2.2.2", "10.0.0.1")).isEqualTo("10.0.0.1");
    }

    @Test
    void picksValueAddedByTrustedProxyAndIgnoresSpoofedPrefix() {
        // 클라이언트가 "6.6.6.6"을 위조해 보내고, 신뢰하는 프록시 1개가 실제 IP 203.0.113.7을 덧붙인 상황
        ClientIpResolver resolver = new ClientIpResolver(1);
        assertThat(resolver.resolve("6.6.6.6, 203.0.113.7", "10.0.0.1")).isEqualTo("203.0.113.7");
    }

    @Test
    void countsMultipleTrustedHopsFromTheRight() {
        ClientIpResolver resolver = new ClientIpResolver(2);
        assertThat(resolver.resolve("6.6.6.6, 203.0.113.7, 35.0.0.2", "10.0.0.1")).isEqualTo("203.0.113.7");
    }

    @Test
    void fallsBackToOutermostValueWhenHeaderIsShorterThanExpected() {
        ClientIpResolver resolver = new ClientIpResolver(3);
        assertThat(resolver.resolve(null, "10.0.0.1")).isEqualTo("10.0.0.1");
        assertThat(resolver.resolve("203.0.113.7", "10.0.0.1")).isEqualTo("203.0.113.7");
    }
}
