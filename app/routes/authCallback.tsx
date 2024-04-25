import { LoaderFunction, redirect } from "@remix-run/node";

import { fetchToken, fetchUser } from "~/api/spotify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const tokenResponse = await fetchToken(request);

  if (tokenResponse.status !== "ok") {
    const query = new URLSearchParams(tokenResponse).toString();
    return redirect(`/?${query}`);
  }

  const userResponse = await fetchUser();

  const query = new URLSearchParams({ status: userResponse.status }).toString();
  return redirect(`/?${query}`);
};
