import { useEffect, useMemo, useState } from "react";
import { frameStyleFromUrl, getWallpaperById } from "../data/wallpapers";
import { WallpaperContext } from "./wallpaper";

const STORAGE_KEY = "chat-wallpaper-id";

function readStoredWallpaperId() {
  const wallpaperId = localStorage.getItem(STORAGE_KEY);
  if (wallpaperId) return wallpaperId;

  return "sonoma-horizon";
}

export function WallpaperProvider({ children }) {
  const [wallpaperId, setWallpaperIdState] = useState(readStoredWallpaperId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, wallpaperId);
  }, [wallpaperId]);

  const setWallpaperId = (id) => {
    setWallpaperIdState(id);
  };

  const wallpaper = useMemo(() => getWallpaperById(wallpaperId), [wallpaperId]);
  const frameStyle = useMemo(() => frameStyleFromUrl(wallpaper.url), [wallpaper.url]);

  const value = useMemo(
    () => ({ wallpaperId, setWallpaperId, wallpaper, frameStyle }),
    [wallpaperId, setWallpaperId, wallpaper, frameStyle],
  );

  return (
    <WallpaperContext.Provider value={value}>
      {children}
    </WallpaperContext.Provider>
  );
}
