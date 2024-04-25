import { AppShell, Notification } from "@mantine/core";
import { useToggle } from "@mantine/hooks";
import {
  json,
  LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  TypedResponse,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Status } from "types/app";

import { getSpotifyLoginResource, isAuthenticated } from "~/api/spotify.server";
import Followings from "~/components/followings";
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

export async function loader({ request }: LoaderFunctionArgs): Promise<
  TypedResponse<{
    status: Status;
    isAuthenticated: boolean;
    followings?: [];
  }>
> {
  //  check redirect status
  const status =
    (new URL(request.url).searchParams.get("status") as Status) ?? "ok";
  if (status !== "ok")
    return json({ status, isAuthenticated: false, followings: [] });

  // check auth state
  const isLoggedIn = await isAuthenticated();
  if (!isLoggedIn)
    return json({ status: "ok", isAuthenticated: false, following: [] });

  return json({ status: "ok", isAuthenticated: true, following: [] });

  // const { followings: _followings } = await fetchFollowings();
  // return json({ status: "ok", isAuthenticated: false, following: [] });
}

export default function Index() {
  const { status, isAuthenticated } = useLoaderData<typeof loader>();
  const [hide, setHide] = useToggle();

  return (
    <AppShell padding="md">
      <AppShell.Main>
        {isAuthenticated ? <Followings /> : <Welcome />}
      </AppShell.Main>

      {status !== "ok" && hide !== true && (
        <Notification title="Sorry!" onClose={setHide} color="red">
          There's some gunk in the gears. Maybe try again?
        </Notification>
      )}
    </AppShell>
  );
}
