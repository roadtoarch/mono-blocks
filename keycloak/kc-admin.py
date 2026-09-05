#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "httpx>=0.28",
#     "typer>=0.15",
# ]
# ///
"""Keycloak admin CLI for managing tenants, roles, and users in the *forest* realm.

Run with::

    uv run keycloak/kc-admin.py create-tenant  --tenant-id 3 --slug acme2 --name "Acme II" --theme acme
    uv run keycloak/kc-admin.py create-role    --name EDITOR --description "Can edit data within a tenant"
    uv run keycloak/kc-admin.py create-user    --username zara --email zara@example.test \
                           --first Zara --last Zane --tenant-id 3 --role EDITOR

With a documentation file, pass --docs to automatically record the new entry::

    uv run keycloak/kc-admin.py create-tenant --tenant-id 3 --slug acme2 --name "Acme II" --theme acme \
                           --docs development/Realm-Info.md

With --docs the *Realm-Info.md* file is updated as follows:

- Tenants are appended to the ``## Tenants`` table.
- A ``### Users for <name> (Tenant <id>)`` section (with an empty user
  table) is created for the new tenant so that subsequent create-user
  --docs calls can append rows to the correct per-tenant table.
- Roles are appended to the ``## Roles`` table.
- Users are appended into the ``### Users for ... (Tenant <id>)`` table
  matching the supplied --tenant-id.

Environment variables (all have sensible defaults matching docker-compose.yml):

    KEYCLOAK_URL          Base URL          (default: http://localhost:8081)
    KEYCLOAK_REALM        Realm name        (default: forest)
    KEYCLOAK_ADMIN_CLI_ID Admin client ID   (default: backend-admin)
    KEYCLOAK_ADMIN_CLI_SECRET  Client secret (default: changeme)
"""

from __future__ import annotations

import logging
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any

import httpx
import typer

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
# CLI app
# ---------------------------------------------------------------------------

app = typer.Typer(
    help="Manage tenants, roles, and users in the Keycloak 'forest' realm.",
    add_completion=False,
    no_args_is_help=True,
)

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


def _update_docs(docs_path: str, *, entity: str, **details: str) -> None:
    """Append a row describing the newly created entity to the markdown file.

    Args:
        docs_path: Path to the Realm-Info.md file.
        entity: One of ``"tenant"``, ``"role"``, ``"user"``.
        **details: Entity-specific fields (see body).
    """
    path = Path(docs_path)
    text = path.read_text()

    if entity == "tenant":
        row = (
            f"| {details['name']} | "
            f"http://{details['slug']}.localhost:5173 | "
            f"{details['theme']} | [ ] |"
        )
        text = _append_to_table(text, "Tenant", row)
        # Ensure a per-tenant user table exists so future create-user
        # --docs calls have a place to append.
        text = _ensure_tenant_users_section(
            text, tenant_id=details["tenant_id"], name=details["name"]
        )
    elif entity == "role":
        row = f"| {details['name']} | {details['description']} |"
        text = _append_to_table(text, "Role Name", row)
    elif entity == "user":
        row = (
            f"| {details['first']} | {details['last']} | "
            f"{details['email']} | {details['username']} | {details['roles']} |"
        )
        text = _append_user_to_tenant_section(
            text, tenant_id=details["tenant_id"], row=row
        )
    else:
        log.warning("Unknown entity type %r — skipping docs update", entity)
        return

    path.write_text(text)
    log.info(
        "Updated documentation at %s with %s %s", path, entity, details.get("name", "")
    )


# ---------------------------------------------------------------------------
# Markdown table helpers
# ---------------------------------------------------------------------------

_SEPARATOR_RE = re.compile(r"^\|[\s\-|]+\|$")


def _is_separator(line: str) -> bool:
    r"""Return True if *line* is a markdown table separator row (e.g. \| --- |)."""
    return bool(_SEPARATOR_RE.match(line))


def _is_empty_row(line: str) -> bool:
    """Return True if *line* is a pipe table row whose cells are all blank."""
    cells = [c.strip() for c in line.strip("|").split("|")]
    return all(cell == "" for cell in cells)


# ---------------------------------------------------------------------------
# Per-tenant user table helpers
# ---------------------------------------------------------------------------

_USER_SECTION_RE = re.compile(r"^### Users for .* \(Tenant (\d+)\)$", re.MULTILINE)
_USER_HEADER = "| First name | Last name | Email | Login | Roles |"
_USER_SEPARATOR = "| --- | --- | --- | --- | --- |"


def _insert_data_row(lines: list[str], header_idx: int, row: str) -> None:
    """Insert *row* into the table whose header line is at *header_idx*.

    Walks past the separator row(s), then past existing data rows, and
    inserts *row* after the last data row.  If the last data row is a
    blank placeholder it is replaced instead of duplicated.
    """
    i = header_idx + 1
    while i < len(lines) and _is_separator(lines[i]):
        i += 1

    if i >= len(lines):
        lines.insert(i, row)
        return

    j = i
    while j < len(lines) and lines[j].startswith("|"):
        j += 1

    last_data_idx = j - 1
    if last_data_idx >= i and _is_empty_row(lines[last_data_idx]):
        lines[last_data_idx] = row
    else:
        lines.insert(j, row)


def _append_to_table(text: str, header_snippet: str, row: str) -> str:
    """Append *row* to the markdown table whose header line contains *header_snippet*.

    The row is inserted immediately after the last existing data row of that
    table.  If the last data row is blank/empty (a placeholder), it is replaced
    rather than duplicated.
    """
    lines = text.split("\n")

    # Locate the header line.
    header_idx: int | None = None
    for i, line in enumerate(lines):
        if line.startswith("|") and header_snippet in line:
            header_idx = i
            break

    if header_idx is None:
        log.warning(
            "Table with header %r not found in %s — appending at end",
            header_snippet,
            text[:80],
        )
        lines.append(row)
        return "\n".join(lines)

    _insert_data_row(lines, header_idx, row)
    return "\n".join(lines)


def _ensure_tenant_users_section(text: str, *, tenant_id: str, name: str) -> str:
    """Ensure a ``### Users for <name> (Tenant <id>)`` section exists.

    If the section is already present the file is returned unchanged.  Otherwise
    an empty user table for the tenant is inserted right before the first
    ``## `` heading that follows the ``## Tenants`` section.
    """
    for line in text.split("\n"):
        m = _USER_SECTION_RE.match(line)
        if m and m.group(1) == tenant_id:
            return text

    block_lines = [
        "",
        f"### Users for {name} (Tenant {tenant_id})",
        "",
        "Here is a list of all the users for this particular tenant",
        "",
        _USER_HEADER,
        _USER_SEPARATOR,
    ]

    lines = text.split("\n")
    # Find the first "## " heading after "## Tenants".
    tenants_idx: int | None = None
    for i, line in enumerate(lines):
        if line == "## Tenants":
            tenants_idx = i
            break

    if tenants_idx is not None:
        for i in range(tenants_idx + 1, len(lines)):
            if lines[i].startswith("## "):
                # Find the start of the blank lines that precede this
                # heading, and insert the block right after the last
                # non-blank line.  This preserves the original two blank
                # lines between the preceding table and the heading.
                j = i - 1
                while j >= 0 and lines[j] == "":
                    j -= 1
                lines[j + 1 : j + 1] = block_lines
                return "\n".join(lines)

    # No following "## " heading found — append at the end.
    lines.append("")
    lines.extend(block_lines)
    return "\n".join(lines)


def _append_user_to_tenant_section(text: str, *, tenant_id: str, row: str) -> str:
    """Append *row* to the user table under ``### Users for ... (Tenant <id>)``.

    Falls back to the first ``First name`` table in the file with a warning if
    no matching tenant section is found.
    """
    lines = text.split("\n")

    for i, line in enumerate(lines):
        m = _USER_SECTION_RE.match(line)
        if m and m.group(1) == tenant_id:
            # Find the first table header (a "|"-line containing "First name")
            # that appears after this heading.
            for j in range(i + 1, len(lines)):
                if lines[j].startswith("|") and "First name" in lines[j]:
                    _insert_data_row(lines, j, row)
                    return "\n".join(lines)
            # Heading exists but has no table yet — create one right after
            # the heading line.
            header_lines = [_USER_HEADER, _USER_SEPARATOR, row]
            # Skip past any prose lines (non-"|", non-empty) between the
            # heading and where the table should start.
            insert_at = i + 1
            while (
                insert_at < len(lines)
                and lines[insert_at] != ""
                and not lines[insert_at].startswith("|")
            ):
                insert_at += 1
            # Ensure a blank line separates the heading from the table.
            if insert_at < len(lines) and lines[insert_at - 1] != "":
                lines.insert(insert_at, "")
                insert_at += 1
            for k, hl in enumerate(header_lines):
                lines.insert(insert_at + k, hl)
            return "\n".join(lines)

    log.warning(
        "No 'Users for ... (Tenant %s)' section found — appending to first users table",
        tenant_id,
    )
    return _append_to_table(text, "First name", row)


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


@app.command("create-tenant")
def create_tenant(
    tenant_id: str = typer.Argument(..., help="Numeric tenant identifier (e.g. 3)."),
    slug: str = typer.Argument(
        ..., help="Short slug for the client ID suffix (e.g. 'acme2')."
    ),
    name: str = typer.Argument(..., help="Human-readable tenant display name."),
    theme: str = typer.Argument(
        ..., help="Login theme name (must match a directory under keycloak/themes/)."
    ),
    docs: str | None = typer.Option(
        None, "--docs", help="Path to Realm-Info.md to record the new tenant."
    ),
) -> None:
    """Create a new tenant (Keycloak client with login theme & tenant_id mapper)."""
    payload = _build_tenant_client(
        tenant_id=tenant_id,
        slug=slug,
        display_name=name,
        theme=theme,
    )

    with httpx.Client(timeout=30) as client:
        token = _get_admin_token(client)
        resp = client.post(
            f"{_admin_base()}/clients",
            headers=_auth_headers(token),
            json=payload,
        )

    _check_response(resp, action=f"Create tenant client '{payload['clientId']}'")
    location = resp.headers.get("Location", "unknown")
    log.info("Created tenant client '%s'  →  %s", payload["clientId"], location)
    log.info("tenant_id value: %s", tenant_id)
    log.info("login_theme:     %s", theme)

    if docs:
        _update_docs(
            docs,
            entity="tenant",
            name=name,
            slug=slug,
            theme=theme,
            tenant_id=tenant_id,
        )


@app.command("create-role")
def create_role(
    name: str = typer.Argument(..., help="Role name (e.g. EDITOR, MANAGER)."),
    description: str = typer.Option(
        "", "--description", help="Human-readable role description."
    ),
    docs: str | None = typer.Option(
        None, "--docs", help="Path to Realm-Info.md to record the new role."
    ),
) -> None:
    """Create a new realm role."""
    payload: dict[str, Any] = {
        "name": name,
        "description": description,
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

    _check_response(resp, action=f"Create role '{name}'")
    log.info("Created realm role '%s' — %s", name, description)

    if docs:
        _update_docs(docs, entity="role", name=name, description=description)


@app.command("create-user")
def create_user(
    username: str = typer.Argument(..., help="Login username."),
    email: str = typer.Argument(..., help="Email address."),
    first: str = typer.Argument(..., help="First name."),
    last: str = typer.Argument(..., help="Last name."),
    tenant_id: str = typer.Argument(
        ..., help="Tenant identifier (must match an existing tenant)."
    ),
    role: str = typer.Argument(
        ..., help="Realm role to assign (e.g. ADMIN, VIEWER, AUDITOR, SUBMITTER)."
    ),
    docs: str | None = typer.Option(
        None, "--docs", help="Path to Realm-Info.md to record the new user."
    ),
) -> None:
    """Create a new user with a role in a specific tenant (password: changeme)."""
    user_payload: dict[str, Any] = {
        "username": username,
        "email": email,
        "emailVerified": True,
        "enabled": True,
        "firstName": first,
        "lastName": last,
        "attributes": {"tenant_id": [tenant_id]},
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
        _check_response(resp, action=f"Create user '{username}'")

        # Extract user ID from Location header.
        location = resp.headers.get("Location", "")
        user_id = location.rsplit("/", 1)[-1] if location else ""
        if not user_id:
            log.error("Could not extract user ID from Location header: %s", location)
            sys.exit(1)

        # 2. Resolve the role ID by name.
        resp = client.get(
            f"{_admin_base()}/roles/{role}",
            headers=headers,
        )
        _check_response(resp, action=f"Look up role '{role}'")
        role_repr = resp.json()

        # 3. Assign the realm role to the user.
        resp = client.post(
            f"{_admin_base()}/users/{user_id}/role-mappings/realm",
            headers=headers,
            json=[role_repr],
        )
        _check_response(resp, action=f"Assign role '{role}' to user '{username}'")

    log.info("Created user '%s' (id=%s)", username, user_id)
    log.info("  email:     %s", email)
    log.info("  tenant_id: %s", tenant_id)
    log.info("  role:      %s", role)
    log.info("  password:  changeme")

    if docs:
        _update_docs(
            docs,
            entity="user",
            first=first,
            last=last,
            email=email,
            username=username,
            roles=role,
            tenant_id=tenant_id,
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app()
