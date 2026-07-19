import React, { useState } from 'react';
import { CanvaGlassPanel, CanvaButton, CanvaInput } from '../../components/DesignSandbox';
import { playTacticalAlert } from './CanoeDataBus';

interface LegalGatekeeperProps {
  onAccept: (tier: 'tier_1' | 'tier_2', name: string, phone: string, roleType: string) => void;
}

export const LegalGatekeeper: React.FC<LegalGatekeeperProps> = ({ onAccept }) => {
  const [accepted, setAccepted] = useState(false);
  const [tier, setTier] = useState<'tier_1' | 'tier_2'>('tier_1');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleType, setRoleType] = useState('medical'); // medical, security, rescue_boat, general
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setError('You must accept the liability terms to proceed.');
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError('Please provide your name/callsign and active mobile phone number.');
      return;
    }

    // Play alert sound to confirm Web Audio permissions on interaction
    playTacticalAlert('single_beep');
    onAccept(tier, name.trim(), phone.trim(), tier === 'tier_2' ? roleType : 'general');
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center p-4 overflow-y-auto">
      <CanvaGlassPanel className="w-full max-w-lg border border-zinc-800 bg-zinc-900/90 shadow-2xl p-6 rounded-xl flex flex-col gap-4">
        {/* Branding header */}
        <div className="text-center">
          <h1 className="text-amber-500 font-black tracking-wider text-xl uppercase">
            CASCADIAEM SAFETY PORTAL
          </h1>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mt-1">
            AUXILIARY COORDINATION NETWORK
          </p>
        </div>

        {/* Scrollable Legal Box */}
        <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-lg text-xs text-zinc-400 max-h-48 overflow-y-auto leading-relaxed flex flex-col gap-2 font-mono">
          <p className="text-red-400 font-extrabold uppercase">
            ⚠️ CRITICAL WARNING: FAILURE-TO-ALERT LIABILITY DISCLAIMER
          </p>
          <p>
            1. This application is an <strong>AUXILIARY, INFORMATIONAL SAFETY AID</strong>. It does not replace established emergency services, radio networks, or direct 911 dispatch.
          </p>
          <p>
            2. <strong>TECHNICAL LIMITATIONS:</strong> Mobile browser tabs can sleep, lose cellular coverage, or fail to play audio alarms. Do not rely solely on this system for life safety.
          </p>
          <p>
            3. <strong>PRIMARY LIFELINES:</strong> If a safety boat rescue, medical emergency, or severe hazard occurs, immediately notify the Incident Commander via <strong>VHF Marine Radio Channel 16 / local frequencies</strong>, or dial <strong>911</strong>.
          </p>
          <p>
            4. <strong>LEGAL CONSENT:</strong> By checking agree, you acknowledge these conditions and waive any liability claims against the Incident Command staff or development team in the event of alert delivery failure.
          </p>
        </div>

        {/* Form controls */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex items-start gap-2.5 cursor-pointer bg-zinc-950/40 p-2.5 border border-zinc-800/60 rounded-lg select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                setError('');
              }}
              className="mt-1 h-4 w-4 accent-amber-500 cursor-pointer rounded"
            />
            <span className="text-zinc-300 text-xs font-semibold">
              I agree to the liability terms, failure-to-alert disclaimers, and operational mandates.
            </span>
          </label>

          {/* Tier Selection */}
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-zinc-400 text-xs font-black uppercase tracking-wider">
              Select Operational Tier
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTier('tier_1')}
                className={`py-2.5 rounded-lg font-black text-xs uppercase tracking-wider border transition-all ${
                  tier === 'tier_1'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100 shadow'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Tier I: Participant
              </button>
              <button
                type="button"
                onClick={() => setTier('tier_2')}
                className={`py-2.5 rounded-lg font-black text-xs uppercase tracking-wider border transition-all ${
                  tier === 'tier_2'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100 shadow'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Tier II: Responder
              </button>
            </div>
          </div>

          {/* Conditional Tier Fields */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-500 text-[9px] font-black uppercase tracking-wider block mb-1">
                  {tier === 'tier_2' ? 'Responder Name / Call Sign' : 'Canoe Name / ID'}
                </label>
                <CanvaInput
                  type="text"
                  placeholder={tier === 'tier_2' ? 'Medical 1' : 'Canoe Raven'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs py-2 bg-zinc-950 border-zinc-800"
                />
              </div>
              <div>
                <label className="text-zinc-500 text-[9px] font-black uppercase tracking-wider block mb-1">
                  On-Board Mobile Phone
                </label>
                <CanvaInput
                  type="tel"
                  placeholder="206-555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs py-2 bg-zinc-950 border-zinc-800"
                />
              </div>
            </div>

            {tier === 'tier_2' && (
              <div>
                <label className="text-zinc-500 text-[9px] font-black uppercase tracking-wider block mb-1">
                  Responder Specialty
                </label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-100 rounded-lg p-2 text-xs w-full focus:outline-none"
                >
                  <option value="medical">🏥 Medical Support</option>
                  <option value="security">🛡️ Field Security</option>
                  <option value="rescue_boat">🛶 Water Rescue / Boat</option>
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase">{error}</p>}

          <CanvaButton type="submit" variant="primary" className="w-full py-2.5 mt-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-widest">
            PROCEED TO OPERATIONAL SAFETY SYSTEM
          </CanvaButton>
        </form>
      </CanvaGlassPanel>
    </div>
  );
};
