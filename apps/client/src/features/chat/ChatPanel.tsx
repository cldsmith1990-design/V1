import { useSessionStore } from "../../lib/store";

export const ChatPanel = () => {
  const feed = useSessionStore((s) => s.feed);
  const members = useSessionStore((s) => s.room?.members ?? []);

  return (
    <section>
      <h3>Party Feed</h3>
      <p>Online: {members.map((m) => m.displayName).join(", ") || "No one"}</p>
      <ul className="feed">
        {feed.map((f, idx) => (
          <li key={`${f.timestamp}-${idx}`}>
            <strong>{f.type}</strong>
            <pre>{JSON.stringify(f.payload)}</pre>
          </li>
        ))}
      </ul>
    </section>
  );
};
