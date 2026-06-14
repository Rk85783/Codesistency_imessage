import { ThemeProvider } from "./context/ThemeContext";
import { WallpaperContext } from "./context/wallpaper";
import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "@clerk/react";

function App() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <p>loading...</p>;

  return (
    <ThemeProvider>
      <WallpaperContext>
        <Routes>
          <Route path="/" element={isSignedIn ? <ChatPage /> : <Navigate to={"/auth"} replace />} />
          <Route path="/auth" element={!isSignedIn ? <AuthPage /> : <Navigate to={"/"} replace />} />
        </Routes>
      </WallpaperContext>
    </ThemeProvider>
  );
}

export default App;
