import localDeployments from "./deployments/local.json";

export type LocalDeployment = {
  chainId: number;
  MockERC721: `0x${string}`;
  SutrartMarket: `0x${string}`;
};

export const localDeployment = localDeployments as LocalDeployment;

export function getDeployments(chainId: number): LocalDeployment | null {
  if (chainId === localDeployment.chainId) {
    return localDeployment;
  }

  return null;
}

export function getContractAddress(
  chainId: number,
  contract: keyof Omit<LocalDeployment, "chainId">
): `0x${string}` | null {
  const deployments = getDeployments(chainId);
  if (!deployments) {
    return null;
  }

  const address = deployments[contract];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  return address;
}
