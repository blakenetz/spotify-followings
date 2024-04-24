import { AppShell, Notification } from "@mantine/core";
import { useToggle } from "@mantine/hooks";
import {
  json,
  LoaderFunctionArgs,
  type MetaFunction,
  redirect,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Status } from "types/app";

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

export async function loader({ request }: LoaderFunctionArgs) {
  const status =
    (new URL(request.url).searchParams.get("status") as Status) ?? "ok";

  if (status !== "ok") return json({ status });

  return json({ status });
}

export default function Index() {
  const { status } = useLoaderData<typeof loader>();
  const [hide, setHide] = useToggle();

  return (
    <AppShell padding="md">
      <Welcome />

      {status !== "ok" && hide !== true && (
        <Notification title="Sorry!" onClose={setHide} color="red">
          There's some gunk in the gears. Maybe try again?
        </Notification>
      )}
    </AppShell>
  );
}
