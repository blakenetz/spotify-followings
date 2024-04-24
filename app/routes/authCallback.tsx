import { LoaderFunction, redirect } from "@remix-run/node";

import { fetchToken } from "~/api/spotify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const res = await fetchToken(request);

  const query = new URLSearchParams(res).toString();
  redirect(`/?${query}`);
};
