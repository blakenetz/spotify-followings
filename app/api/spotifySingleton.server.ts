import { LRUCache } from "lru-cache";
import {
  SavedToken,
  SavedUser,
  SpotifyToken,
  SpotifyUser,
  StandardResponse,
} from "types/app";

const keys = ["user"] as const;
type Key = (typeof keys)[number];
type CacheItem<K = Key> = K extends "user" ? SavedUser : never;

const clientId = process.env.SPOTIFY_CLIENT_ID!;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

if (!clientId || !clientSecret) {
  throw new Error(
    "Invalid config. Please set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` env variables"
  );
}

class Api {
  #cache: LRUCache<Key, CacheItem>;
  /**
   * A note on tokens:
   *
   * `clientToken` is used for initial auth requests
   * all other queries should use the `token.access_token`
   */
  #token: SavedToken | null;
  #clientToken: Pick<SavedToken, "token_type" | "access_token">;
  #clientId: string;

  constructor() {
    this.#cache = new LRUCache({ ttl: 1000 * 60 * 60, max: 100 });
    this.#token = null;
    this.#clientToken = {
      token_type: "Basic",
      access_token: Buffer.from([clientId, clientSecret].join(":")).toString(
        "base64"
      ),
    };
    this.#clientId = clientId;
  }

  private fetchFromCache(key: Key) {
    const item = this.#cache.get(key) as CacheItem<typeof key>;

    return item;
  }

  private storeInCache(key: Key, value: CacheItem): void {
    this.#cache.set(key, value);
  }

  storeToken(data: SpotifyToken) {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + data.expires_in);

    const token: SavedToken = {
      access_token: data.access_token,
      refresh_token: data.access_token,
      token_type: data.token_type,
      expires,
    };

    this.#token = token;
  }

  get token() {
    return this.#token;
  }

  get clientToken() {
    return this.#clientToken;
  }

  get clientId() {
    return this.#clientId;
  }

  isExpired() {
    return this.#token!.expires < new Date();
  }

  validateToken(): StandardResponse {
    if (!this.#token) return { status: "invalid_token" };

    return { status: this.isExpired() ? "expired_token" : "ok" };
  }

  storeUser(data: SpotifyUser) {
    const user: SavedUser = {
      display_name: data.display_name,
      href: data.href,
      id: data.id,
      image: data.images[0].url,
    };

    this.storeInCache("user", user);
  }

  get user() {
    const cachedUser = this.fetchFromCache("user");
    if (!cachedUser) return null;
    if (!Object.keys(cachedUser).length) return null;
    return cachedUser;
  }
}

const singleton = Object.freeze(new Api());
export default singleton;
