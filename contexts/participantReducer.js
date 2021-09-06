import fasteq from "fast-deep-equal";

export const PARTICIPANT_JOINED = "participant-joined";
export const PARTICIPANT_UPDATED = "participant-updated";
export const PARTICIPANT_LEFT = "participant-left";
export const SWAP_POSITION = "swap-position";
export const UPDATE_LAYER = "update-layer";
export const ACTIVE_SPEAKER = "active-speaker";

export const initialState = {
  participants: [
    {
      id: "local",
      name: "",
      layer: undefined,
      isCamMuted: false,
      isMicMuted: false,
      isLoading: true,
      isLocal: true,
      isOwner: false,
      isActiveSpeaker: false,
      lastActiveDate: null,
    },
  ],
};

function createOrUpdateParticipant(participant, participants) {
  const { local } = participant;
  const id = local ? "local" : participant.user_id;
  const { audio, video } = participant.tracks;

  const prevState = participants ? participants.find((p) => p.id === id) : {};

  return {
    isActiveSpeaker: false,
    lastActiveDate: null,
    color: Math.floor(Math.random() * 11),
    ...prevState,
    id,
    name: participant.user_name,
    isCamMuted: video?.state === "off" || video?.state === "blocked",
    isMicMuted: audio?.state === "off" || audio?.state === "blocked",
    isLoading: audio?.state === "loading" || video?.state === "loading",
    isLocal: local,
    isOwner: !!participant.owner,
  };
}

export function participantsReducer(prevState, action) {
  switch (action.type) {
    case ACTIVE_SPEAKER: {
      const { participants, ...state } = prevState;
      if (!action.id)
        return {
          ...prevState,
          lastPendingUnknownActiveSpeaker: null,
        };
      const date = new Date();
      const isParticipantKnown = participants.some((p) => p.id === action.id);
      return {
        ...state,
        lastPendingUnknownActiveSpeaker: isParticipantKnown
          ? null
          : {
              date,
              id: action.id,
            },
        participants: participants.map((p) => ({
          ...p,
          isActiveSpeaker: p.id === action.id,
          lastActiveDate: p.id === action.id ? date : p?.lastActiveDate,
        })),
      };
    }

    case PARTICIPANT_JOINED: {
      const item = createOrUpdateParticipant(action.participant);
      const participants = [...prevState.participants];
      const isPendingActiveSpeaker =
        item.id === prevState.lastPendingUnknownActiveSpeaker?.id;
      if (isPendingActiveSpeaker) {
        item.isActiveSpeaker = true;
        item.lastActiveDate = prevState.lastPendingUnknownActiveSpeaker?.date;
      }

      if (item.isCamMuted) {
        participants.push(item);
      } else {
        const firstInactiveCamOffIndex = prevState.participants.findIndex(
          (p) => p.isCamMuted && !p.isLocal && !p.isActiveSpeaker
        );
        if (firstInactiveCamOffIndex >= 0) {
          participants.splice(firstInactiveCamOffIndex, 0, item);
        } else {
          participants.push(item);
        }
      }
      return {
        ...prevState,
        lastPendingUnknownActiveSpeaker: isPendingActiveSpeaker
          ? null
          : prevState.lastPendingUnknownActiveSpeaker,
        participants,
      };
    }
    case PARTICIPANT_UPDATED: {
      const item = createOrUpdateParticipant(
        action.participant,
        prevState.participants
      );
      const { id } = item;
      const participants = [...prevState.participants];
      const idx = participants.findIndex((p) => p.id === id);
      participants[idx] = item;

      const newState = {
        ...prevState,
        participants,
      };

      if (fasteq(newState, prevState)) {
        return prevState;
      }

      return newState;
    }
    case PARTICIPANT_LEFT: {
      return {
        ...prevState,
        participants: [...prevState.participants].filter(
          (p) => p.id !== action.participant.user_id
        ),
      };
    }

    case SWAP_POSITION: {
      const participants = [...prevState.participants];
      if (!action.id1 || !action.id2) return prevState;
      const idx1 = participants.findIndex((p) => p.id === action.id1);
      const idx2 = participants.findIndex((p) => p.id === action.id2);
      if (idx1 === -1 || idx2 === -1) return prevState;
      const tmp = participants[idx1];
      participants[idx1] = participants[idx2];
      participants[idx2] = tmp;
      return {
        ...prevState,
        participants,
      };
    }

    case UPDATE_LAYER: {
      const newState = prevState.participants.map((p) => {
        return { ...p, layer: action.receiveSettings[p.id]?.video.layer };
      });

      return { ...prevState, participants: newState };
    }

    default:
      throw new Error();
  }
}
