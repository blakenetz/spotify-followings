import { LRUCache } from "lru-cache";
import { SavedToken, SavedUser, SpotifyToken, SpotifyUser } from "types/app";

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
  #clientToken: string;

  constructor() {
    this.#cache = new LRUCache({ ttl: 1000 * 60 * 60, max: 100 });
    this.#token = null;
    this.#clientToken = Buffer.from(
      [clientId, clientSecret].join(":")
    ).toString("base64");
  }

  private fetchFromCache(key: Key) {
    const item = this.#cache.get(key) as CacheItem<typeof key>;

    return item;
  }

  private storeInCache(key: Key, value: CacheItem): void {
    this.#cache.set(key, value);
  }

  isExpired() {
    return this.#token!.expires < new Date();
  }

  storeToken(data: SpotifyToken) {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + data.expires_in);

    const token: SavedToken = {
      access_token: data.access_token,
      refresh_token: data.access_token,
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
    if (!Object.keys(cachedUser).length) return null;
    return cachedUser;
  }
}

const singleton = Object.freeze(new Api());
export default singleton;
