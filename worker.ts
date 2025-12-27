/**
 * Cloudflare Worker for Oryn Server GitHub OAuth
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

// Updated IDs provided by user
const GITHUB_CLIENT_ID = "Ov23lizibgwl44tnJgmb";
const GITHUB_CLIENT_SECRET = "7de62778154cf748e0beb23e7fa43213e5da74fa";
const REDIRECT_PATH = "/api/auth/callback";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. INITIATE LOGIN
    if (path === "/api/auth/github") {
      const state = crypto.randomUUID();
      const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
      
      githubAuthUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
      // Ensure redirect_uri matches exactly what's in GitHub dashboard
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

    // 2. CALLBACK HANDLER
    if (path === REDIRECT_PATH) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      
      const cookieHeader = request.headers.get("Cookie") || "";
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.trim().split("=")));
      const savedState = cookies["oauth_state"];

      if (!code || !state || state !== savedState) {
        return Response.redirect(`${url.origin}/#/login?error=state_mismatch`, 302);
      }

      try {
        // TOKEN EXCHANGE (Backend Only)
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "OrynServer-Auth",
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET || GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: `${url.origin}${REDIRECT_PATH}`,
          }),
        });

        const tokenData: any = await tokenResponse.json();
        if (tokenData.error) {
          return Response.redirect(`${url.origin}/#/login?error=${tokenData.error}`, 302);
        }

        // FETCH USER PROFILE
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            "Authorization": `token ${tokenData.access_token}`,
            "User-Agent": "OrynServer-Auth",
          },
        });

        if (!userResponse.ok) throw new Error("GitHub profile fetch failed");
        const userData: any = await userResponse.json();

        // SESSION CREATION
        // Basic role logic: if specific login, set as admin. Otherwise user.
        const role = "user"; 
        const sessionPayload = {
          id: userData.id,
          login: userData.login,
          name: userData.name || userData.login,
          avatar_url: userData.avatar_url,
          role: role
        };
        
        // Encode payload safely for cookies
        const sessionValue = btoa(encodeURIComponent(JSON.stringify(sessionPayload)));

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
        return Response.redirect(`${url.origin}/#/login?error=auth_failed`, 302);
      }
    }

    // 3. IDENTITY ENDPOINT (/api/auth/me)
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
        const decoded = JSON.parse(decodeURIComponent(atob(session)));
        return new Response(JSON.stringify(decoded), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid session" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 4. LOGOUT
    if (path === "/api/auth/logout") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    }

    return new Response("API Route Not Found", { status: 404 });
  },
};
