/**
 * @see https://github.com/spotify/web-api-examples/blob/master/authorization/authorization_code/app.js
 */

import { createCookie } from "@remix-run/node";
import { randomBytes } from "crypto";
import { SpotifyToken, SpotifyUser, StandardResponse } from "types/app";

import Api from "./spotifySingleton.server";

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

function getSpotifyHeaders(): HeadersInit {
  const authBase64 = Buffer.from([clientId, clientSecret].join(":")).toString(
    "base64"
  );

  return {
    "content-type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${authBase64}`,
  };
}

export const spotifyState = createCookie("spotify_auth_state", {
  maxAge: 60 * 24 * 7,
});

export async function getSpotifyLoginResource(): Promise<{
  url: string;
  init: ResponseInit;
}> {
  const state = generateRandomString();
  const scope = [
    "user-read-private",
    "user-read-email",
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

export async function fetchToken(request: Request): Promise<StandardResponse> {
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

  const init: RequestInit = {
    method: "POST",
    body,
    headers: getSpotifyHeaders(),
  };

  const response = await fetch("https://accounts.spotify.com/api/token", init);

  if (response.status !== 200) {
    return { status: "error" };
  }

  const data: SpotifyToken = await response.json();

  Api.storeToken(data);

  return { status: "ok" };
}

export async function refreshToken(): Promise<StandardResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: Api.token.refresh_token!,
  }).toString();

  const init: RequestInit = {
    method: "POST",
    body,
    headers: getSpotifyHeaders(),
  };

  const response = await fetch("https://accounts.spotify.com/api/token", init);

  if (response.status !== 200) {
    return { status: "error" };
  }

  const data: SpotifyToken = await response.json();

  Api.storeToken(data);

  return { status: "ok" };
}

export async function getUser(): Promise<
  StandardResponse<{ user?: SpotifyUser }>
> {
  const init: RequestInit = {
    method: "GET",
    headers: getSpotifyHeaders(),
  };

  const response = await fetch("https://api.spotify.com/v1/me", init);

  if (response.status !== 200) {
    return { status: "error" };
  }

  const data: SpotifyUser = await response.json();

  Api.storeUser(data);

  return { status: "ok", user: data };
}
