import { Button, Text, Title } from "@mantine/core";
import { Form } from "@remix-run/react";

// import styles from "~/styles/welcome.module.css";

export default function Followings() {
  return (
    <section>
      <Title>Spotify Followings</Title>
      <Text>
        Spotify doesn't seem to give you the best view of your followings, so
        I'll just do it for them.
      </Text>
      <Text>Sign in to get goin'</Text>
      <Form method="post">
        <Button type="submit">Go to followings</Button>
      </Form>
    </section>
  );
}
