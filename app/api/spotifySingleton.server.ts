import { LRUCache } from "lru-cache";
import { SavedToken, SavedUser, SpotifyToken, SpotifyUser } from "types/app";

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
