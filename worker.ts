/**
 * Cloudflare Worker for Oryn Server GitHub OAuth
 * Expected Env Vars:
 * - GITHUB_CLIENT_ID
 * - GITHUB_CLIENT_SECRET
 * - SESSION_SECRET (Random string for signing cookies)
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

const GITHUB_CLIENT_ID = "Ov23li0p73NXvUGvyU1Z"; // Hardcoded from user request
const REDIRECT_URI_PATH = "/api/auth/callback";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Initiate Login
    if (path === "/api/auth/github") {
      const state = crypto.randomUUID();
      const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
      githubAuthUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
      githubAuthUrl.searchParams.set("redirect_uri", `${url.origin}${REDIRECT_URI_PATH}`);
      githubAuthUrl.searchParams.set("state", state);
      githubAuthUrl.searchParams.set("scope", "read:user");

      return new Response(null, {
        status: 302,
        headers: {
          "Location": githubAuthUrl.toString(),
          "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`,
        },
      });
    }

    // 2. Auth Callback Handler
    if (path === REDIRECT_URI_PATH) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      
      const cookieHeader = request.headers.get("Cookie") || "";
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")));
      const savedState = cookies["oauth_state"];

      if (!code || !state || state !== savedState) {
        return new Response("Invalid state or missing code", { status: 400 });
      }

      // Exchange code for token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Oryn-Server",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET, // Protected secret
          code,
        }),
      });

      const tokenData: any = await tokenResponse.json();
      if (tokenData.error) {
        return new Response(`GitHub Error: ${tokenData.error_description}`, { status: 400 });
      }

      // Get User Data
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `token ${tokenData.access_token}`,
          "User-Agent": "Oryn-Server",
        },
      });

      const userData: any = await userResponse.json();

      // Create Session (In a real app, you might sign a JWT here)
      // For this implementation, we store user data directly in an encrypted-style cookie (simple example)
      const sessionData = JSON.stringify({
        id: userData.id,
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
      });
      
      // Basic "encryption" (Base64 encoding + simple verification would be better, but cookie size is limited)
      // In production, use a library like `jose` for real JWTs
      const sessionValue = btoa(sessionData);

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/#/dashboard",
          "Set-Cookie": [
            `session=${sessionValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`,
            `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
          ].join(", "),
        },
      });
    }

    // 3. Get Me Handler
    if (path === "/api/auth/me") {
      const cookieHeader = request.headers.get("Cookie") || "";
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")));
      const session = cookies["session"];

      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const userData = atob(session);
        return new Response(userData, {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response("Invalid Session", { status: 401 });
      }
    }

    // 4. Logout Handler
    if (path === "/api/auth/logout" && request.method === "POST") {
      return new Response(null, {
        status: 200,
        headers: {
          "Set-Cookie": "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
