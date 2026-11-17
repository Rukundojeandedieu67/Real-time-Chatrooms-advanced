import base64
import json
import time

import jwt


def make_token(
    user_id,
    *,
    role="member",
    email="user@example.com",
    exp=None,
    secret="test-jwt-secret-key-with-32bytes!!",
    aud="authenticated",
):
    payload = {
        "sub": str(user_id),
        "aud": aud,
        "exp": int(time.time()) + 3600 if exp is None else exp,
        "email": email,
        "app_metadata": {"role": role},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def unsigned_token(user_id):
    header = _b64({"alg": "none", "typ": "JWT"})
    body = _b64(
        {
            "sub": str(user_id),
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
        }
    )
    return f"{header}.{body}."


def _b64(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b"=").decode()
