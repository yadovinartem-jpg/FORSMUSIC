#!/usr/bin/env bash
set -euo pipefail

# Resolve likely conflicts for FORSMUSIC PR branches.
# Usage: ./scripts/resolve_github_conflicts.sh [target-branch]
TARGET_BRANCH="${1:-main}"

current_branch="$(git branch --show-current)"

echo "Current branch: ${current_branch}"
echo "Target branch: ${TARGET_BRANCH}"

git fetch origin "${TARGET_BRANCH}"
git merge "origin/${TARGET_BRANCH}" || true

# If merge introduced conflicts, keep the current branch versions
# for the UI refresh files and lockfile from this branch.
if git diff --name-only --diff-filter=U | grep -q .; then
  echo "Conflicts detected. Applying resolution policy..."

  for file in \
    frontend/index.html \
    frontend/style.css \
    frontend/script.js \
    backend/package-lock.json \
    README.md
  do
    if git diff --name-only --diff-filter=U | grep -qx "$file"; then
      git checkout --ours "$file"
      git add "$file"
      echo "Resolved with ours: $file"
    fi
  done

  # Auto-stage any remaining files that merged cleanly.
  git add -A

  if git diff --cached --name-only | grep -q .; then
    git commit -m "Resolve GitHub merge conflicts with main"
    echo "Conflict resolution commit created."
  else
    echo "Nothing to commit after conflict resolution."
  fi
else
  echo "No conflicts found after merge."
fi
