import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from "react";
import {
  PARTICIPANT_JOINED,
  PARTICIPANT_UPDATED,
  PARTICIPANT_LEFT,
  SWAP_POSITION,
  ACTIVE_SPEAKER,
  UPDATE_LAYER,
  initialState,
  participantsReducer,
} from "./participantReducer";

// -- Constants

export const ParticipantContext = createContext();

// -- Provider

export const ParticipantProvider = ({ callObject, children }) => {
  const [state, dispatch] = useReducer(participantsReducer, initialState);

  // All call participants
  const participants = useMemo(() => state.participants, [state.participants]);

  // The participant who most recently got mentioned via a `active-speaker-change` event
  const activeParticipant = useMemo(
    () => participants.find(({ isActiveSpeaker }) => isActiveSpeaker),
    [participants]
  );

  const activeParticipantId = useMemo(
    () => activeParticipant?.id,
    [activeParticipant]
  );

  const handleNewParticipantsState = useCallback(
    (event = null) => {
      switch (event?.action) {
        case "participant-joined":
          dispatch({
            type: PARTICIPANT_JOINED,
            participant: event.participant,
          });
          break;
        case "participant-updated":
          dispatch({
            type: PARTICIPANT_UPDATED,
            participant: event.participant,
          });
          break;
        case "participant-left":
          dispatch({
            type: PARTICIPANT_LEFT,
            participant: event.participant,
          });
          break;
        default:
          break;
      }
    },
    [dispatch]
  );

  /**
   * Participant state
   */
  useEffect(() => {
    if (!callObject) return;

    const events = [
      "joined-meeting",
      "participant-joined",
      "participant-updated",
      "participant-left",
    ];

    // Instantiate local user
    handleNewParticipantsState();

    // Listen for changes in state
    events.forEach((event) => callObject.on(event, handleNewParticipantsState));

    // Stop listening for changes in state on teardown
    return () =>
      events.forEach((event) =>
        callObject.off(event, handleNewParticipantsState)
      );
  }, [callObject, handleNewParticipantsState]);

  /**
   * Active speaker
   */
  useEffect(() => {
    if (!callObject) return;

    const handleActiveSpeakerChange = ({ activeSpeaker }) => {
      // Ignore active-speaker-change events for the local user
      const localId = callObject.participants().local.session_id;
      if (localId === activeSpeaker?.peerId) return;
      dispatch({
        type: ACTIVE_SPEAKER,
        id: activeSpeaker?.peerId,
      });
    };

    callObject.on("active-speaker-change", handleActiveSpeakerChange);

    return () =>
      callObject.off("active-speaker-change", handleActiveSpeakerChange);
  }, [callObject]);

  const swapParticipantPosition = (id1, id2) => {
    if (id1 === id2 || !id1 || !id2 || id1 === "local" || id2 === "local")
      return;
    dispatch({
      type: SWAP_POSITION,
      id1,
      id2,
    });
  };

  /**
   * Listen for changes in receive settings
   */
  useEffect(() => {
    if (!callObject) return;

    function handleReceiveSettings({ receiveSettings }) {
      dispatch({
        type: UPDATE_LAYER,
        receiveSettings,
      });
    }

    callObject.on("receive-settings-updated", handleReceiveSettings);

    return () =>
      callObject.off("receive-settings-updated", handleReceiveSettings);
  }, [callObject]);

  const updateReceiveSettings = useCallback(
    (settings) => {
      if (!callObject) return;

      callObject.updateReceiveSettings(settings);
    },
    [callObject]
  );

  const setLayerForParticipant = useCallback(
    (id, layer) => {
      // Ignore receive settings for local participant
      if (!callObject || id === "local") return;

      console.log(`Updating receive settings for participant ${id}`);

      callObject.updateReceiveSettings({
        [id]: { video: { layer } },
      });
    },
    [callObject]
  );

  return (
    <ParticipantContext.Provider
      value={{
        participants,
        activeParticipant,
        activeParticipantId,
        updateReceiveSettings,
        swapParticipantPosition,
        setLayerForParticipant,
      }}
    >
      {children}
    </ParticipantContext.Provider>
  );
};

export const useParticipants = () => useContext(ParticipantContext);
