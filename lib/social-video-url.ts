const SOCIAL_VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.watch",
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

export function isSocialVideoPostUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !SOCIAL_VIDEO_HOSTS.has(url.hostname.toLowerCase())
    ) {
      return false;
    }

    const path = url.pathname;
    const host = url.hostname.toLowerCase();

    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      return (
        (path === "/watch" && Boolean(url.searchParams.get("v"))) ||
        /^\/(shorts|live)\/[A-Za-z0-9_-]+\/?$/.test(path)
      );
    }
    if (host === "youtu.be" || host === "www.youtu.be") {
      return /^\/[A-Za-z0-9_-]+\/?$/.test(path);
    }
    if (host === "vm.tiktok.com" || host === "fb.watch") {
      return path.length > 1;
    }
    if (host === "tiktok.com" || host === "www.tiktok.com") {
      return /^\/@[^/]+\/video\/\d+\/?$/.test(path);
    }
    if (host === "instagram.com" || host === "www.instagram.com") {
      return /^\/(reel|reels|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(path);
    }
    if (host.includes("facebook.com")) {
      return (
        /^\/(reel|reels|watch|videos|share\/v|share\/r)(\/|$)/.test(path) ||
        (path === "/watch" && Boolean(url.searchParams.get("v")))
      );
    }
    if (
      host === "x.com" ||
      host === "www.x.com" ||
      host === "twitter.com" ||
      host === "www.twitter.com"
    ) {
      return /^\/[^/]+\/status\/\d+\/?$/.test(path);
    }

    return false;
  } catch {
    return false;
  }
}
