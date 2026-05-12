import { useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { Application, Container, Graphics, Text } from "pixi.js";
import { socket } from "../../lib/socket";
import { useSessionStore } from "../../lib/store";
import { starterMap } from "@vtt/shared";
import { DicePanel } from "../dice/DicePanel";
import { ChatPanel } from "../chat/ChatPanel";
import { InitiativePanel } from "../initiative/InitiativePanel";

const drawScene = (app: Application, room = useSessionStore.getState().room) => {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, starterMap.width * 32, starterMap.height * 32).fill(0x6d8d57);
  root.addChild(bg);

  for (let x = 0; x <= starterMap.width; x++) {
    root.addChild(new Graphics().moveTo(x * 32, 0).lineTo(x * 32, starterMap.height * 32).stroke({ color: 0x8aa174, width: 1, alpha: 0.35 }));
  }
  for (let y = 0; y <= starterMap.height; y++) {
    root.addChild(new Graphics().moveTo(0, y * 32).lineTo(starterMap.width * 32, y * 32).stroke({ color: 0x8aa174, width: 1, alpha: 0.35 }));
  }

  starterMap.sceneObjects.forEach((obj) => {
    const g = new Graphics();
    if (obj.type === "tent") g.roundRect(obj.x * 32, obj.y * 32, 48, 32, 6).fill(0xc7b08a);
    if (obj.type === "campfire") g.circle(obj.x * 32, obj.y * 32, 10).fill(0xff7d32);
    if (obj.type === "log") g.roundRect(obj.x * 32, obj.y * 32, 36, 8, 3).fill(0x76502f);
    root.addChild(g);
  });

  room?.tokens.forEach((token) => {
    const tokenCircle = new Graphics().circle(token.x * 32, token.y * 32, 12).fill(token.type === "monster" ? 0xbf3b3b : 0x2f7ed8);
    root.addChild(tokenCircle);
    root.addChild(new Text({ text: token.label, x: token.x * 32 - 16, y: token.y * 32 + 14, style: { fill: "#fff", fontSize: 10 } }));
  });

  app.stage.removeChildren();
  app.stage.addChild(root);
};

export const RoomPage = () => {
  const { roomCode = "CAMP01" } = useParams();
  const canvasRef = useRef<HTMLDivElement>(null);
  const session = useSessionStore((s) => ({ token: s.token!, displayName: s.displayName!, room: s.room, role: s.role }));
  const actions = useMemo(
    () => ({
      setRoom: useSessionStore.getState().setRoom,
      setPresence: useSessionStore.getState().setPresence,
      patchToken: useSessionStore.getState().patchToken,
      pushFeed: useSessionStore.getState().pushFeed,
      setMovementLock: useSessionStore.getState().setMovementLock
    }),
    []
  );

  useEffect(() => {
    socket.connect();

    socket.emit(
      "room:join",
      { roomCode, token: session.token, displayName: session.displayName },
      (res: { ok: boolean; snapshot?: unknown; error?: string }) => {
        if (res.ok && res.snapshot) actions.setRoom(res.snapshot as any);
        else console.error(res.error);
      }
    );

    socket.on("presence:update", actions.setPresence);
    socket.on("state:delta", (event) => {
      actions.pushFeed(event);
      if (event.type === "token:moved") actions.patchToken(event.payload.tokenId, event.payload.x, event.payload.y);
      if (event.type === "room:movementLock") actions.setMovementLock(event.payload.locked);
    });

    return () => {
      socket.off("presence:update", actions.setPresence);
      socket.off("state:delta");
      socket.disconnect();
    };
  }, [actions, roomCode, session.displayName, session.token]);

  useEffect(() => {
    const mount = canvasRef.current;
    if (!mount || !session.room) return;

    const app = new Application();
    app.init({ width: 920, height: 620, background: 0x283626 }).then(() => {
      mount.appendChild(app.canvas);
      drawScene(app, session.room);
    });

    return () => {
      app.destroy(true, { children: true });
    };
  }, [session.room]);

  const attemptMove = () => {
    if (!session.room) return;
    socket.emit("token:move", {
      roomId: session.room.roomId,
      tokenId: "token_pc_1",
      x: Math.floor(10 + Math.random() * 20),
      y: Math.floor(8 + Math.random() * 10)
    });
  };

  const toggleLock = () => {
    if (!session.room || session.role !== "dm") return;
    socket.emit("dm:movement-lock", !session.room.movementLocked);
  };

  return (
    <div className="room-shell">
      <aside className="left-panel">
        <h3>Session</h3>
        <p>Room: {roomCode}</p>
        <p>Role: {session.role}</p>
        <button onClick={attemptMove}>Move Owned Token</button>
        {session.role === "dm" && (
          <button onClick={toggleLock}>{session.room?.movementLocked ? "Unlock Player Move" : "Lock Player Move"}</button>
        )}
        <InitiativePanel />
        <DicePanel />
      </aside>
      <main className="tabletop-stage" ref={canvasRef} />
      <aside className="right-panel">
        <ChatPanel />
      </aside>
    </div>
  );
};
