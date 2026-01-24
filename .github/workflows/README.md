# CI/CD Workflow Documentation

This directory contains the GitHub Actions workflows for the **Authify** project. This document explains the strategy used for dependency installation and network reliability.

## Dependency Installation Strategy

The workflows use a robust approach to install dependencies, designed to handle transient network issues and ensure consistency.

### Command
The installation step in our workflows (`test-runner.yml`, `build-verification.yml`) runs:

```bash
npm ci || npm install
```

### Explanation of Terms

#### 1. `npm ci` (Clean Install)
*   **Purpose**: The primary command for automated environments (Continuous Integration).
*   **Behavior**: 
    *   Deletes `node_modules` to ensure a clean slate.
    *   Installs dependencies exactly as specified in `package-lock.json`.
    *   **Strict**: It fails if `package-lock.json` is missing or disagrees with `package.json`.
*   **Why we use it**: It guarantees that the tested code uses the exact same versions as the lockfile, preventing "it works on my machine" issues.

#### 2. `npm install` (Fallback)
*   **Purpose**: Used here as a fallback mechanism.
*   **Behavior**: 
    *   Attempts to resolve dependencies and install them.
    *   Can update `package-lock.json` if needed (though in CI we typically want to avoid this, it allows the build to proceed if `npm ci` is being too strict or flaky).
*   **Why we use it as fallback**: If `npm ci` fails (e.g., due to a temporary network glitch or a lockfile sync issue), `npm install` provides a second chance to set up the environment without immediately failing the entire build.

### Network Reliability (.npmrc)

To further reduce failures caused by network timeouts (e.g., `ECONNRESET`), we have added a `.npmrc` file in the project root. This file configures `npm` to be more patient and persistent when fetching packages.

**Key Settings:**
*   `fetch-retries=5`: Retries failed requests up to 5 times.
*   `fetch-retry-factor=2`: Wait time doubles between retries.
*   `fetch-retry-mintimeout=10000` (10s): Minimum wait time.
*   `fetch-retry-maxtimeout=60000` (60s): Maximum wait time.

These settings combined with the fall-back command significantly reduce "flaky" build failures related to npm registry connectivity.
