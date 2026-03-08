import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center p-6">
      <div className="text-center">
        <span className="text-5xl mb-4 block">🌿</span>
        <h1 className="text-2xl font-bold text-[#2C3E2D] mb-2">Path Not Found</h1>
        <p className="text-sm text-[#6B7B6E] mb-6">This garden path doesn&apos;t exist yet.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-[#2D5A3D] text-white px-6 py-3 rounded-2xl font-medium hover:bg-[#234A31] transition-colors"
        >
          <Home size={18} />
          Return to Garden
        </button>
      </div>
    </div>
  );
}
