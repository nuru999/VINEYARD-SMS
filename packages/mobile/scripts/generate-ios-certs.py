#!/usr/bin/env python3
"""
Generate iOS distribution certificate and provisioning profile for EAS Build.
Zero dependencies — uses only python3, openssl, and curl (pre-installed on macOS).

Cert resolution: local file → Expo servers → create new via Apple ASC API.

Usage:
  EXPO_TOKEN=xxx EXPO_ASC_KEY_ID=xxx EXPO_ASC_ISSUER_ID=xxx \
  EXPO_ASC_API_KEY_PATH=./keys/AuthKey.p8 EXPO_APPLE_TEAM_ID=xxx \
  python3 scripts/generate_ios_certs.py
"""

import subprocess, base64, json, time, os, sys

# --- Config ---
EXPO_TOKEN = os.environ.get("EXPO_TOKEN")
KEY_ID = os.environ.get("EXPO_ASC_KEY_ID")
ISSUER_ID = os.environ.get("EXPO_ASC_ISSUER_ID")
KEY_PATH = os.environ.get("EXPO_ASC_API_KEY_PATH")
TEAM_ID = os.environ.get("EXPO_APPLE_TEAM_ID")
EXPO_ACCOUNT = os.environ.get("EXPO_ACCOUNT")
BUNDLE_ID = os.environ.get("EXPO_BUNDLE_ID")
OUTPUT_DIR = "./ios/certs"
APPLE_API = "https://api.appstoreconnect.apple.com/v1"

_jwt_cache = {"token": None, "exp": 0}
_cert_password = ""


def die(msg):
    print(f"Error: {msg}")
    sys.exit(1)


def check_env():
    required = ["EXPO_TOKEN", "EXPO_ACCOUNT", "EXPO_BUNDLE_ID", "EXPO_ASC_KEY_ID", "EXPO_ASC_ISSUER_ID", "EXPO_ASC_API_KEY_PATH", "EXPO_APPLE_TEAM_ID"]
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        die(f"Missing environment variables: {', '.join(missing)}")
    if not os.path.exists(KEY_PATH):
        die(f"ASC API key not found at {KEY_PATH}")


# ── Helpers ──

def b64url(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def der_to_jose(der_sig):
    """DER ECDSA signature -> raw R||S (64 bytes for P-256)."""
    d = der_sig
    assert d[0] == 0x30
    idx = 2 + (d[1] & 0x7F if d[1] & 0x80 else 0)
    assert d[idx] == 0x02
    r = int.from_bytes(d[idx+2:idx+2+d[idx+1]], "big")
    idx += 2 + d[idx+1]
    assert d[idx] == 0x02
    s = int.from_bytes(d[idx+2:idx+2+d[idx+1]], "big")
    return r.to_bytes(32, "big") + s.to_bytes(32, "big")


def get_jwt():
    now = int(time.time())
    if _jwt_cache["token"] and now < _jwt_cache["exp"] - 60:
        return _jwt_cache["token"]

    header = b64url(json.dumps({"alg": "ES256", "kid": KEY_ID, "typ": "JWT"}))
    exp = now + 1200
    payload = b64url(json.dumps({"iss": ISSUER_ID, "iat": now, "exp": exp, "aud": "appstoreconnect-v1"}))

    r = subprocess.run(["openssl", "dgst", "-sha256", "-sign", KEY_PATH],
                       input=f"{header}.{payload}".encode(), capture_output=True)
    if r.returncode != 0:
        die(f"JWT signing failed: {r.stderr.decode()}")

    _jwt_cache["token"] = f"{header}.{payload}.{b64url(der_to_jose(r.stdout))}"
    _jwt_cache["exp"] = exp
    return _jwt_cache["token"]


def curl_call(method, url, headers, body=None, retries=2):
    cmd = ["curl", "-s", "-S", "-g", "-w", "\n%{http_code}", "--connect-timeout", "30",
           "--max-time", "60", "-X", method, url]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    if body:
        cmd += ["-d", json.dumps(body)]

    for attempt in range(retries + 1):
        r = subprocess.run(cmd, capture_output=True, text=True)
        lines = r.stdout.strip().rsplit("\n", 1)
        resp_body = lines[0] if len(lines) == 2 else ""
        status = lines[-1] if lines else "000"

        if status == "000" or not resp_body.strip():
            if attempt < retries:
                print(f"   Retry {attempt+1}/{retries}...")
                time.sleep(2)
                continue
            die(f"Connection failed: {method} {url}\n   curl: {r.stderr.strip()}")

        try:
            return json.loads(resp_body)
        except json.JSONDecodeError:
            die(f"Invalid JSON from {method} {url}, HTTP {status}\n   {resp_body[:300]}")


def apple_api(method, path, body=None):
    url = f"{APPLE_API}{path}" if path.startswith("/") else path
    return curl_call(method, url, {"Authorization": f"Bearer {get_jwt()}", "Content-Type": "application/json"}, body)


def expo_graphql(query, variables=None):
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {EXPO_TOKEN}"}
    body = {"query": query}
    if variables:
        body["variables"] = variables
    try:
        data = curl_call("POST", "https://api.expo.dev/graphql", headers, body)
        return data.get("data") if "errors" not in data else None
    except SystemExit:
        return None


# ── Certificate Resolution ──

def fetch_from_expo():
    """Fetch distribution cert from Expo. Returns (p12_bytes, password, apple_id) or Nones."""
    query = """
    query($name: String!, $first: Int) {
      account { byName(accountName: $name) {
        appleDistributionCertificatesPaginated(first: $first) { edges { node {
          certificateP12 certificatePassword developerPortalIdentifier
          validityNotAfter appleTeam { appleTeamIdentifier }
        }}}
      }}
    }"""
    data = expo_graphql(query, {"name": EXPO_ACCOUNT, "first": 50})
    if not data:
        return None, None, None

    try:
        edges = data["account"]["byName"]["appleDistributionCertificatesPaginated"]["edges"]
    except (KeyError, TypeError):
        return None, None, None

    now = time.time()
    for edge in edges:
        node = edge["node"]
        team_id = (node.get("appleTeam") or {}).get("appleTeamIdentifier", "")
        if team_id and team_id != TEAM_ID:
            continue
        expiry = node.get("validityNotAfter", "")
        if expiry:
            try:
                from datetime import datetime
                if datetime.fromisoformat(expiry.replace("Z", "+00:00")).timestamp() < now:
                    continue
            except (ValueError, ImportError):
                pass
        p12, pwd, cid = node.get("certificateP12"), node.get("certificatePassword", ""), node.get("developerPortalIdentifier")
        if p12 and cid:
            return base64.b64decode(p12), pwd or "", cid

    return None, None, None


def create_new_cert():
    """Create cert via Apple API. Returns (cert_id, password). Saves .p12 to OUTPUT_DIR."""
    key_file, csr_file = f"{OUTPUT_DIR}/key.pem", f"{OUTPUT_DIR}/cert.csr"

    r = subprocess.run(["openssl", "req", "-new", "-newkey", "rsa:2048", "-nodes",
                        "-keyout", key_file, "-out", csr_file,
                        "-subj", f"/CN=iOS Distribution/O={TEAM_ID}"], capture_output=True)
    if r.returncode != 0:
        die(f"CSR generation failed: {r.stderr.decode()}")

    with open(csr_file) as f:
        csr = f.read()

    resp = apple_api("POST", "/certificates", {
        "data": {"type": "certificates", "attributes": {"certificateType": "IOS_DISTRIBUTION", "csrContent": csr}}
    })

    if "errors" in resp:
        for f_clean in [key_file, csr_file]:
            if os.path.exists(f_clean):
                os.remove(f_clean)
        for e in resp["errors"]:
            print(f"   Apple API error: {e.get('title', '')} -- {e.get('detail', '')}")
        die("Certificate creation failed. Check the error above and resolve manually.")

    cert_id = resp["data"]["id"]
    print(f"   Created certificate: {cert_id}")

    # Package into .p12 (convert DER cert to PEM first for compatibility)
    der_file = f"{OUTPUT_DIR}/{cert_id}.der"
    pem_file = f"{OUTPUT_DIR}/{cert_id}.pem"
    p12_file = f"{OUTPUT_DIR}/dist-cert.p12"
    with open(der_file, "wb") as f:
        f.write(base64.b64decode(resp["data"]["attributes"]["certificateContent"]))

    r = subprocess.run(["openssl", "x509", "-in", der_file, "-inform", "DER",
                        "-out", pem_file, "-outform", "PEM"], capture_output=True)
    if r.returncode != 0:
        die(f"DER to PEM conversion failed: {r.stderr.decode()}")

    r = subprocess.run(["openssl", "pkcs12", "-export", "-out", p12_file,
                        "-inkey", key_file, "-in", pem_file,
                        "-passout", "pass:"], capture_output=True)
    if r.returncode != 0:
        die(f"p12 creation failed: {r.stderr.decode()}")

    for f_clean in [key_file, csr_file, der_file, pem_file]:
        if os.path.exists(f_clean):
            os.remove(f_clean)

    return cert_id, ""


def get_p12_serial(p12_path, password):
    try:
        r1 = subprocess.run(["openssl", "pkcs12", "-in", p12_path, "-passin", f"pass:{password}",
                             "-nokeys", "-clcerts"], capture_output=True, text=True)
        if r1.returncode != 0:
            return None
        r2 = subprocess.run(["openssl", "x509", "-noout", "-serial"],
                            input=r1.stdout, capture_output=True, text=True)
        if r2.returncode == 0 and "=" in r2.stdout:
            return r2.stdout.strip().split("=", 1)[1]
    except Exception:
        pass
    return None


# ── Main ──

def save_metadata(cert_id, password):
    with open(f"{OUTPUT_DIR}/.cert_id", "w") as f:
        f.write(cert_id)
    with open(f"{OUTPUT_DIR}/.p12_password", "w") as f:
        f.write(password)


def load_metadata():
    cert_id, password = None, ""
    for fname, target in [(".cert_id", "id"), (".p12_password", "pw")]:
        try:
            with open(f"{OUTPUT_DIR}/{fname}") as f:
                val = f.read().strip()
                if target == "id":
                    cert_id = val
                else:
                    password = val
        except FileNotFoundError:
            pass
    return cert_id, password


def main():
    check_env()
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    global _cert_password

    p12_file = f"{OUTPUT_DIR}/dist-cert.p12"
    apple_cert_id = None

    # Step 1: Resolve certificate (local -> Expo -> Apple)
    if os.path.exists(p12_file):
        print("1/3 Reusing local certificate...")
        apple_cert_id, _cert_password = load_metadata()
    else:
        print("1/3 Resolving certificate...")
        print("   Checking Expo servers...")
        p12_bytes, pwd, cert_id = fetch_from_expo()

        if p12_bytes:
            print(f"   Found on Expo (Apple ID: {cert_id})")
            with open(p12_file, "wb") as f:
                f.write(p12_bytes)
            apple_cert_id, _cert_password = cert_id, pwd
        else:
            print("   Not found. Creating via Apple API...")
            apple_cert_id, _cert_password = create_new_cert()

        save_metadata(apple_cert_id, _cert_password)
        print(f"   Saved: {p12_file}")

    # Resolve cert ID if missing (old local .p12 without metadata)
    if not apple_cert_id:
        print("   Looking up certificate on Apple...")
        serial = get_p12_serial(p12_file, _cert_password)
        if serial:
            certs = apple_api("GET", "/certificates?filter[certificateType]=IOS_DISTRIBUTION").get("data", [])
            for c in certs:
                if c["attributes"].get("serialNumber", "").upper() == serial.upper():
                    apple_cert_id = c["id"]
                    save_metadata(apple_cert_id, _cert_password)
                    print(f"   Matched: {apple_cert_id}")
                    break
        if not apple_cert_id:
            die("Could not determine certificate ID. Delete ios/certs/ and re-run.")

    # Step 2: Look up bundle ID
    print("2/3 Looking up bundle ID...")
    bundles = apple_api("GET", f"/bundleIds?filter[identifier]={BUNDLE_ID}")
    if not bundles.get("data"):
        die(f"Bundle ID '{BUNDLE_ID}' not found. Register at developer.apple.com")
    bundle_res_id = bundles["data"][0]["id"]
    print(f"   Found: {bundle_res_id}")

    # Step 3: Create provisioning profile
    print("3/3 Creating provisioning profile...")
    resp = apple_api("POST", "/profiles", {
        "data": {
            "type": "profiles",
            "attributes": {"name": f"EAS_{BUNDLE_ID}_{int(time.time())}", "profileType": "IOS_APP_STORE"},
            "relationships": {
                "bundleId": {"data": {"type": "bundleIds", "id": bundle_res_id}},
                "certificates": {"data": [{"type": "certificates", "id": apple_cert_id}]},
            },
        }
    })
    if "errors" in resp:
        for e in resp["errors"]:
            print(f"   Error: {e.get('title','')} -- {e.get('detail','')}")
        sys.exit(1)

    profile_file = f"{OUTPUT_DIR}/profile.mobileprovision"
    with open(profile_file, "wb") as f:
        f.write(base64.b64decode(resp["data"]["attributes"]["profileContent"]))
    print(f"   Saved: {profile_file}")

    # Write credentials.json
    with open("./credentials.json", "w") as f:
        json.dump({"ios": {
            "provisioningProfilePath": profile_file,
            "distributionCertificate": {"path": p12_file, "password": _cert_password},
        }}, f, indent=2)
    print("\ncredentials.json written. Ready for: eas build --platform ios --profile production --non-interactive")


if __name__ == "__main__":
    main()
