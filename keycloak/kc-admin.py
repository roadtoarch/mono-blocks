#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "httpx>=0.28",
# ]
# ///
"""Keycloak admin CLI for managing tenants, roles, and users in the *forest* realm.

Run with::

    uv run keycloak/kc-admin.py create-tenant  --tenant-id 3 --slug acme2 --name "Acme II" --theme acme
    uv run keycloak/kc-admin.py create-role    --name EDITOR --description "Can edit data within a tenant"
    uv run keycloak/kc-admin.py create-user    --username zara --email zara@example.test \
                           --first Zara --last Zane --tenant-id 3 --role EDITOR

Environment variables (all have sensible defaults matching docker-compose.yml):

    KEYCLOAK_URL          Base URL          (default: http://localhost:8081)
    KEYCLOAK_REALM        Realm name        (default: forest)
    KEYCLOAK_ADMIN_CLI_ID Admin client ID   (default: backend-admin)
    KEYCLOAK_ADMIN_CLI_SECRET  Client secret (default: changeme)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import uuid
from typing import Any

import httpx

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

KEYCLOAK_URL: str = os.environ.get("KEYCLOAK_URL", "http://localhost:8081")
REALM: str = os.environ.get("KEYCLOAK_REALM", "forest")
ADMIN_CLI_ID: str = os.environ.get("KEYCLOAK_ADMIN_CLI_ID", "backend-admin")
ADMIN_CLI_SECRET: str = os.environ.get("KEYCLOAK_ADMIN_CLI_SECRET", "changeme")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("kc-admin")


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _admin_base() -> str:
    """Return the admin REST API base URL for the configured realm."""
    return f"{KEYCLOAK_URL}/admin/realms/{REALM}"


def _token_url() -> str:
    """Return the token endpoint URL for the configured realm."""
    return f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token"


def _get_admin_token(client: httpx.Client) -> str:
    """Obtain an admin access token via the ``backend-admin`` service account.

    Uses the *client_credentials* grant against the Keycloak token endpoint.

    Args:
        client: An ``httpx.Client`` instance (reuse for connection pooling).

    Returns:
        The bearer access token string.

    Raises:
        SystemExit: If the token request fails (wrong credentials, Keycloak down).
    """
    resp = client.post(
        _token_url(),
        data={"grant_type": "client_credentials"},
        auth=(ADMIN_CLI_ID, ADMIN_CLI_SECRET),
    )
    if resp.status_code != 200:
        log.error(
            "Failed to obtain admin token (HTTP %d): %s",
            resp.status_code,
            resp.text,
        )
        sys.exit(1)
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    """Build the Authorization header dict."""
    return {"Authorization": f"Bearer {token}"}


def _check_response(resp: httpx.Response, *, action: str) -> None:
    """Log and exit on non-2xx responses.

    Args:
        resp: The HTTP response to check.
        action: A human-readable description of what was attempted.

    Raises:
        SystemExit: When the response status code indicates failure.
    """
    if resp.is_success:
        return
    log.error("%s failed (HTTP %d): %s", action, resp.status_code, resp.text)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Tenant (client) creation
# ---------------------------------------------------------------------------

_TENANT_ID_MAPPER_ID = "b1a2c3d4-e5f6-7890-abcd-ef1234567810"


def _build_tenant_client(
    *,
    tenant_id: str,
    slug: str,
    display_name: str,
    theme: str,
) -> dict[str, Any]:
    """Build the JSON payload for a new tenant client.

    Mirrors the structure of the existing ``acme-app`` and ``northpac-app``
    clients in the realm export.

    Args:
        tenant_id: Numeric tenant identifier (stored as user attribute).
        slug: Short machine-friendly slug used as the ``clientId`` suffix
              (e.g. ``acme2`` produces client ``acme2-app``).
        display_name: Human-readable tenant name shown in the Keycloak UI.
        theme: Login theme identifier (must match a theme directory under
               ``keycloak/themes/``).

    Returns:
        A dict ready to POST to the Keycloak clients endpoint.
    """
    client_id = f"{slug}-app"
    mapper_id = str(uuid.uuid4())

    return {
        "clientId": client_id,
        "name": display_name,
        "surrogateAuthRequired": False,
        "enabled": True,
        "alwaysDisplayInConsole": False,
        "clientAuthenticatorType": "client-secret",
        "redirectUris": [
            f"http://{slug}.localhost:5173/*",
            "http://localhost:5173/*",
            "http://localhost:5173",
        ],
        "webOrigins": [
            f"http://{slug}.localhost:5173",
            "http://localhost:5173",
        ],
        "notBefore": 0,
        "bearerOnly": False,
        "consentRequired": False,
        "standardFlowEnabled": True,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": False,
        "publicClient": True,
        "frontchannelLogout": False,
        "protocol": "openid-connect",
        "attributes": {
            "realm_client": "false",
            "post.logout.redirect.uris": "+",
            "pkce.code.challenge.method": "S256",
            "login_theme": theme,
        },
        "authenticationFlowBindingOverrides": {},
        "fullScopeAllowed": True,
        "nodeReRegistrationTimeout": -1,
        "protocolMappers": [
            {
                "id": mapper_id,
                "name": "tenant_id",
                "protocol": "openid-connect",
                "protocolMapper": "oidc-usermodel-attribute-mapper",
                "consentRequired": False,
                "config": {
                    "user.attribute": "tenant_id",
                    "id.token.claim": "true",
                    "access.token.claim": "true",
                    "claim.name": "tenant_id",
                    "jsonType.label": "String",
                    "userinfo.token.claim": "true",
                },
            },
        ],
        "defaultClientScopes": [
            "web-origins",
            "acr",
            "roles",
            "profile",
            "basic",
            "email",
        ],
        "optionalClientScopes": [
            "address",
            "phone",
            "organization",
            "offline_access",
            "microprofile-jwt",
        ],
    }


def cmd_create_tenant(args: argparse.Namespace) -> None:
    """Handle the ``create-tenant`` subcommand."""
    payload = _build_tenant_client(
        tenant_id=args.tenant_id,
        slug=args.slug,
        display_name=args.name,
        theme=args.theme,
    )

    with httpx.Client(timeout=30) as client:
        token = _get_admin_token(client)
        resp = client.post(
            f"{_admin_base()}/clients",
            headers=_auth_headers(token),
            json=payload,
        )

    _check_response(resp, action=f"Create tenant client '{payload['clientId']}'")

    # The Keycloak admin API returns 201 with a Location header but no body.
    location = resp.headers.get("Location", "unknown")
    log.info("Created tenant client '%s'  →  %s", payload["clientId"], location)
    log.info("tenant_id value: %s", args.tenant_id)
    log.info("login_theme:     %s", args.theme)


# ---------------------------------------------------------------------------
# Role creation
# ---------------------------------------------------------------------------


def cmd_create_role(args: argparse.Namespace) -> None:
    """Handle the ``create-role`` subcommand."""
    payload = {
        "name": args.name,
        "description": args.description,
        "composite": False,
        "clientRole": False,
        "attributes": {},
    }

    with httpx.Client(timeout=30) as client:
        token = _get_admin_token(client)
        resp = client.post(
            f"{_admin_base()}/roles",
            headers=_auth_headers(token),
            json=payload,
        )

    _check_response(resp, action=f"Create role '{args.name}'")
    log.info("Created realm role '%s' — %s", args.name, args.description)


# ---------------------------------------------------------------------------
# User creation
# ---------------------------------------------------------------------------


def cmd_create_user(args: argparse.Namespace) -> None:
    """Handle the ``create-user`` subcommand.

    Creates a user, sets the password to ``changeme``, and assigns the
    specified realm role.  The user's ``tenant_id`` attribute is set so the
    OIDC token carries the correct tenant claim.
    """
    user_payload: dict[str, Any] = {
        "username": args.username,
        "email": args.email,
        "emailVerified": True,
        "enabled": True,
        "firstName": args.first,
        "lastName": args.last,
        "attributes": {"tenant_id": [args.tenant_id]},
        "credentials": [
            {
                "type": "password",
                "value": "changeme",
                "temporary": False,
            },
        ],
    }

    with httpx.Client(timeout=30) as client:
        token = _get_admin_token(client)
        headers = _auth_headers(token)

        # 1. Create the user.
        resp = client.post(
            f"{_admin_base()}/users",
            headers=headers,
            json=user_payload,
        )
        _check_response(resp, action=f"Create user '{args.username}'")

        # Extract user ID from Location header
        # (Keycloak returns 201 with Location: .../users/<id>)
        location = resp.headers.get("Location", "")
        user_id = location.rsplit("/", 1)[-1] if location else ""
        if not user_id:
            log.error("Could not extract user ID from Location header: %s", location)
            sys.exit(1)

        # 2. Resolve the role ID by name.
        resp = client.get(
            f"{_admin_base()}/roles/{args.role}",
            headers=headers,
        )
        _check_response(resp, action=f"Look up role '{args.role}'")
        role_repr = resp.json()

        # 3. Assign the realm role to the user.
        resp = client.post(
            f"{_admin_base()}/users/{user_id}/role-mappings/realm",
            headers=headers,
            json=[role_repr],
        )
        _check_response(
            resp, action=f"Assign role '{args.role}' to user '{args.username}'"
        )

    log.info("Created user '%s' (id=%s)", args.username, user_id)
    log.info("  email:     %s", args.email)
    log.info("  tenant_id: %s", args.tenant_id)
    log.info("  role:      %s", args.role)
    log.info("  password:  changeme")


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    """Build the top-level CLI parser with subcommands."""
    parser = argparse.ArgumentParser(
        prog="kc-admin",
        description="Manage tenants, roles, and users in the Keycloak 'forest' realm.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # -- create-tenant -------------------------------------------------------
    p_tenant = sub.add_parser(
        "create-tenant",
        help="Create a new tenant (Keycloak client with login theme & tenant_id mapper)",
    )
    p_tenant.add_argument(
        "--tenant-id",
        required=True,
        help="Numeric tenant identifier (e.g. 3). Stored as user attribute.",
    )
    p_tenant.add_argument(
        "--slug",
        required=True,
        help="Short slug for the client ID suffix (e.g. 'acme2' → 'acme2-app').",
    )
    p_tenant.add_argument(
        "--name",
        required=True,
        help="Human-readable tenant display name (e.g. 'ACME Corp').",
    )
    p_tenant.add_argument(
        "--theme",
        required=True,
        help="Login theme name (must match a directory under keycloak/themes/).",
    )
    p_tenant.set_defaults(func=cmd_create_tenant)

    # -- create-role ---------------------------------------------------------
    p_role = sub.add_parser("create-role", help="Create a new realm role")
    p_role.add_argument(
        "--name",
        required=True,
        help="Role name (e.g. EDITOR, MANAGER).",
    )
    p_role.add_argument(
        "--description",
        default="",
        help="Human-readable role description.",
    )
    p_role.set_defaults(func=cmd_create_role)

    # -- create-user ---------------------------------------------------------
    p_user = sub.add_parser(
        "create-user",
        help="Create a new user with a role in a specific tenant (password: changeme)",
    )
    p_user.add_argument("--username", required=True, help="Login username.")
    p_user.add_argument("--email", required=True, help="Email address.")
    p_user.add_argument("--first", required=True, help="First name.")
    p_user.add_argument("--last", required=True, help="Last name.")
    p_user.add_argument(
        "--tenant-id",
        required=True,
        help="Tenant identifier (must match an existing tenant).",
    )
    p_user.add_argument(
        "--role",
        required=True,
        help="Realm role to assign (e.g. ADMIN, VIEWER, AUDITOR, SUBMITTER).",
    )
    p_user.set_defaults(func=cmd_create_user)

    return parser


def main() -> None:
    """Entry point — parse arguments and dispatch to the matching subcommand."""
    parser = _build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
