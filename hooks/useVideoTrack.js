import { useDeepCompareMemo } from "use-deep-compare";
import { useTracks } from "..//contexts/TracksProvider";

export const useVideoTrack = (id) => {
  const { videoTracks } = useTracks();

  const videoTrack = useDeepCompareMemo(
    () => videoTracks?.[id],
    [id, videoTracks]
  );

  /**
   * MediaStreamTrack's are difficult to compare.
   * Changes to a video track's id will likely need to be reflected in the UI / DOM.
   */
  return useDeepCompareMemo(() => {
    const videoTrack = videoTracks?.[id];
    if (
      videoTrack?.state === "off" ||
      videoTrack?.state === "blocked" ||
      (!videoTrack?.subscribed && id !== "local")
    )
      return null;
    return videoTrack?.persistentTrack;
  }, [id, videoTrack, videoTrack?.persistentTrack?.id]);
};

export default useVideoTrack;
