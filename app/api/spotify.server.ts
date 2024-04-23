/**
 * @see https://github.com/spotify/web-api-examples/blob/master/authorization/authorization_code/app.js
 */

import { createCookie } from "@remix-run/node";
import { randomBytes } from "crypto";

const redirectUri =
  (process.env.NODE_ENV === "production"
    ? "http://localhost:3000"
    : "http://localhost:5173") + "/authCallback";

const clientId = process.env.SPOTIFY_CLIENT_ID!;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

if (!clientId || !clientSecret) {
  throw new Error(
    "Invalid config. Please set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` env variables"
  );
}

function generateRandomString() {
  return randomBytes(60).toString("hex").slice(0, 16);
}

export const spotifyState = createCookie("spotify_auth_state", {
  maxAge: 60 * 24 * 7,
});

export async function getLoginRedirect(): Promise<{
  url: string;
  init: ResponseInit;
}> {
  const state = generateRandomString();
  const scope = [
    "user-read-email",
    "user-read-private",
    "user-follow-read",
  ].join(" ");

  const query = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
    state,
  }).toString();

  const cookie = await spotifyState.serialize({ state });

  return {
    url: "https://accounts.spotify.com/authorize?" + query,
    init: {
      headers: { "Set-Cookie": cookie },
    },
  };
}

export async function fetchToken(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code") ?? "";
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await spotifyState.parse(cookieHeader)) || {};

  if (error) {
    console.error(error);
    return { status: "error" };
  }

  if (!state || state !== cookie.state) {
    return { status: "state_mismatch" };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  }).toString();

  const authBase64 = Buffer.from([clientId, clientSecret].join(":")).toString(
    "base64"
  );

  const init: RequestInit = {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authBase64}`,
    },
  };

  const response = await fetch("https://accounts.spotify.com/api/token", init);

  if (response.status !== 200) {
    return { status: "error" };
  }

  const data = await response.json();
  console.log(data);

  return { status: "ok" };
}
