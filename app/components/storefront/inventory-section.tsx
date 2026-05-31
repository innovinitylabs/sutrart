import Link from "next/link";
import { formatEther } from "viem";
import {
  buildCollectionStorefrontPath,
  buildOnchainListingPath,
  buildSignedListingPath,
  type StorefrontToken,
} from "@pari/sdk";

export function StorefrontInventorySection({
  title,
  description,
  tokens,
  emptyMessage,
}: {
  title: string;
  description?: string;
  tokens: StorefrontToken[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4">
          {tokens.map((token) => {
            const listingHref =
              token.listing?.kind === "onchain"
                ? buildOnchainListingPath(token.listing.listingId)
                : token.listing?.kind === "signed"
                  ? buildSignedListingPath(token.listing.structHash)
                  : null;

            return (
              <div
                key={`${token.collection}-${token.tokenId.toString()}`}
                className="space-y-2 rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm">
                    Token #{token.tokenId.toString()}
                  </p>
                  {token.listingKind ? (
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {token.listingKind}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Collection:{" "}
                  <Link
                    href={buildCollectionStorefrontPath(token.collection)}
                    className="font-mono underline-offset-4 hover:underline"
                  >
                    {token.collection}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">Owner: {token.owner}</p>
                {token.price !== null ? (
                  <p className="text-sm">Listed for {formatEther(token.price)} ETH</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not listed</p>
                )}
                {token.listingSource ? (
                  <p className="text-xs text-muted-foreground">Source: {token.listingSource}</p>
                ) : null}
                {listingHref ? (
                  <Link href={listingHref} className="inline-block text-sm underline-offset-4 hover:underline">
                    View canonical listing
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
