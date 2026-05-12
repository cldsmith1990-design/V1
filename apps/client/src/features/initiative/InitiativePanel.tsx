import { useSessionStore } from "../../lib/store";

export const InitiativePanel = () => {
  const room = useSessionStore((s) => s.room);
  if (!room) return null;

  return (
    <section>
      <h4>Initiative</h4>
      <p>Round {room.round}</p>
      <ol>
        {room.initiative.map((entry, i) => (
          <li key={entry.tokenId} className={i === room.currentTurnIndex ? "active-turn" : ""}>
            {entry.tokenId} ({entry.initiative})
          </li>
        ))}
      </ol>
    </section>
  );
};
