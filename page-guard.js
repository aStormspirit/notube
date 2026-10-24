(() => {
  const FLAG_KEY = "yt-home-blocker";

  function isHomePath() {
    const path = location.pathname;
    return path === "/" || path === "" || path === "/feed/what_to_watch";
  }

  function isBlocking() {
    try {
      if (sessionStorage.getItem(FLAG_KEY) === "1") {
        return isHomePath();
      }
    } catch {
      /* ignore */
    }
    return (
      document.documentElement.classList.contains("yt-home-blocker-active") &&
      isHomePath()
    );
  }

  function isFeedUrl(url) {
    const value = String(url);
    return (
      value.includes("/youtubei/v1/browse") ||
      value.includes("/youtubei/v1/next") ||
      value.includes("/youtubei/v1/reel/reel_item_watch") ||
      value.includes("/youtubei/v1/reel/reel_watch_sequence")
    );
  }

  function emptyFeedResponse(url) {
    const body = String(url).includes("/youtubei/v1/next")
      ? { responseContext: {}, onResponseReceivedEndpoints: [], onResponseReceivedActions: [] }
      : {
          responseContext: {},
          contents: {
            twoColumnBrowseResultsRenderer: {
              tabs: [
                {
                  tabRenderer: {
                    content: {
                      richGridRenderer: {
                        contents: [],
                      },
                    },
                  },
                },
              ],
            },
          },
        };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  function stripHomeFeed(data) {
    if (!data || typeof data !== "object") {
      return data;
    }

    try {
      const clone = structuredClone(data);
      const tab =
        clone.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content;

      if (tab?.richGridRenderer) {
        tab.richGridRenderer.contents = [];
      }

      if (clone.contents?.twoColumnBrowseResultsRenderer?.tabs) {
        for (const entry of clone.contents.twoColumnBrowseResultsRenderer.tabs) {
          const grid = entry?.tabRenderer?.content?.richGridRenderer;
          if (grid) {
            grid.contents = [];
          }
        }
      }

      return clone;
    } catch {
      return data;
    }
  }

  let ytInitialDataValue;
  let strippedCache;

  Object.defineProperty(window, "ytInitialData", {
    configurable: true,
    enumerable: true,
    get() {
      if (isBlocking()) {
        if (!strippedCache && ytInitialDataValue) {
          strippedCache = stripHomeFeed(ytInitialDataValue);
        }
        return strippedCache ?? ytInitialDataValue;
      }
      return ytInitialDataValue;
    },
    set(value) {
      ytInitialDataValue = value;
      strippedCache = isBlocking() ? stripHomeFeed(value) : undefined;
    },
  });

  function notifyNavigation() {
    window.dispatchEvent(new CustomEvent("yt-home-blocker-nav"));
  }

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function patchedPushState() {
    const result = originalPushState.apply(this, arguments);
    notifyNavigation();
    return result;
  };

  history.replaceState = function patchedReplaceState() {
    const result = originalReplaceState.apply(this, arguments);
    notifyNavigation();
    return result;
  };

  window.addEventListener("popstate", notifyNavigation);

  const originalFetch = window.fetch;
  window.fetch = function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url;
    if (isBlocking() && url && isFeedUrl(url)) {
      return Promise.resolve(emptyFeedResponse(url));
    }
    return originalFetch.apply(this, arguments);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
    this.__ytHomeBlockerUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function patchedSend() {
    if (isBlocking() && this.__ytHomeBlockerUrl && isFeedUrl(this.__ytHomeBlockerUrl)) {
      Object.defineProperty(this, "responseText", {
        configurable: true,
        get: () =>
          JSON.stringify({
            responseContext: {},
            contents: {
              twoColumnBrowseResultsRenderer: {
                tabs: [{ tabRenderer: { content: { richGridRenderer: { contents: [] } } } }],
              },
            },
          }),
      });
      Object.defineProperty(this, "status", { configurable: true, get: () => 200 });
      Object.defineProperty(this, "readyState", { configurable: true, get: () => 4 });
      setTimeout(() => {
        this.dispatchEvent(new Event("readystatechange"));
        this.dispatchEvent(new Event("load"));
      }, 0);
      return;
    }
    return originalSend.apply(this, arguments);
  };
})();
