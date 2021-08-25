import Daily from "@daily-co/daily-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Spinner,
  Button,
  Alert,
  MobileVideoIcon,
  LogOutIcon,
  MenuIcon,
  SideSheet,
  Tooltip,
  Badge,
  Pane,
  IconButton,
} from "evergreen-ui";
import generateName from "sillyname";
import { ParticipantProvider } from "../contexts/ParticipantProvider";
import { TrackProvider } from "../contexts/TracksProvider";
import PaginatedGrid from "./PaginatedGrid";
import Sidebar from "./Sidebar";

export const Call = ({ roomUrl }) => {
  const [callObject, setCallObject] = useState(null);
  const [callState, setCallState] = useState("joining");
  const [showSidebar, setShowSidebar] = useState(false);
  const [localVideo, setLocalVideo] = useState(true);
  const [autoLayers, setAutoLayers] = useState(true);

  const join = useCallback(
    async (callObject) => {
      await callObject.join({
        url: roomUrl,
        subscribeToTracksAutomatically: false,
        userName: generateName(),
        audioSource: false,
      });
      await callObject.setNetworkTopology({ topology: "sfu" });

      setLocalVideo(callObject.localVideo());
    },
    [roomUrl]
  );

  const leave = useCallback(() => {
    callObject.destroy();
  }, [callObject]);

  const addFake = useCallback(() => {
    callObject.addFakeParticipant();
  }, [callObject]);

  const toggleVideo = useCallback(
    (state) => {
      callObject.setLocalVideo(state);
      setLocalVideo(state);
    },
    [callObject]
  );

  useEffect(() => {
    if (callObject) return;

    // Create new Daily call object
    const co = Daily.createCallObject();

    // Join the call
    join(co);

    setCallObject(co);
  }, [callObject, join]);

  useEffect(() => {
    if (!callObject) return;

    // Listen for changes in state
    const events = ["joined-meeting", "left-meeting"];

    function handleMeetingState(e) {
      switch (e.action) {
        case "joined-meeting":
          setCallState("joined");
          break;
        case "left-meeting":
          setCallState("left");
          break;
        default:
          break;
      }
    }
    events.forEach((event) => callObject.on(event, handleMeetingState));

    return () =>
      events.forEach((event) => callObject.off(event, handleMeetingState));
  }, [callObject]);

  const renderCallState = useMemo(() => {
    switch (callState) {
      case "joined":
        return (
          <>
            <PaginatedGrid autoLayers={autoLayers} />
            <Pane
              display="flex"
              padding="8px"
              width="100%"
              background="gray75"
              alignItems="center"
            >
              <Badge style={{ textTransform: "none" }}>{roomUrl}</Badge>

              <Pane flex="1" display="flex" justifyContent="center">
                <IconButton
                  intent={localVideo ? "success" : "danger"}
                  icon={MobileVideoIcon}
                  onClick={() => toggleVideo(!localVideo)}
                />
                <Tooltip content="Note: fake participants will always be unsubscribed">
                  <Button onClick={() => addFake()} marginLeft={8}>
                    Add fake participant
                  </Button>
                </Tooltip>
                <Button
                  intent="danger"
                  marginLeft={8}
                  iconAfter={LogOutIcon}
                  onClick={() => leave()}
                >
                  Leave
                </Button>
              </Pane>

              <Pane>
                <Button
                  onClick={() => setAutoLayers(!autoLayers)}
                  marginRight={8}
                  intent={autoLayers ? "success" : "danger"}
                >
                  {autoLayers ? "Auto layers" : "Manual layers"}
                </Button>
                <Button
                  onClick={() => setShowSidebar(!showSidebar)}
                  iconAfter={MenuIcon}
                >
                  Show subscriptions
                </Button>
                <SideSheet
                  isShown={showSidebar}
                  onCloseComplete={() => setShowSidebar(false)}
                >
                  <Sidebar />
                </SideSheet>
              </Pane>
            </Pane>
          </>
        );
      case "joining":
        return <Spinner />;
      case "left":
        return (
          <Alert title="Call left">
            You left the call (or the room expired.) We hope you had fun!
          </Alert>
        );
      default:
        return (
          <Alert intent="danger" title="Unexpected room state">
            Please check your room settings / reload and try again
          </Alert>
        );
    }
  }, [
    callState,
    leave,
    addFake,
    roomUrl,
    showSidebar,
    localVideo,
    toggleVideo,
    autoLayers,
  ]);

  return (
    <ParticipantProvider callObject={callObject}>
      <TrackProvider callObject={callObject}>
        <main>{renderCallState}</main>
      </TrackProvider>
    </ParticipantProvider>
  );
};

export default Call;
