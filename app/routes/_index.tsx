import { AppShell } from "@mantine/core";
import { type MetaFunction, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { getSpotifyLoginResource } from "~/api/spotify.server";
import Welcome from "~/components/welcome";

export const meta: MetaFunction = () => {
  return [
    { title: "Spotify following" },
    {
      name: "description",
      content: "See what your Spotify followings are up to!",
    },
  ];
};

export async function action() {
  const { url, init } = await getSpotifyLoginResource();
  return redirect(url, init);
}

export async function loader() {
  return false;
}

export default function Index() {
  const _isLoggedIn = useLoaderData<typeof loader>();

  return (
    <AppShell padding="md">
      <Welcome />
    </AppShell>
  );
}
