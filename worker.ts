/**
 * Cloudflare Worker for Oryn Server GitHub OAuth
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

// Updated Client ID as requested. 
// NOTE: Ensure GITHUB_CLIENT_SECRET is set in your Cloudflare Dashboard environment variables.
const GITHUB_CLIENT_ID = "Ov23lizibgwl44tnJgmb";
const REDIRECT_PATH = "/api/auth/callback";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Initiate Login Flow
    if (path === "/api/auth/github") {
      const state = crypto.randomUUID();
      const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
      
      githubAuthUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
      githubAuthUrl.searchParams.set("redirect_uri", `${url.origin}${REDIRECT_PATH}`);
      githubAuthUrl.searchParams.set("state", state);
      githubAuthUrl.searchParams.set("scope", "read:user");

      return new Response(null, {
        status: 302,
        headers: {
          "Location": githubAuthUrl.toString(),
          "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        },
      });
    }

    // 2. OAuth Callback
    if (path === REDIRECT_PATH) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return Response.redirect(`${url.origin}/#/login?error=${error}`, 302);
      }

      const cookieHeader = request.headers.get("Cookie") || "";
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.trim().split("=")));
      const savedState = cookies["oauth_state"];

      if (!code || !state || state !== savedState) {
        console.error("Auth mismatch:", { code: !!code, state, savedState });
        return Response.redirect(`${url.origin}/#/login?error=state_mismatch`, 302);
      }

      try {
        // Exchange code for token
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "OrynServer-Auth",
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET, // Use the secret from environment
            code,
            redirect_uri: `${url.origin}${REDIRECT_PATH}`,
          }),
        });

        const tokenData: any = await tokenResponse.json();
        if (tokenData.error) {
          return Response.redirect(`${url.origin}/#/login?error=${tokenData.error}`, 302);
        }

        // Fetch User Profile
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            "Authorization": `token ${tokenData.access_token}`,
            "User-Agent": "OrynServer-Auth",
          },
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const userData: any = await userResponse.json();

        // Safe Base64 for Unicode support
        const sessionData = JSON.stringify({
          id: userData.id,
          login: userData.login,
          name: userData.name || userData.login,
          avatar_url: userData.avatar_url,
        });
        
        // Base64 encode the string (UTF-8 safe)
        const sessionValue = btoa(encodeURIComponent(sessionData));

        return new Response(null, {
          status: 302,
          headers: {
            "Location": `${url.origin}/#/dashboard`,
            "Set-Cookie": [
              `session=${sessionValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`,
              `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
            ].join(", "),
          },
        });
      } catch (err) {
        console.error("OAuth Error:", err);
        return Response.redirect(`${url.origin}/#/login?error=server_error`, 302);
      }
    }

    // 3. User Identity Check
    if (path === "/api/auth/me") {
      const cookieHeader = request.headers.get("Cookie") || "";
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.trim().split("=")));
      const session = cookies["session"];

      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const decoded = decodeURIComponent(atob(session));
        return new Response(decoded, {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid Session" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 4. Logout
    if (path === "/api/auth/logout") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};