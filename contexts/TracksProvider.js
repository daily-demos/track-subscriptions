import React, {
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import { useParticipants } from "./ParticipantProvider";
import { sortByKey } from "../lib/sortByKey";

// -- Constants
/**
 * Maximum amount of concurrently subscribed or staged most recent speakers.
 */
const MAX_RECENT_SPEAKER_COUNT = 6;

export const TrackContext = createContext();

// -- Provider

export const TrackProvider = ({ callObject, children }) => {
  const { participants } = useParticipants();
  const [videoTracks, setVideoTracks] = useState({});

  const recentSpeakerIds = useMemo(
    () =>
      participants
        .filter((p) => Boolean(p.lastActiveDate) && !p.isLocal)
        .sort((a, b) => sortByKey(a, b, "lastActiveDate"))
        .slice(-MAX_RECENT_SPEAKER_COUNT)
        .map((p) => p.id)
        .reverse(),
    [participants]
  );

  // All participants except the local client
  const remoteParticipantIds = useMemo(
    () => participants.filter((p) => !p.isLocal).map((p) => p.id),
    [participants]
  );

  /**
   * Updates cam subscriptions based on passed subscribedIds and stagedIds.
   * For ids not provided, cam tracks will be unsubscribed from
   */
  const updateCamSubscriptions = useCallback(
    (subscribedIds, stagedIds = []) => {
      if (!callObject) return;

      // Append recent speakers to our staged list as we presume they will likely speak again
      const stagedIdsFiltered = [
        ...stagedIds,
        ...recentSpeakerIds.filter((id) => !subscribedIds.includes(id)),
      ];

      // Assemble updates to get to desired cam subscriptions
      const updates = remoteParticipantIds.reduce((u, id) => {
        let desiredSubscription;
        const currentSubscription =
          callObject.participants()?.[id]?.tracks?.video?.subscribed;

        // Ignore undefined or local
        if (!id || id === "local") return u;

        // Decide on desired cam subscription for this participant:
        // subscribed, staged, or unsubscribed
        if (subscribedIds.includes(id)) {
          desiredSubscription = true;
        } else if (stagedIdsFiltered.includes(id)) {
          desiredSubscription = "staged";
        } else {
          desiredSubscription = false;
        }

        // Skip if we already have the desired subscription to this
        // participant's cam
        if (desiredSubscription === currentSubscription) return u;

        // Log out changes
        console.log(
          `%cParticipant ${id} cam subscription: ${desiredSubscription}`,
          `color: ${desiredSubscription ? "green" : "red"}`
        );

        return {
          ...u,
          [id]: {
            setSubscribedTracks: {
              video: desiredSubscription,
            },
          },
        };
      }, {});

      callObject.updateParticipants(updates);
    },
    [callObject, remoteParticipantIds, recentSpeakerIds]
  );

  /**
   * Listen and keep state of track events
   */
  useEffect(() => {
    if (!callObject) return false;

    const handleTrackUpdate = ({ action, participant, track }) => {
      if (!participant) return;

      const id = participant.local ? "local" : participant.user_id;

      switch (action) {
        case "track-started":
        case "track-stopped":
          if (track.kind !== "video") break;
          setVideoTracks((prevState) => ({
            ...prevState,
            [id]: participant.tracks.video,
          }));
          break;
        // Listen for participant updated events so we can
        // keep our state updated with track subscription status
        case "participant-updated":
          setVideoTracks((prevState) => ({
            ...prevState,
            [id]: participant.tracks.video,
          }));
          break;
        // Remove tracks we no longer need
        case "participant-left":
          setVideoTracks((prevState) => {
            delete prevState[id];
            return prevState;
          });
          break;
      }
    };

    callObject.on("track-started", handleTrackUpdate);
    callObject.on("track-stopped", handleTrackUpdate);
    callObject.on("participant-updated", handleTrackUpdate);
    callObject.on("participant-left", handleTrackUpdate);
    return () => {
      callObject.off("track-started", handleTrackUpdate);
      callObject.off("track-stopped", handleTrackUpdate);
      callObject.off("participant-updated", handleTrackUpdate);
      callObject.off("participant-left", handleTrackUpdate);
    };
  }, [callObject]);

  return (
    <TrackContext.Provider
      value={{
        videoTracks,
        updateCamSubscriptions,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
};

export const useTracks = () => useContext(TrackContext);
