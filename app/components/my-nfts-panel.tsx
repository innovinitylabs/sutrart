"use client";

import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { abis, getOwnedTokenIds, isApprovedForMarket } from "@pari/sdk";
import { Button } from "@/components/ui/button";
import { useContractAddresses } from "@/lib/contracts";

type OwnedNft = {
  tokenId: bigint;
  approved: boolean;
};

export function MyNftsPanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { nftAddress, marketAddress } = useContractAddresses();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [ownedNfts, setOwnedNfts] = useState<OwnedNft[]>([]);
  const [priceByToken, setPriceByToken] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>("");

  const refreshOwnedNfts = useCallback(async () => {
    if (!publicClient || !address || !nftAddress || !marketAddress) {
      setOwnedNfts([]);
      return;
    }

    const tokenIds = await getOwnedTokenIds(publicClient, nftAddress, address);
    const nextOwned = await Promise.all(
      tokenIds.map(async (tokenId) => ({
        tokenId,
        approved: await isApprovedForMarket(
          publicClient,
          nftAddress,
          marketAddress,
          address,
          tokenId
        ),
      }))
    );

    setOwnedNfts(nextOwned);
  }, [address, marketAddress, nftAddress, publicClient]);

  useEffect(() => {
    void refreshOwnedNfts();
  }, [refreshOwnedNfts, isSuccess]);

  const isBusy = isPending || isConfirming;

  function mintNft() {
    if (!nftAddress) {
      setStatus("Deploy contracts locally first.");
      return;
    }

    writeContract({
      address: nftAddress,
      abi: abis.MockERC721,
      functionName: "mint",
      args: [address!],
    });
    setStatus("Minting NFT...");
  }

  function approveNft(tokenId: bigint) {
    if (!nftAddress || !marketAddress) {
      return;
    }

    writeContract({
      address: nftAddress,
      abi: abis.MockERC721,
      functionName: "approve",
      args: [marketAddress, tokenId],
    });
    setStatus(`Approving token #${tokenId.toString()}...`);
  }

  function listNft(tokenId: bigint) {
    if (!nftAddress || !marketAddress) {
      return;
    }

    const price = priceByToken[tokenId.toString()] ?? "0.01";
    writeContract({
      address: marketAddress,
      abi: abis.PariMarket,
      functionName: "listNFT",
      args: [nftAddress, tokenId, parseEther(price)],
    });
    setStatus(`Listing token #${tokenId.toString()} for ${price} ETH...`);
  }

  if (!isConnected) {
    return <p className="text-muted-foreground text-sm">Connect your wallet to manage NFTs.</p>;
  }

  if (!nftAddress || !marketAddress) {
    return (
      <p className="text-muted-foreground text-sm">
        Local contract addresses are missing. Run `pnpm contracts:anvil` and `pnpm
        contracts:deploy:local`.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button type="button" onClick={mintNft} disabled={isBusy}>
          Mint test NFT
        </Button>
        <p className="text-muted-foreground text-xs">NFT: {nftAddress}</p>
        <p className="text-muted-foreground text-xs">Market: {marketAddress}</p>
        {status ? <p className="text-sm">{status}</p> : null}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Owned NFTs</h2>
        {ownedNfts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No NFTs owned yet.</p>
        ) : (
          ownedNfts.map((nft) => (
            <div
              key={nft.tokenId.toString()}
              className="border-border space-y-3 rounded-lg border p-4"
            >
              <p className="font-mono text-sm">Token #{nft.tokenId.toString()}</p>
              <p className="text-muted-foreground text-sm">
                Approved for market: {nft.approved ? "yes" : "no"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy || nft.approved}
                  onClick={() => approveNft(nft.tokenId)}
                >
                  Approve marketplace
                </Button>
                <input
                  className="border-border bg-background rounded-md border px-3 py-2 text-sm"
                  placeholder="Price in ETH"
                  value={priceByToken[nft.tokenId.toString()] ?? "0.01"}
                  onChange={(event) =>
                    setPriceByToken((current) => ({
                      ...current,
                      [nft.tokenId.toString()]: event.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  disabled={isBusy || !nft.approved}
                  onClick={() => listNft(nft.tokenId)}
                >
                  List NFT
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
