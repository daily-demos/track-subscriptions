import { memo, useEffect, useRef } from "react";
import {
  Badge,
  IconButton,
  Menu,
  Popover,
  Position,
  MenuIcon,
} from "evergreen-ui";
import { DEFAULT_ASPECT_RATIO } from "../hooks/useAspectGrid";
import useVideoTrack from "../hooks/useVideoTrack";
import { useParticipants } from "../contexts/ParticipantProvider";

const Tile = ({ participant, autoLayers, ...props }) => {
  const { id, layer } = participant;
  const videoEl = useRef();
  const videoTrack = useVideoTrack(participant.id);
  const { setLayerForParticipant } = useParticipants();

  useEffect(() => {
    const video = videoEl.current;
    if (!video || !videoTrack) return;
    video.srcObject = new MediaStream([videoTrack]);
  }, [videoTrack]);

  return (
    <div className={`tile color-${participant.color}`} {...props}>
      <div className="overlay">
        <div>
          <Badge marginRight={6}>{participant.name}</Badge>
          <Badge color="teal">
            Layer: {layer === undefined ? "base" : layer}
          </Badge>
        </div>
        {!autoLayers && !id !== "local" && (
          <Popover
            position={Position.BOTTOM_RIGHT}
            content={
              <Menu>
                <Menu.Group title="Receive Layer">
                  <Menu.Item onSelect={() => setLayerForParticipant(id, 0)}>
                    Layer 0 (lowest)
                  </Menu.Item>
                  <Menu.Item onSelect={() => setLayerForParticipant(id, 1)}>
                    Layer 1
                  </Menu.Item>
                  <Menu.Item onSelect={() => setLayerForParticipant(id, 2)}>
                    Layer 2 (highest)
                  </Menu.Item>
                </Menu.Group>
              </Menu>
            }
          >
            <IconButton icon={MenuIcon} size="small" />
          </Popover>
        )}
      </div>
      <div className="content">
        <video
          autoPlay
          muted
          playsInline
          ref={videoEl}
          className={videoTrack ? "play" : "pause"}
        />
      </div>

      <style jsx>{`
        .tile {
          min-width: 1px;
          overflow: hidden;
          position: relative;
          width: 100%;
          border: 1px solid white;
          user-select: none;
        }

        .tile .content {
          padding-bottom: ${100 / DEFAULT_ASPECT_RATIO}%;
          overflow: hidden;
          background: #696f8c;
        }

        .tile video {
          height: calc(100% + 4px);
          width: calc(100% + 4px);
          left: -2px;
          object-position: center;
          position: absolute;
          top: -2px;
          z-index: 1;
          object-fit: contain;
        }

        .tile video.pause {
          display: none;
        }

        .tile .overlay {
          position: absolute;
          top: 6px;
          left: 6px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          right: 6px;
          z-index: 9;
        }

        .tile .overlay strong {
          transition: all 1s linear;
        }

        .tile.color-1 .content {
          background: #2952cc;
        }
        .tile.color-2 .content {
          background: #adc2ff;
        }
        .tile.color-3 .content {
          background: #d14343;
        }
        .tile.color-4 .content {
          background: #ee9191;
        }
        .tile.color-5 .content {
          background: #317159;
        }
        .tile.color-6 .content {
          background: #75caaa;
        }
        .tile.color-7 .content {
          background: #6e62b6;
        }
        .tile.color-8 .content {
          background: #696f8c;
        }
        .tile.color-9 .content {
          background: #474d66;
        }
        .tile.color-10 .content {
          background: #ffb020;
        }
      `}</style>
    </div>
  );
};

export default memo(
  Tile,
  (p, n) =>
    p.participant?.id !== n.participant?.id &&
    p.participant?.layer !== n.participant?.layer &&
    p.autoLayers !== n.autoLayers
);
