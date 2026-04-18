import { useState, useEffect, useRef } from 'react';
import { Upload, MapPin, Trash2, CheckCircle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { emitSetMap } from '../../socket/client';
import { useApi } from '../../hooks/useApi';
import type { MapData } from '@dnd/shared';

export default function MapManager() {
  const campaignId = useGameStore((s) => s.campaignId);
  const currentMap = useGameStore((s) => s.currentMap);
  const { token } = useAuthStore();

  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Upload form state
  const [mapName, setMapName] = useState('');
  const [gridWidth, setGridWidth] = useState(30);
  const [gridHeight, setGridHeight] = useState(20);
  const [cellSize, setCellSize] = useState(40);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const api = useApi();

  useEffect(() => {
    if (campaignId) loadMaps();
  }, [campaignId]);

  async function loadMaps() {
    if (!campaignId) return;
    setLoading(true);
    try {
      const data = await api.get<{ maps: MapData[] }>(`/maps/campaign/${campaignId}`);
      setMaps(data.maps);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File must be under 20 MB.');
      return;
    }
    setUploadError('');
    setSelectedFile(file);
    // Auto-fill name from filename if blank
    if (!mapName) {
      setMapName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    }
    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!selectedFile || !mapName.trim() || !campaignId) return;
    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('name', mapName.trim());
      formData.append('campaignId', campaignId);
      formData.append('gridWidth', String(gridWidth));
      formData.append('gridHeight', String(gridHeight));
      formData.append('cellSize', String(cellSize));

      const res = await fetch('/api/uploads/map', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error ?? 'Upload failed');
      }

      const data = await res.json() as { map: MapData };

      // Append to list and auto-set as active
      setMaps((prev) => [data.map, ...prev]);
      resetUploadForm();
      emitSetMap(data.map.id);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function resetUploadForm() {
    setShowUploadForm(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setMapName('');
    setGridWidth(30);
    setGridHeight(20);
    setCellSize(40);
    setUploadError('');
  }

  async function deleteMap(map: MapData) {
    if (!confirm(`Delete map "${map.name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/maps/${map.id}`);
      setMaps((prev) => prev.filter((m) => m.id !== map.id));
    } catch {
      alert('Failed to delete map.');
    }
  }

  return (
    <div className="p-3 space-y-3 text-xs">
      {/* Upload button */}
      {!showUploadForm && (
        <button
          onClick={() => setShowUploadForm(true)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Upload size={14} /> Upload Battlemap
        </button>
      )}

      {/* Upload form */}
      {showUploadForm && (
        <div className="panel p-3 space-y-3 border-parchment-400/20">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-parchment-200">New Battlemap</span>
            <button onClick={resetUploadForm} className="text-dungeon-400 hover:text-parchment-300">✕</button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-parchment-400 bg-parchment-400/10'
                : selectedFile
                ? 'border-green-600 bg-green-900/10'
                : 'border-dungeon-600 hover:border-dungeon-400'
            }`}
          >
            {previewUrl ? (
              <div className="space-y-1">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-24 object-cover rounded"
                />
                <div className="text-dungeon-400">{selectedFile?.name}</div>
              </div>
            ) : (
              <div className="text-dungeon-400 space-y-1">
                <Upload size={20} className="mx-auto opacity-50" />
                <div>Drop image here or click to browse</div>
                <div className="text-dungeon-500">JPEG, PNG, WebP — max 20 MB</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>

          {/* Map name */}
          <div>
            <label className="label">Map Name</label>
            <input
              className="input mt-1"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="e.g. Throne Room"
            />
          </div>

          {/* Grid dimensions */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Columns</label>
              <input
                className="input mt-1 text-center"
                type="number"
                min={5} max={100}
                value={gridWidth}
                onChange={(e) => setGridWidth(parseInt(e.target.value) || 30)}
              />
            </div>
            <div>
              <label className="label">Rows</label>
              <input
                className="input mt-1 text-center"
                type="number"
                min={5} max={100}
                value={gridHeight}
                onChange={(e) => setGridHeight(parseInt(e.target.value) || 20)}
              />
            </div>
            <div>
              <label className="label">Cell px</label>
              <input
                className="input mt-1 text-center"
                type="number"
                min={20} max={100} step={5}
                value={cellSize}
                onChange={(e) => setCellSize(parseInt(e.target.value) || 40)}
              />
            </div>
          </div>
          <p className="text-dungeon-500">
            Map size: {gridWidth * cellSize} × {gridHeight * cellSize} px
            ({gridWidth}×{gridHeight} grid squares)
          </p>

          {uploadError && (
            <div className="text-red-400 bg-red-900/20 border border-red-700 px-2 py-1.5 rounded">
              {uploadError}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !mapName.trim() || uploading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload & Set Active'}
          </button>
        </div>
      )}

      {/* Map list */}
      {loading ? (
        <div className="text-dungeon-500 text-center py-4">Loading maps...</div>
      ) : maps.length === 0 ? (
        <div className="text-dungeon-500 text-center py-4">
          No maps yet. Upload one above, or use the default campsite map.
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="label mb-1">Campaign Maps</div>
          {maps.map((map) => (
            <MapRow
              key={map.id}
              map={map}
              isActive={currentMap?.id === map.id}
              onSetActive={() => emitSetMap(map.id)}
              onDelete={() => deleteMap(map)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MapRow({
  map,
  isActive,
  onSetActive,
  onDelete,
}: {
  map: MapData;
  isActive: boolean;
  onSetActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded border transition-colors ${
        isActive
          ? 'border-parchment-400/50 bg-parchment-400/10'
          : 'border-dungeon-600/40 bg-dungeon-700/30 hover:bg-dungeon-700/50'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-12 h-10 shrink-0 rounded overflow-hidden bg-dungeon-700 border border-dungeon-600">
        {map.imageUrl ? (
          <img src={map.imageUrl} alt={map.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">🏕️</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="truncate font-semibold text-parchment-200">{map.name}</div>
        <div className="text-dungeon-500">{map.gridWidth}×{map.gridHeight} grid</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isActive ? (
          <CheckCircle size={14} className="text-green-400" title="Active map" />
        ) : (
          <button
            onClick={onSetActive}
            className="flex items-center gap-1 px-1.5 py-1 bg-dungeon-600 hover:bg-dungeon-500 rounded text-[10px] text-parchment-300 transition-colors"
            title="Set as active map"
          >
            <MapPin size={11} /> Use
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1 text-dungeon-500 hover:text-red-400 transition-colors"
          title="Delete map"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
