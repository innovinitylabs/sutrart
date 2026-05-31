import Link from "next/link";
import {
  buildCollectionStorefrontPath,
  type CollectionStorefrontSummary,
  type NormalizedCollectionMetadata,
} from "@pari/sdk";

export function CollectionGrid({
  collections,
}: {
  collections: Array<
    | CollectionStorefrontSummary
    | {
        address: `0x${string}`;
        metadata: NormalizedCollectionMetadata;
        tokenCount?: number;
        listedCount?: number;
      }
  >;
}) {
  if (collections.length === 0) {
    return <p className="text-sm text-muted-foreground">No collections found.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {collections.map((collection) => (
        <Link
          key={collection.address}
          href={buildCollectionStorefrontPath(collection.address)}
          className="space-y-2 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
        >
          {collection.metadata.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.metadata.image}
              alt={collection.metadata.name}
              className="h-32 w-full rounded-md object-cover"
            />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
              No collection image
            </div>
          )}
          <div className="space-y-1">
            <p className="font-medium">{collection.metadata.name}</p>
            <p className="text-xs text-muted-foreground">{collection.metadata.symbol}</p>
            {"tokenCount" in collection && collection.tokenCount !== undefined ? (
              <p className="text-xs text-muted-foreground">
                {collection.tokenCount} tokens
                {"listedCount" in collection && collection.listedCount !== undefined
                  ? ` · ${collection.listedCount} listed`
                  : ""}
              </p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
