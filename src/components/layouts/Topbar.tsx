import { Bell, Search, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { useAccountProfile } from '@/features/profile/hooks/useProfile';
import { roleLabel } from '@/features/profile/services/profileMappers';

export function Topbar() {
  const { account: profile, isLoading } = useAccountProfile();
  return (
    <header className="flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
        <input
          type="search"
          placeholder="Buscar vehiculos, conductores, ordenes..."
          className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-[#DFF6F1]"
        />
      </div>
      <div className="ml-6 flex items-center gap-4">
        <button type="button" className="relative text-slate-950 hover:text-[#0F766E]" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-white" />
        </button>
        <button type="button" className="text-slate-950 hover:text-[#0F766E]" aria-label="Configuracion">
          <Settings className="h-5 w-5" />
        </button>
        <div className="h-8 w-px bg-[#E2E8F0]" />
        {isLoading ? (
          <div role="status" aria-label="Cargando cuenta"><Skeleton className="h-9 w-32" /></div>
        ) : profile ? (
          <Link to="/profile" aria-label="Ver mi perfil" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[#0F766E]">
            <div className="hidden max-w-48 text-right sm:block">
              <p className="truncate text-sm font-bold leading-5 text-slate-950">{profile.name}</p>
              {profile.roles.length ? <p className="text-xs text-[#64748B]">{profile.roles.map(roleLabel).join(', ')}</p> : null}
            </div>
            <ProfileAvatar key={profile.auth0Subject} name={profile.name} photoUrl={profile.photoUrl} className="h-9 w-9" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
