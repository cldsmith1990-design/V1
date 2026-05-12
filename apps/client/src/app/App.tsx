import { Link, Navigate, Route, Routes } from "react-router-dom";
import { RoomPage } from "../features/tabletop/RoomPage";
import { useSessionStore } from "../lib/store";

const LoginPage = () => {
  const setSession = useSessionStore((s) => s.setSession);

  const quickLogin = (role: "dm" | "player") => {
    const payload = {
      userId: role === "dm" ? "seed-dm-1" : "seed-player-1",
      displayName: role === "dm" ? "DungeonMaster" : "RangerPlayer",
      role
    };
    const token = btoa(JSON.stringify(payload));
    setSession({ token, ...payload });
  };

  return (
    <div className="screen-center">
      <h1>V1 Tabletop</h1>
      <p>Login scaffold (replace with real auth form).</p>
      <div className="row">
        <button onClick={() => quickLogin("dm")}>Quick Login as DM</button>
        <button onClick={() => quickLogin("player")}>Quick Login as Player</button>
      </div>
      <Link to="/room/CAMP01">Go to room CAMP01</Link>
    </div>
  );
};

export const App = () => {
  const token = useSessionStore((s) => s.token);

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/room/:roomCode" element={token ? <RoomPage /> : <Navigate to="/" replace />} />
    </Routes>
  );
};
