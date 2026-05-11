import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Users, Map, Sword } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useApi } from '../hooks/useApi';
import type { CampaignMeta, SessionMeta } from '@dnd/shared';

interface CampaignWithSessions extends CampaignMeta {
  sessions?: SessionMeta[];
  _count?: { sessions: number };
  owner?: { id: string; name: string };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const api = useApi();

  const [campaigns, setCampaigns] = useState<CampaignWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showJoinCampaign, setShowJoinCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithSessions | null>(null);
  const [newSessionName, setNewSessionName] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const data = await api.get<{ campaigns: CampaignWithSessions[] }>('/campaigns');
      setCampaigns(data.campaigns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    if (!newCampaignName.trim()) return;
    try {
      await api.post('/campaigns', { name: newCampaignName.trim() });
      setNewCampaignName('');
      setShowCreateCampaign(false);
      loadCampaigns();
    } catch (err) {
      console.error(err);
    }
  }

  async function joinCampaign() {
    if (!inviteCode.trim()) return;
    try {
      const data = await api.post<{ campaign: CampaignWithSessions }>('/campaigns/join', {
        inviteCode: inviteCode.trim(),
      });
      setInviteCode('');
      setShowJoinCampaign(false);
      // Load the campaign details
      const full = await api.get<{ campaign: CampaignWithSessions }>(`/campaigns/${data.campaign.id}`);
      setCampaigns((prev) => {
        const exists = prev.some((c) => c.id === full.campaign.id);
        return exists ? prev : [...prev, full.campaign];
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function createSession(campaignId: string) {
    try {
      const data = await api.post<{ session: SessionMeta }>(`/campaigns/${campaignId}/sessions`, {
        name: newSessionName || `Session ${new Date().toLocaleDateString()}`,
      });
      setNewSessionName('');
      setSelectedCampaign(null);
      navigate(`/session/${data.session.id}`);
    } catch (err) {
      console.error(err);
    }
  }

  async function openSession(campaignId: string, sessionId: string) {
    try {
      await api.post(`/campaigns/${campaignId}/sessions/${sessionId}/join`, {});
      navigate(`/session/${sessionId}`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-dungeon-900 text-parchment-100">
      {/* Header */}
      <header className="border-b border-dungeon-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎲</span>
          <h1 className="fantasy-heading text-xl font-bold">Tavern Table</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-dungeon-900"
              style={{ background: user?.avatarColor ?? '#60a5fa' }}
            >
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-sm text-parchment-300">{user?.name}</span>
          </div>
          <button
            onClick={() => { clearAuth(); navigate('/login'); }}
            className="btn-secondary flex items-center gap-1 text-xs"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="fantasy-heading text-2xl">Your Campaigns</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowJoinCampaign(true)} className="btn-secondary flex items-center gap-2">
              <Users size={16} /> Join via Invite
            </button>
            <button onClick={() => setShowCreateCampaign(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Campaign
            </button>
          </div>
        </div>

        {/* Create Campaign modal */}
        {showCreateCampaign && (
          <div className="panel p-4 mb-4 border-parchment-400/30">
            <h3 className="text-sm font-semibold mb-3 text-parchment-300">Create Campaign</h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Campaign name..."
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCampaign()}
                autoFocus
              />
              <button onClick={createCampaign} className="btn-primary">Create</button>
              <button onClick={() => setShowCreateCampaign(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Join Campaign modal */}
        {showJoinCampaign && (
          <div className="panel p-4 mb-4 border-parchment-400/30">
            <h3 className="text-sm font-semibold mb-3 text-parchment-300">Join Campaign</h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Paste invite code..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && joinCampaign()}
                autoFocus
              />
              <button onClick={joinCampaign} className="btn-primary">Join</button>
              <button onClick={() => setShowJoinCampaign(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Campaign List */}
        {loading ? (
          <div className="text-center text-dungeon-400 py-16">Loading your campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-dungeon-400">
            <div className="text-4xl mb-4">📜</div>
            <p>No campaigns yet. Create one or join via invite link.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                isOwner={campaign.ownerId === user?.id}
                onCreateSession={() => setSelectedCampaign(campaign)}
                onOpenSession={openSession}
              />
            ))}
          </div>
        )}

        {/* Create Session modal */}
        {selectedCampaign && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="panel p-6 w-full max-w-md">
              <h3 className="fantasy-heading text-xl mb-4">New Session</h3>
              <p className="text-dungeon-400 text-sm mb-4">Campaign: {selectedCampaign.name}</p>
              <input
                className="input mb-4"
                placeholder={`Session ${new Date().toLocaleDateString()}`}
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => createSession(selectedCampaign.id)} className="btn-primary flex-1">
                  Start Session
                </button>
                <button onClick={() => setSelectedCampaign(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CampaignCard({
  campaign,
  isOwner,
  onCreateSession,
  onOpenSession,
}: {
  campaign: CampaignWithSessions;
  isOwner: boolean;
  onCreateSession: () => void;
  onOpenSession: (campaignId: string, sessionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const api = useApi();

  async function loadSessions() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    setLoadingSessions(true);
    try {
      const data = await api.get<{ campaign: { sessions: SessionMeta[] } }>(`/campaigns/${campaign.id}`);
      setSessions(data.campaign.sessions ?? []);
    } finally {
      setLoadingSessions(false);
    }
  }

  const inviteUrl = `${window.location.origin}/login?invite=${campaign.inviteCode}`;

  return (
    <div className="panel overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-dungeon-700/50 transition-colors"
        onClick={loadSessions}
      >
        <div className="flex items-center gap-3">
          <Map size={18} className="text-parchment-400" />
          <div>
            <div className="font-semibold">{campaign.name}</div>
            <div className="text-xs text-dungeon-400">
              {isOwner ? 'Dungeon Master' : `DM: ${campaign.owner?.name ?? 'Unknown'}`}
              {' · '}
              {campaign._count?.sessions ?? 0} session(s)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); onCreateSession(); }}
              className="btn-primary flex items-center gap-1 text-xs"
            >
              <Sword size={12} /> New Session
            </button>
          )}
          <span className="text-dungeon-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-dungeon-700 px-5 py-3 space-y-2 bg-dungeon-900/40">
          {/* Invite link (DM only) */}
          {isOwner && (
            <div className="flex items-center gap-2 text-xs text-dungeon-400 mb-3">
              <span>Invite:</span>
              <code className="bg-dungeon-700 px-2 py-0.5 rounded text-parchment-300 select-all">
                {campaign.inviteCode}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="text-parchment-400 hover:text-parchment-200 underline"
              >
                Copy link
              </button>
            </div>
          )}

          {loadingSessions ? (
            <div className="text-dungeon-500 text-sm py-2">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-dungeon-500 text-sm py-2">No sessions yet.</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onOpenSession(campaign.id, session.id)}
                className="flex items-center justify-between p-3 bg-dungeon-700/50 hover:bg-dungeon-700 rounded-md cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{session.name}</div>
                  <div className="text-xs text-dungeon-400">
                    {new Date(session.createdAt).toLocaleDateString()}
                    {session.isActive ? ' · Active' : ' · Ended'}
                  </div>
                </div>
                <button className="btn-secondary text-xs">Enter →</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
