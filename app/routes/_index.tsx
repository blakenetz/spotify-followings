import { Button } from "@mantine/core";
import { type MetaFunction, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";

import { getLoginRedirect } from "~/api/spotify.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function action() {
  const { url, init } = await getLoginRedirect();
  return redirect(url, init);
}

export default function Index() {
  const _actionData = useActionData<typeof action>();
  const _navigation = useNavigation();

  return (
    <section>
      <h1>Welcome</h1>
      <Form method="post">
        <Button type="submit">Login</Button>
      </Form>
    </section>
  );
}
