import { LRUCache } from "lru-cache";

/** @see https://developer.spotify.com/documentation/web-api/tutorials/code-flow#response-1 */
export type SpotifyToken = {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token: string;
} & { expires_in: number };

interface SavedToken
  extends Partial<Pick<SpotifyToken, "access_token" | "refresh_token">> {
  expires?: Date;
}

/** @see https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile */
export type SpotifyUser = {
  display_name: string;
  href: string;
  id: string;
  images: { url: string }[];
};

interface SavedUser
  extends Partial<Pick<SpotifyUser, "display_name" | "href" | "id">> {
  image?: string;
}

const keys = ["user"] as const;
type Key = (typeof keys)[number];
type CacheItem<K = Key> = K extends "user" ? SavedUser : never;

class Api {
  #cache: LRUCache<Key, CacheItem>;
  #token: SavedToken;

  constructor() {
    this.#cache = new LRUCache({ ttl: 1000 * 60 * 60, max: 100 });
    this.#token = {};
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
      expires,
    };

    this.#token = token;
  }

  isExpired() {
    const { expires } = this.#token;
    return Boolean(expires && expires < new Date());
  }

  get token() {
    return this.#token;
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
}

const singleton = Object.freeze(new Api());
export default singleton;
