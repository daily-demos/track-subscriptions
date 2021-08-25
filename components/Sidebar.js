import { useEffect, useMemo } from "react";
import { Badge, Table } from "evergreen-ui";
import { useParticipants } from "../contexts/ParticipantProvider";
import { useTracks } from "../contexts/TracksProvider";
import { sortByKey } from "../libs/sortByKey";

export const Aside = () => {
  const { participants } = useParticipants();
  const { videoTracks } = useTracks();

  // Sort participants by their position in the grid
  const sortedParticipants = useMemo(
    () => participants.sort((a, b) => sortByKey(a, b, "position")),
    [participants]
  );

  function renderSubscriptionBadge(participant) {
    // Local participant ignores subscriptions
    if (participant.id === "local") {
      return <Badge color="neutral">No subscription (local user)</Badge>;
    }

    if (participant.name.includes("Fake")) {
      return <Badge color="red">Unsubscribed (Fake)</Badge>;
    }

    // Get the status of the participants video track subscription
    const status = videoTracks[participant.id]?.subscribed;

    if (status === "staged") {
      return <Badge color="orange">Staged</Badge>;
    } else if (status) {
      return <Badge color="green">Subscribed</Badge>;
    }

    return <Badge color="red">Unsubscribed</Badge>;
  }

  if (!participants?.length) {
    return null;
  }

  return (
    <Table.Body>
      <Table.Head height="auto" padding={12}>
        <Table.TextCell>Participant</Table.TextCell>
        <Table.TextCell>Subscription status</Table.TextCell>
      </Table.Head>
      {sortedParticipants.map((p) => {
        return (
          <Table.Row key={p.id} height="auto" padding={12}>
            <Table.TextCell>{p.name}</Table.TextCell>
            <Table.TextCell>{renderSubscriptionBadge(p)}</Table.TextCell>
          </Table.Row>
        );
      })}
    </Table.Body>
  );
};

export default Aside;
