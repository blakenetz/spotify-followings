export type Status =
  | "ok"
  | "error"
  | "state_mismatch"
  | "invalid_token"
  | "expired_token";

export type StandardResponse<T = object> = {
  status: Status;
} & T;

/** @see https://developer.spotify.com/documentation/web-api/tutorials/code-flow#response-1 */
export type SpotifyToken = {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token: string;
} & { expires_in: number };

export interface SavedToken
  extends Pick<SpotifyToken, "access_token" | "refresh_token"> {
  expires: Date;
}

/** @see https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile */
export type SpotifyUser = {
  display_name: string;
  href: string;
  id: string;
  images: { url: string }[];
};

export interface SavedUser
  extends Pick<SpotifyUser, "display_name" | "href" | "id"> {
  image: string;
}
