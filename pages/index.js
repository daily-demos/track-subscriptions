import { useState } from "react";
import Head from "next/head";
import { Alert, Button, ThemeProvider } from "evergreen-ui";
import Call from "../components/Call";
import theme from "../styles/theme";
import generateName from "sillyname";
import { DailyProvider } from "@daily-co/daily-react";

export default function Home() {
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [error, setError] = useState();
  const [roomUrl, setRoomUrl] = useState();

  async function handleCreateRoom() {
    setCreatingRoom(true);

    console.log(`🚪 Creating new demo room...`);

    const res = await fetch("/api/createRoom", { method: "POST" });

    const { url, error } = await res.json();

    if (url) {
      console.log(`🚪 Room created: ${url}`);
      setRoomUrl(url);
    } else {
      setError(error || "An unknown error occured");
    }

    setCreatingRoom(false);
  }

  return (
    <ThemeProvider value={theme}>
      <Head>
        <title>Daily JS - Pagination Demo</title>
      </Head>

      {!roomUrl ? (
        <main>
          {error && (
            <Alert intent="danger" title="Unable to create new room">
              {error}
            </Alert>
          )}
          <Button
            onClick={() => handleCreateRoom()}
            isLoading={creatingRoom}
            appearance="primary"
            height={48}
          >
            {creatingRoom ? "Creating room..." : "Create and join room"}
          </Button>
        </main>
      ) : (
        <DailyProvider
          url={roomUrl}
          subscribeToTracksAutomatically={false}
          audioSource={false}
          userName={generateName()}
        >
          <Call roomUrl={roomUrl} />
        </DailyProvider>
      )}
    </ThemeProvider>
  );
}
