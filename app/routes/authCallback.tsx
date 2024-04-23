import { LoaderFunction, redirect } from "@remix-run/node";

import { fetchToken } from "~/api/spotify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const res = await fetchToken(request);

  if (res.status === "ok") redirect("/");
  if (res.status === "error") redirect("/");
  if (res.status === "state_mismatch") redirect("/");
};
