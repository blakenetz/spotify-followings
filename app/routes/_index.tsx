import { Button } from "@mantine/core";
import { type MetaFunction, redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";

import { getLoginRedirect } from "~/api/spotify.server";

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
  const { url, init } = await getLoginRedirect();
  return redirect(url, init);
}

export default function Index() {
  return (
    <section>
      <h1>Welcome</h1>
      <Form method="post">
        <Button type="submit">Login</Button>
      </Form>
    </section>
  );
}
