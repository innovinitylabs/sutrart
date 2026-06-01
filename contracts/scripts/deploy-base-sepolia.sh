#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRACTS_DIR="$(dirname "$0")/.."
MANIFEST_PATH="${ROOT_DIR}/packages/shared/src/deployments/base-sepolia.json"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

if [[ -z "${BASE_SEPOLIA_RPC_URL:-}" ]]; then
  echo "BASE_SEPOLIA_RPC_URL is not set. Configure it in .env before deploying to Base Sepolia."
  exit 1
fi

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "DEPLOYER_PRIVATE_KEY is not set. Configure it in .env before deploying to Base Sepolia."
  exit 1
fi

export GIT_COMMIT="${GIT_COMMIT:-$(git -C "${ROOT_DIR}" rev-parse HEAD)}"

echo "Deploying PARI Diamond to Base Sepolia..."
echo "Git commit: ${GIT_COMMIT}"
echo "Protocol version: v0.1-alpha"

cd "${CONTRACTS_DIR}"

forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --rpc-url "${BASE_SEPOLIA_RPC_URL}" \
  --broadcast \
  --private-key "${DEPLOYER_PRIVATE_KEY}" \
  -vvv

echo "Validating deployment manifest..."
node "${ROOT_DIR}/scripts/validate-deployment-manifest.mjs" "${MANIFEST_PATH}"

echo "Base Sepolia deployment complete."
echo "Manifest: ${MANIFEST_PATH}"
echo "Next: set NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532 in app/.env.local for Base Sepolia testing."
