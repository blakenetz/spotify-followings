/**
 * @see https://github.com/spotify/web-api-examples/blob/master/authorization/authorization_code/app.js
 */

import { createCookie } from "@remix-run/node";
import { randomBytes } from "crypto";
import {
  SavedToken,
  SavedUser,
  SpotifyFollowing,
  SpotifyResponse,
  SpotifyToken,
  SpotifyUser,
  StandardResponse,
} from "types/app";

import Api from "./spotifySingleton.server";

const redirectUri =
  (process.env.NODE_ENV === "production"
    ? "http://localhost:3000"
    : "http://localhost:5173") + "/authCallback";

function generateRandomString() {
  return randomBytes(60).toString("hex").slice(0, 16);
}

function getSpotifyHeaders({
  access_token,
  token_type,
}: Pick<SavedToken, "access_token" | "token_type">): HeadersInit {
  return {
    "content-type": "application/x-www-form-urlencoded",
    Authorization: [token_type, access_token].join(" "),
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
    client_id: Api.clientId,
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
  const data: SpotifyResponse<SpotifyToken> = await response.json();

  if (response.status !== 200) {
    console.error(data.error.message);
    return { status: "error" };
  }

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
  const data: SpotifyResponse<SpotifyToken> = await response.json();

  if (response.status !== 200) {
    console.error(data.error.message);
    return { status: "error" };
  }

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
    headers: getSpotifyHeaders(token),
  };

  console.log(getSpotifyHeaders(token));
  console.log(getSpotifyHeaders(Api.clientToken));

  const response = await fetch("https://api.spotify.com/v1/me", init);
  const data: SpotifyResponse<SpotifyUser> = await response.json();

  if (response.status !== 200) {
    console.error(data.error.message);
    return { status: "error" };
  }

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

export async function fetchFollowings(): Promise<
  StandardResponse<{ followings?: SpotifyFollowing[] }>
> {
  const { token } = await getToken();
  const { user } = await getUser();

  const headers = getSpotifyHeaders(token);

  const init: RequestInit = {
    method: "GET",
    headers: { ...headers, "Client-Token": Api.clientId },
  };

  const response = await fetch(
    `https://spclient.wg.spotify.com/user-profile-view/v3/profile/${user.id}/following`,
    init
  );
  const data: SpotifyResponse<{ profiles: SpotifyFollowing[] }> =
    await response.json();

  if (response.status !== 200) {
    console.error(data.error.message);
    return { status: "error" };
  }

  console.log(data);

  return { status: "ok" };
}

export async function isAuthenticated() {
  let hasToken = false;
  try {
    const { status } = await getToken();
    if (status === "ok") hasToken = true;
  } catch (error) {
    hasToken = false;
  }

  return hasToken;
}
