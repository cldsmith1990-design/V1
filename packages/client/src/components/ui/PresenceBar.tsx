import { useGameStore } from '../../store/useGameStore';

export default function PresenceBar() {
  const roomUsers = useGameStore((s) => s.roomUsers);

  return (
    <div className="flex items-center gap-1">
      {roomUsers.map((user) => (
        <div
          key={user.id}
          title={`${user.name} (${user.role})${user.isOnline ? '' : ' — offline'}`}
          className={`relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-dungeon-900 transition-opacity ${
            user.isOnline ? 'opacity-100' : 'opacity-40'
          }`}
          style={{ background: user.color }}
        >
          {user.name[0]?.toUpperCase()}
          {user.role === 'dm' && (
            <span className="absolute -top-1 -right-1 text-[8px]">👑</span>
          )}
          {!user.isOnline && (
            <div className="absolute inset-0 rounded-full bg-dungeon-900/40" />
          )}
        </div>
      ))}
    </div>
  );
}
