/**
 * @see https://github.com/spotify/web-api-examples/blob/master/authorization/authorization_code/app.js
 */

import { createCookie } from "@remix-run/node";
import { randomBytes } from "crypto";
import {
  SavedToken,
  SavedUser,
  SpotifyToken,
  SpotifyUser,
  StandardResponse,
} from "types/app";

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

function getSpotifyHeaders(accessToken: string): HeadersInit {
  return {
    "content-type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${accessToken}`,
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
    headers: getSpotifyHeaders(Api.clientToken),
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
  if (!Api.token) return { status: "invalid_token" };

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: Api.token.refresh_token!,
  }).toString();

  const init: RequestInit = {
    method: "POST",
    body,
    headers: getSpotifyHeaders(Api.clientToken),
  };

  const response = await fetch("https://accounts.spotify.com/api/token", init);

  if (response.status !== 200) {
    return { status: "error" };
  }

  const data: SpotifyToken = await response.json();

  Api.storeToken(data);

  return { status: "ok" };
}

async function getToken(): Promise<StandardResponse<{ token: SavedToken }>> {
  const { status } = Api.validateToken();

  if (status === "ok") return { status: "ok", token: Api.token! };
  if (status === "expired_token") {
    const { status: refreshStatus } = await refreshToken();
    if (refreshStatus === "ok") return { status: "ok", token: Api.token! };
    throw new Error(
      `Unable to get refresh token with status: ${refreshStatus}`
    );
  }

  throw new Error(`Unable to get token with status: ${status}`);
}

export async function fetchUser(): Promise<
  StandardResponse<{ user?: SavedUser }>
> {
  const { token } = await getToken();

  const init: RequestInit = {
    method: "GET",
    headers: getSpotifyHeaders(token.access_token),
  };

  const response = await fetch("https://api.spotify.com/v1/me", init);

  if (response.status !== 200) {
    return { status: "error" };
  }

  const data: SpotifyUser = await response.json();

  Api.storeUser(data);

  return { status: "ok", user: Api.user! };
}

export async function getUser(): Promise<
  StandardResponse<{ user: SavedUser }>
> {
  const user = Api.user;

  if (user) return { status: "ok", user };

  const { status, user: fetchedUser } = await fetchUser();
  if (status === "ok") return { status: "ok", user: fetchedUser! };

  throw new Error(`Unable to get user with status: ${status}`);
}

export async function fetchFollowings(): Promise<StandardResponse> {
  const { token } = await getToken();
  const { user } = await getUser();

  const init: RequestInit = {
    method: "GET",
    headers: getSpotifyHeaders(token.access_token),
  };

  const _response = await fetch(
    `https://spclient.wg.spotify.com/user-profile-view/v3/profile/${user.id}/following`,
    init
  );

  return { status: "ok" };
}
