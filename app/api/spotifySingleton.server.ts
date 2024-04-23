import { LRUCache } from "lru-cache";

/**
 * @see https://developer.spotify.com/documentation/web-api/tutorials/code-flow#response-1
 */
export type SpotifyToken = {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token: string;
} & { expires_in: number };

export interface SavedToken
  extends Partial<Pick<SpotifyToken, "access_token" | "refresh_token">> {
  expires?: Date;
}

class Api {
  #cache: LRUCache<string, string>;
  #token: SavedToken;

  constructor() {
    this.#cache = new LRUCache({ ttl: 1000 * 60 * 60, max: 100 });
    this.#token = {};
  }

  private fetchFromCache(key: string) {
    const item = this.#cache.get(key);

    return item;
  }

  private storeInCache(key: string, value: string) {
    return this.#cache.set(key, value);
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
}

const singleton = Object.freeze(new Api());
export default singleton;
