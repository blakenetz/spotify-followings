import { json, LoaderFunction } from "@remix-run/node";

import { fetchToken } from "~/api/spotify.server";

export const loader: LoaderFunction = async ({ request }) => {
  await fetchToken(request);

  return json({ status: "ok" });
};
