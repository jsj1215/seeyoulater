package com.sujin.seeyoulater.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * rate limit 키로 쓸 클라이언트 IP를 구함.
 *
 * X-Forwarded-For는 클라이언트가 임의 값을 앞에 붙여 보낼 수 있으므로 맨 왼쪽 값을 믿으면 우회가 쉬움.
 * 그래서 "오른쪽부터 신뢰하는 프록시 수(trusted-proxy-hops)"만큼 건너뛴 위치의 값을 씀.
 * 각 프록시는 자신이 받은 연결의 IP를 오른쪽에 덧붙이기 때문에, 신뢰하는 프록시가 덧붙인 값만 고르게 됨.
 *
 * - 0(기본값): 프록시 없이 직접 받는 로컬 환경. getRemoteAddr()를 그대로 씀
 * - Firebase Hosting → Cloud Run 같은 프록시 뒤: 배포 환경에서 실제 헤더를 확인해 홉 수를 설정
 */
@Component
public class ClientIpResolver {

    private final int trustedProxyHops;

    public ClientIpResolver(@Value("${app.rate-limit.trusted-proxy-hops:0}") int trustedProxyHops) {
        this.trustedProxyHops = Math.max(0, trustedProxyHops);
    }

    public String resolve(HttpServletRequest request) {
        return resolve(request.getHeader("X-Forwarded-For"), request.getRemoteAddr());
    }

    String resolve(String forwardedFor, String remoteAddr) {
        if (trustedProxyHops == 0) {
            return remoteAddr;
        }
        // 연결 순서대로 [클라이언트가 보낸 값..., 프록시가 덧붙인 값..., 직접 연결한 주소]
        List<String> chain = new ArrayList<>();
        if (forwardedFor != null) {
            for (String part : forwardedFor.split(",")) {
                String ip = part.trim();
                if (!ip.isEmpty()) chain.add(ip);
            }
        }
        chain.add(remoteAddr);
        int index = chain.size() - 1 - trustedProxyHops;
        // 헤더가 기대보다 짧으면 위조나 설정 오류이므로 가장 바깥의 값을 씀
        return chain.get(Math.max(index, 0));
    }
}
