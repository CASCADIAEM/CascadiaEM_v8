import React, { useState, useEffect } from 'react';
import { LegalGatekeeper } from './LegalGatekeeper';
import { ParticipantPortal } from './ParticipantPortal';
import { ResponderPortal } from './ResponderPortal';
import { ICCommandDashboard } from './ICCommandDashboard';

export const CanoeLandingContainer: React.FC = () => {
  const [ulaAccepted, setUlaAccepted] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    tier: 'tier_1' | 'tier_2' | 'tier_3';
    name: string;
    phone: string;
    roleType: string;
  } | null>(null);

  // Load acceptance state on mount
  useEffect(() => {
    // Check if the URL has an IC bypass query (e.g., ?ic=true) or if Command is saved
    const params = new URLSearchParams(window.location.search);
    const isICQuery = params.get('ic') === 'true';

    const savedUla = localStorage.getItem('cem_canoe_ula_accepted');
    const savedProfile = localStorage.getItem('cem_canoe_user_profile');

    if (isICQuery) {
      setUlaAccepted(true);
      setUserProfile({
        tier: 'tier_3',
        name: 'Command - Overhead Unit',
        phone: '911',
        roleType: 'command'
      });
      return;
    }

    if (savedUla === 'true' && savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setUlaAccepted(true);
        setUserProfile(parsed);
      } catch {
        // Fallback if corrupted
        localStorage.removeItem('cem_canoe_ula_accepted');
        localStorage.removeItem('cem_canoe_user_profile');
      }
    }
  }, []);

  const handleAcceptULA = (selectedTier: 'tier_1' | 'tier_2', name: string, phone: string, roleType: string) => {
    // Check if name has a secret keyword for IC, or if they check in with an 'IC' tag
    let finalTier: 'tier_1' | 'tier_2' | 'tier_3' = selectedTier;
    
    if (name.toLowerCase() === 'ic_command' || name.toLowerCase() === 'admin_ic') {
      finalTier = 'tier_3';
    }

    const profile = { tier: finalTier, name, phone, roleType };
    localStorage.setItem('cem_canoe_ula_accepted', 'true');
    localStorage.setItem('cem_canoe_user_profile', JSON.stringify(profile));
    
    setUserProfile(profile);
    setUlaAccepted(true);
  };

  const handleResetProfile = () => {
    localStorage.removeItem('cem_canoe_ula_accepted');
    localStorage.removeItem('cem_canoe_user_profile');
    setUlaAccepted(false);
    setUserProfile(null);
    // Refresh to clear cache
    window.location.reload();
  };

  if (!ulaAccepted || !userProfile) {
    return <LegalGatekeeper onAccept={handleAcceptULA} />;
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      {/* Dynamic Module Routing */}
      {userProfile.tier === 'tier_3' && <ICCommandDashboard />}
      {userProfile.tier === 'tier_2' && (
        <ResponderPortal 
          name={userProfile.name} 
          phone={userProfile.phone} 
          roleType={userProfile.roleType} 
        />
      )}
      {userProfile.tier === 'tier_1' && (
        <ParticipantPortal 
          name={userProfile.name} 
          phone={userProfile.phone} 
        />
      )}

      {/* Safety Escape Hatch Reset Button on Mobile viewports */}
      <button
        onClick={handleResetProfile}
        className="fixed bottom-2 right-2 z-40 bg-zinc-900/60 hover:bg-zinc-800 text-[8px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 font-extrabold px-2.5 py-1 border border-zinc-850 rounded"
      >
        Reset Role
      </button>
    </div>
  );
};
export default CanoeLandingContainer;
