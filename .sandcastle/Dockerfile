FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/* \
  && curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Install Playwright's OS-level dependencies (libnss3, fonts, etc.) as root.
# These apt packages are version-independent; the version-pinned browser binary
# itself is downloaded at runtime by the non-root agent (see .sandcastle/main.ts).
# Pinned to match @playwright/test in package.json.
RUN npx -y playwright@1.60.0 install-deps chromium \
  && rm -rf /var/lib/apt/lists/*

# Build-args for UID/GID alignment: sandcastle docker build-image
# defaults these to the host user's UID/GID so image-built files
# and bind-mounted files share an owner without runtime chown.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Rename the base image's "node" user to "agent" and align UID/GID.
RUN groupmod -o -g $AGENT_GID node && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
USER ${AGENT_UID}:${AGENT_GID}

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/agent/.bun/bin:$PATH"

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude to PATH
ENV PATH="/home/agent/.local/bin:$PATH"

# Warm the Bun install cache at /home/agent/.bun/install/cache by installing
# dependencies once in a scratch directory. The bind-mounted worktree at
# /home/agent/workspace overlays anything at that path at runtime, so we
# populate the *cache* (which lives outside the mount) rather than a bakeable
# node_modules. `bun install` in the hook then hydrates from the local cache,
# eliminating network flakes like lightningcss tarball extraction failures.
# Files staged into .sandcastle/ by `just sandcastle-build`; see justfile.
# Rebuild the image after any change to package.json or bun.lock.
RUN mkdir -p /home/agent/warmup
COPY --chown=agent:agent package.json bun.lock /home/agent/warmup/
RUN cd /home/agent/warmup && bun install && rm -rf node_modules

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
