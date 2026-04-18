import { socket } from "../../lib/socket";
import { useSessionStore } from "../../lib/store";

export const DicePanel = () => {
  const room = useSessionStore((s) => s.room);
  if (!room) return null;

  return (
    <section>
      <h4>Dice</h4>
      <div className="row">
        <button onClick={() => socket.emit("dice:roll", { roomId: room.roomId, formula: "1d20+4", visibility: "public" })}>1d20+4</button>
        <button onClick={() => socket.emit("dice:roll", { roomId: room.roomId, formula: "2d6+3", visibility: "public" })}>2d6+3</button>
        <button onClick={() => socket.emit("dice:roll", { roomId: room.roomId, formula: "1d20+7", visibility: "gm" })}>GM Roll</button>
      </div>
    </section>
  );
};
