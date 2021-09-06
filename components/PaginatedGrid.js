import { useEffect, useCallback, useMemo, useRef } from "react";
import { IconButton, ArrowLeftIcon, ArrowRightIcon } from "evergreen-ui";
import { useDeepCompareEffect, useDeepCompareMemo } from "use-deep-compare";

import { useParticipants } from "../contexts/ParticipantProvider";
import { useTracks } from "../contexts/TracksProvider";
import { sortByKey } from "../libs/sortByKey";
import { useAspectGrid } from "../hooks/useAspectGrid";
import Tile from "./Tile";

export const PaginatedGrid = ({ autoLayers }) => {
  // -- Refs

  const gridRef = useRef(null);

  // -- Hooks

  const {
    participants,
    updateReceiveSettings,
    swapParticipantPosition,
    activeParticipantId,
  } = useParticipants();
  const { updateCamSubscriptions } = useTracks();
  const { page, pages, pageSize, setPage, tileWidth, tileHeight } =
    useAspectGrid(gridRef, participants?.length || 0);

  // -- Pagination

  // Participants that are visible on the current page
  const visibleParticipants = useMemo(() => {
    return participants.length - page * pageSize > 0
      ? participants.slice((page - 1) * pageSize, page * pageSize)
      : participants.slice(-pageSize);
  }, [page, pageSize, participants]);

  const handlePrevClick = () => {
    setPage((p) => p - 1);
  };
  const handleNextClick = () => {
    setPage((p) => p + 1);
  };

  // -- Subscriptions

  /**
   * Play / pause tracks based on pagination
   * Note: we pause adjacent page tracks and unsubscribe from everything else
   */
  const [subscribedIds, stagedIds] = useMemo(() => {
    const maxSubs = 3 * pageSize;

    // Determine participant ids to subscribe to or stage, based on page
    let renderedOrBufferedIds = [];
    switch (page) {
      // First page
      case 1:
        renderedOrBufferedIds = participants
          .slice(0, Math.min(maxSubs, 2 * pageSize))
          .map((p) => p.id);
        break;
      // Last page
      case Math.ceil(participants.length / pageSize):
        renderedOrBufferedIds = participants
          .slice(-Math.min(maxSubs, 2 * pageSize))
          .map((p) => p.id);
        break;
      // Any other page
      default:
        {
          const buffer = (maxSubs - pageSize) / 2;
          const min = (page - 1) * pageSize - buffer;
          const max = page * pageSize + buffer;
          renderedOrBufferedIds = participants.slice(min, max).map((p) => p.id);
        }
        break;
    }

    const subscribedIds = [];
    const stagedIds = [];

    // Decide whether to subscribe to or stage participants'
    // track based on visibility
    renderedOrBufferedIds.forEach((id) => {
      if (id !== "local") {
        if (visibleParticipants.some((vp) => vp.id === id)) {
          subscribedIds.push(id);
        } else {
          stagedIds.push(id);
        }
      }
    });

    return [subscribedIds, stagedIds];
  }, [page, pageSize, participants, visibleParticipants]);

  // Debounce update cam subscriptions when subscribed of staged IDs mutate
  // We use a deep compare memo here as useMemo will not compare arrays
  useDeepCompareEffect(() => {
    if (!subscribedIds || !stagedIds) return;
    const timeout = setTimeout(() => {
      updateCamSubscriptions(subscribedIds, stagedIds);
    }, 50);
    return () => clearTimeout(timeout);
  }, [subscribedIds, stagedIds, updateCamSubscriptions]);

  // Memoize our visible tiles to prevent unnecessary re-renders
  // Note: using a deep compare here so visible participants are memoized
  const tiles = useDeepCompareMemo(
    () =>
      visibleParticipants.map((p) => (
        <Tile
          participant={p}
          key={p.id}
          autoLayers={autoLayers}
          style={{
            maxHeight: tileHeight,
            maxWidth: tileWidth,
          }}
        />
      )),
    [tileWidth, tileHeight, autoLayers, visibleParticipants]
  );

  // -- Active speaker

  /**
   * Handle position updates based on active speaker events
   */
  const handleActiveSpeakerChange = useCallback(
    (peerId) => {
      if (!peerId) return;
      // active participant is already visible
      if (visibleParticipants.some(({ id }) => id === peerId)) return;
      // ignore repositioning when viewing page > 1
      if (page > 1) return;

      /**
       * We can now assume that
       * a) the user is looking at page 1
       * b) the most recent active participant is not visible on page 1
       * c) we'll have to promote the most recent participant's position to page 1
       *
       * To achieve that, we'll have to
       * - find the least recent active participant on page 1
       * - swap least & most recent active participant's position via setParticipantPosition
       */
      const sortedVisibleRemoteParticipants = visibleParticipants
        .filter(({ isLocal }) => !isLocal)
        .sort((a, b) => sortByKey(a, b, "lastActiveDate"));

      if (!sortedVisibleRemoteParticipants.length) return;

      swapParticipantPosition(sortedVisibleRemoteParticipants[0].id, peerId);
    },
    [page, swapParticipantPosition, visibleParticipants]
  );

  useEffect(() => {
    if (page > 1 || !activeParticipantId) return;
    handleActiveSpeakerChange(activeParticipantId);
  }, [activeParticipantId, handleActiveSpeakerChange, page]);

  // -- Receive settings

  /**
   * Set bandwidth layer based on amount of visible participants
   */
  useEffect(() => {
    if (!autoLayers) {
      return;
    }

    const count = visibleParticipants.length;
    const layer = count < 5 ? 2 : count < 10 ? 1 : 0;
    const receiveSettings = visibleParticipants.reduce(
      (settings, participant) => {
        if (participant.id === "local") return settings;
        settings[participant.id] = { video: { layer } };
        return settings;
      },
      {}
    );

    updateReceiveSettings(receiveSettings);
  }, [visibleParticipants, autoLayers, updateReceiveSettings]);

  return (
    <div className="container">
      <IconButton
        className="page-button prev"
        icon={ArrowLeftIcon}
        onClick={handlePrevClick}
        appearance="minimal"
        size="large"
        disabled={pages <= 1 || page <= 1}
      />
      <div ref={gridRef} className="grid">
        <div className="tiles">{tiles}</div>
      </div>
      <IconButton
        className="page-button next"
        icon={ArrowRightIcon}
        onClick={handleNextClick}
        appearance="minimal"
        size="large"
        disabled={pages <= 1 || page >= pages}
      />
      <style jsx>{`
        .container {
          display: grid;
          grid-template-columns: 40px auto 40px;
          width: 100%;
          flex: 1;
          align-items: center;
          overflow: hidden;
        }

        .grid {
          width: 100%;
          height: 100%;
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .grid .tiles {
          display: flex;
          flex-flow: row wrap;
          width: 100%;
          max-height: 100%;
          justify-content: center;
          align-items: center;
          margin: auto;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default PaginatedGrid;
