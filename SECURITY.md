# Security policy

## Reporting a vulnerability

Do not disclose an unpatched vulnerability in a public issue. Use GitHub's private
[security advisory form](https://github.com/alanslzrr/aesthc-diagram-lib/security/advisories/new)
when available, or email **alansalazarfg2@gmail.com**. Maintainer: **@alanslzrr**.

Include the affected version, a minimal reproduction, impact and proposed
mitigation. Remove credentials and private diagram data. We will acknowledge and
investigate as availability permits; this volunteer project does not offer an SLA.

## Supported versions

Security fixes target the latest published minor line. During preparation of
0.3.0, report issues found in 0.2.x as well; fixes may require upgrading. Unreleased
`main` is not a supported substitute for a verified release.

## Trust boundaries

Specs and shared links are untrusted data. The playground parses JSON, validates
structure and references, and limits encoded/expanded payloads. Shared links are
not encrypted. Do not include secrets. The low-level layout/registry APIs accept
typed application data; validate external input with the validation entrypoint.

The gallery writer exists only in the local development server. Do not expose
that server to the public internet. Package installation must not require scripts
that download or execute diagram content.
