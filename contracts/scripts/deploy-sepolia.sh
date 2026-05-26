#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SEPOLIA_RPC_URL:-}" ]]; then
  echo "SEPOLIA_RPC_URL is not set. Configure it in .env before deploying to Sepolia."
  exit 1
fi

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "DEPLOYER_PRIVATE_KEY is not set. Configure it in .env before deploying to Sepolia."
  exit 1
fi

export GIT_COMMIT="${GIT_COMMIT:-$(git -C "$(dirname "$0")/../.." rev-parse HEAD)}"

echo "Deploying Sutrart Diamond to Sepolia..."
echo "Git commit: ${GIT_COMMIT}"

forge script script/DeploySepolia.s.sol:DeploySepolia \
  --rpc-url "${SEPOLIA_RPC_URL}" \
  --broadcast \
  --private-key "${DEPLOYER_PRIVATE_KEY}" \
  -vvv

echo "Deployment manifest written to packages/shared/src/deployments/sepolia.json"
