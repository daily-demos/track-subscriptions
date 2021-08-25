import { useState, useMemo, useEffect } from "react";

// --- Constants

export const MIN_TILE_WIDTH = 280;
export const DEFAULT_ASPECT_RATIO = 16 / 9;

export const useAspectGrid = (
  gridRef,
  numTiles,
  customMaxTilesPerPage = 12
) => {
  // -- State
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [maxTilesPerPage] = useState(customMaxTilesPerPage);

  // -- Layout / UI

  // Update width and height of grid when window is resized
  useEffect(() => {
    if (!gridRef.current) {
      return;
    }

    let frame;
    const handleResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = gridRef.current?.clientWidth;
        const height = gridRef.current?.clientHeight;
        setDimensions({ width, height });
      });
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [gridRef]);

  // Memoized reference to the max columns and rows possible given screen size
  const [maxColumns, maxRows] = useMemo(() => {
    const { width, height } = dimensions;
    const columns = Math.max(1, Math.floor(width / MIN_TILE_WIDTH));
    const widthPerTile = width / columns;
    const rows = Math.max(1, Math.floor(height / (widthPerTile * (9 / 16))));
    return [columns, rows];
  }, [dimensions]);

  // Memoized count of how many tiles can we show per page
  const pageSize = useMemo(
    () => Math.min(maxColumns * maxRows, maxTilesPerPage),
    [maxColumns, maxRows, maxTilesPerPage]
  );

  // Calc and set the total number of pages as participant count mutates
  useEffect(() => {
    setPages(Math.ceil(numTiles / pageSize));
  }, [pageSize, numTiles]);

  // Make sure we never see a blank page (if we're on the last page and people leave)
  useEffect(() => {
    if (page <= pages) return;
    setPage(pages);
  }, [page, pages]);

  // Brutishly calculate the dimensions of each tile given the size of the grid
  const [tileWidth, tileHeight] = useMemo(() => {
    const { width, height } = dimensions;
    const n = Math.min(pageSize, numTiles);
    if (n === 0) return [width, height];
    const dims = [];
    for (let i = 1; i <= n; i += 1) {
      let maxWidthPerTile = (width - (i - 1)) / i;
      let maxHeightPerTile = maxWidthPerTile / DEFAULT_ASPECT_RATIO;
      const rows = Math.ceil(n / i);
      if (rows * maxHeightPerTile > height) {
        maxHeightPerTile = (height - (rows - 1)) / rows;
        maxWidthPerTile = maxHeightPerTile * DEFAULT_ASPECT_RATIO;
        dims.push([maxWidthPerTile, maxHeightPerTile]);
      } else {
        dims.push([maxWidthPerTile, maxHeightPerTile]);
      }
    }
    return dims.reduce(
      ([rw, rh], [w, h]) => {
        if (w * h < rw * rh) return [rw, rh];
        return [w, h];
      },
      [0, 0]
    );
  }, [dimensions, pageSize, numTiles]);

  return { page, pages, pageSize, setPage, tileWidth, tileHeight };
};
