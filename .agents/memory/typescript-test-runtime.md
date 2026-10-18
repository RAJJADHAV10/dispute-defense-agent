---
name: TypeScript API test runtime
description: Constraints encountered when running API TypeScript tests without a project-aware test runner.
---

Use a workspace-aware TypeScript/ESM test runner or test compiled output; do not assume Node's strip-only TypeScript runtime can import API source directly.

**Why:** In this environment, Node 24.13 rejects TypeScript constructor parameter properties, API route imports can resolve workspace packages to extensionless TypeScript exports, and bundling Express into ESM can fail on dynamic CommonJS requires for Node built-ins.

**How to apply:** For Express API unit tests or one-off harnesses, use a configured runner that supports workspace resolution, or test the compiled server output with a compatible module format.
