"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSignedListingFeed,
  importSignedListingFeed,
  type SignedListingFeedV1,
} from "@sutrart/sdk";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/status-message";
import { formatPanelError } from "@/components/status-message";
import {
  loadMarketplaceFeedUrls,
  saveMarketplaceFeedUrls,
} from "@/lib/syndication";

export function FeedIngestionPanel({
  chainId,
  onFeedsChange,
}: {
  chainId: number;
  onFeedsChange: (feeds: SignedListingFeedV1[]) => void;
}) {
  const [feedUrls, setFeedUrls] = useState<string[]>([]);
  const [nextUrl, setNextUrl] = useState("");
  const [importJson, setImportJson] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFeedUrls(loadMarketplaceFeedUrls(chainId));
  }, [chainId]);

  const refreshRemoteFeeds = useCallback(
    async (urls: string[]) => {
      if (urls.length === 0) {
        onFeedsChange([]);
        setUrlErrors({});
        return;
      }

      setIsLoading(true);
      setError("");

      const feeds: SignedListingFeedV1[] = [];
      const errors: Record<string, string> = {};

      for (const url of urls) {
        try {
          feeds.push(await fetchSignedListingFeed(url));
        } catch (fetchError) {
          errors[url] = formatPanelError(fetchError, "Unable to fetch feed.");
        }
      }

      setUrlErrors(errors);
      onFeedsChange(feeds);

      if (feeds.length === 0 && urls.length > 0) {
        setError("No feeds could be loaded. Check URLs or import JSON manually.");
      } else {
        setStatus(`Loaded ${feeds.length} of ${urls.length} feed(s).`);
      }

      setIsLoading(false);
    },
    [onFeedsChange]
  );

  useEffect(() => {
    void refreshRemoteFeeds(feedUrls);
  }, [feedUrls, refreshRemoteFeeds]);

  function addFeedUrl() {
    const trimmed = nextUrl.trim();
    if (!trimmed) {
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setError("Feed URL must use http or https.");
        return;
      }
    } catch {
      setError("Enter a valid feed URL.");
      return;
    }

    const next = [...new Set([...feedUrls, trimmed])];
    setFeedUrls(next);
    saveMarketplaceFeedUrls(chainId, next);
    setNextUrl("");
    setError("");
    setStatus("Saved feed URL.");
  }

  function removeFeedUrl(url: string) {
    const next = feedUrls.filter((entry) => entry !== url);
    setFeedUrls(next);
    saveMarketplaceFeedUrls(chainId, next);
    setStatus("Removed feed URL.");
  }

  function importFeedJson() {
    try {
      const feed = importSignedListingFeed(JSON.parse(importJson));
      onFeedsChange([feed]);
      setImportJson("");
      setError("");
      setStatus("Imported feed JSON for discovery.");
    } catch (importError) {
      setError(formatPanelError(importError, "Unable to import feed JSON."));
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Syndicated feed ingestion</p>
        <p className="text-xs text-muted-foreground">
          Add portable creator feed URLs or import feed JSON for signed listing discovery.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[280px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="https://creator.site/sutrart-feed.json"
          value={nextUrl}
          onChange={(event) => setNextUrl(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={addFeedUrl}>
          Add feed URL
        </Button>
      </div>

      {feedUrls.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {feedUrls.map((url) => (
            <li key={url} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs">{url}</span>
                <button type="button" className="text-muted-foreground" onClick={() => removeFeedUrl(url)}>
                  Remove
                </button>
              </div>
              {urlErrors[url] ? (
                <p className="text-xs text-red-600">{urlErrors[url]}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No saved feed URLs for this chain.</p>
      )}

      {isLoading ? <p className="text-xs text-muted-foreground">Loading remote feeds...</p> : null}

      <textarea
        className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Paste feed JSON to import manually"
        value={importJson}
        onChange={(event) => setImportJson(event.target.value)}
      />
      <Button type="button" variant="outline" disabled={!importJson} onClick={importFeedJson}>
        Import feed JSON
      </Button>

      <StatusMessage message={status} error={error} />
    </section>
  );
}
