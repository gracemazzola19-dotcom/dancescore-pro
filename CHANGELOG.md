# Changelog

All notable changes to DanceScore Pro will be documented in this file.

## [Unreleased]

### Added
- Email verification (2FA) for all login types
- Security Settings UI in Admin Dashboard
- Multi-tenant organization support
- Landing page with Login/Sign-up options
- Organization sign-up flow
- Public landing page
- Email service configuration
- Security audit scripts
- Deployment testing scripts

### Changed
- Login flow restructured with role selection (Dancer, E-board, Admin)
- Landing page now generic (no organization-specific branding)
- Settings structure updated for security settings

### Security
- Strong JWT secret generated
- `.gitignore` configured for sensitive files
- SMTP credentials secured
- Email verification enabled for all logins

## [Version History]

### 2024-01-10
- Initial deployment preparation
- Security audit completed
- Email verification system implemented
- Multi-tenant architecture completed

---

## How to Update This Changelog

When making changes:

1. Add entry under `[Unreleased]`
2. Use format: `- Description of change`
3. Group by type: Added, Changed, Fixed, Security, etc.
4. When releasing, move to dated section
