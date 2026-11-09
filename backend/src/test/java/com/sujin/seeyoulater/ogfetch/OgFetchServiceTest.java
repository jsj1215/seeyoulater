package com.sujin.seeyoulater.ogfetch;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OgFetchServiceTest {

    private HttpServer server;
    private int port;
    private final AtomicInteger secretHits = new AtomicInteger();

    /**
     * 테스트 서버도 루프백에 있으므로, 호스트명 "localhost"로 들어오는 첫 홉만 허용하는 정책을 주입함.
     * 그 외 호스트(예: 리다이렉트 대상 127.0.0.1 리터럴)는 운영과 같은 차단 목록으로 검사됨.
     */
    private final OgFetchService service = new OgFetchService(
            (host, address) -> "localhost".equals(host) || !OgFetchService.isBlockedAddress(address),
            p -> true);

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0), 0);
        port = server.getAddress().getPort();
        server.createContext("/page", ex -> respond(ex, 200, "text/html; charset=UTF-8",
                "<html><head><title>Fallback</title>"
                        + "<meta property=\"og:title\" content=\"OG Title\">"
                        + "<meta property=\"og:image\" content=\"/img/cover.png\">"
                        + "</head><body></body></html>"));
        server.createContext("/json", ex -> respond(ex, 200, "application/json",
                "{\"title\":\"<meta property='og:title' content='nope'>\"}"));
        server.createContext("/to-loopback", ex -> redirect(ex, "http://127.0.0.1:" + port + "/secret"));
        server.createContext("/to-metadata", ex -> redirect(ex, "http://169.254.169.254/latest/meta-data/"));
        server.createContext("/to-file", ex -> redirect(ex, "file:///etc/passwd"));
        server.createContext("/to-page", ex -> redirect(ex, "/page"));
        server.createContext("/loop", ex -> redirect(ex, "/loop"));
        server.createContext("/secret", ex -> {
            secretHits.incrementAndGet();
            respond(ex, 200, "text/html", "<title>internal</title>");
        });
        server.start();
    }

    @AfterEach
    void stopServer() throws IOException {
        server.stop(0);
        service.close();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "127.0.0.1", "127.1.2.3", "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1",
            "169.254.169.254", "0.0.0.0", "0.1.2.3", "100.64.0.1", "100.127.255.255", "198.18.0.1",
            "198.19.255.255", "224.0.0.1", "239.255.255.250", "255.255.255.255", "240.0.0.1",
            "::", "::1", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1",
            "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:169.254.169.254",
            "64:ff9b::a9fe:a9fe", "2002:7f00:1::1", "::127.0.0.1"
    })
    void blocksPrivateAndSpecialAddresses(String ip) throws Exception {
        assertThat(OgFetchService.isBlockedAddress(InetAddress.getByName(ip))).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "8.8.8.8", "1.1.1.1", "93.184.216.34", "100.63.255.255", "100.128.0.1", "172.32.0.1",
            "198.17.255.255", "198.20.0.1", "2606:4700:4700::1111", "2001:4860:4860::8888"
    })
    void allowsPublicAddresses(String ip) throws Exception {
        assertThat(OgFetchService.isBlockedAddress(InetAddress.getByName(ip))).isFalse();
    }

    @Test
    void rejectsLoopbackAndNonHttpUrlsWithDefaultPolicy() {
        OgFetchService production = new OgFetchService();
        try {
            assertThatThrownBy(() -> production.fetch("http://127.0.0.1/")).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> production.fetch("http://localhost/")).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> production.fetch("http://[::1]/")).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> production.fetch("http://169.254.169.254/latest/")).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> production.fetch("file:///etc/passwd")).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> production.fetch("http://example.com:8080/")).isInstanceOf(IllegalArgumentException.class);
        } finally {
            try { production.close(); } catch (IOException ignored) { }
        }
    }

    @Test
    void parsesHtmlAndResolvesRelativeOgImage() {
        OgMetadata meta = service.fetch("http://localhost:" + port + "/page");
        assertThat(meta.title()).isEqualTo("OG Title");
        assertThat(meta.thumbnailUrl()).isEqualTo("http://localhost:" + port + "/img/cover.png");
    }

    @Test
    void followsSafeRelativeRedirect() {
        OgMetadata meta = service.fetch("http://localhost:" + port + "/to-page");
        assertThat(meta.title()).isEqualTo("OG Title");
    }

    @Test
    void ignoresNonHtmlResponses() {
        OgMetadata meta = service.fetch("http://localhost:" + port + "/json");
        assertThat(meta.title()).isNull();
    }

    @Test
    void rejectsRedirectToLoopbackWithoutRequestingIt() {
        assertThatThrownBy(() -> service.fetch("http://localhost:" + port + "/to-loopback"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(secretHits.get()).isZero();
    }

    @Test
    void rejectsRedirectToCloudMetadataAndNonHttpScheme() {
        assertThatThrownBy(() -> service.fetch("http://localhost:" + port + "/to-metadata"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.fetch("http://localhost:" + port + "/to-file"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void connectionTimeDnsResolutionIsValidatedAgain() throws Exception {
        // DNS rebinding 모사: 사전 검사 때는 허용 IP, 실제 연결 시점의 조회에서는 차단 대상이 되는 상황
        int precheckCalls = InetAddress.getAllByName("localhost").length;
        AtomicInteger remainingAllowed = new AtomicInteger(precheckCalls);
        OgFetchService rebinding = new OgFetchService((host, address) -> remainingAllowed.getAndDecrement() > 0, p -> true);
        try {
            assertThatThrownBy(() -> rebinding.fetch("http://localhost:" + port + "/secret"))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThat(secretHits.get()).isZero();
        } finally {
            rebinding.close();
        }
    }

    @Test
    void stopsAfterMaxRedirects() {
        OgMetadata meta = service.fetch("http://localhost:" + port + "/loop");
        assertThat(meta).isEqualTo(OgMetadata.empty());
    }

    private static void redirect(com.sun.net.httpserver.HttpExchange ex, String location) throws IOException {
        ex.getResponseHeaders().add("Location", location);
        ex.sendResponseHeaders(302, -1);
        ex.close();
    }

    private static void respond(com.sun.net.httpserver.HttpExchange ex, int status, String contentType, String body)
            throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", contentType);
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }
}
