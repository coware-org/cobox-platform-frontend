import { useState } from 'react';
import { cn } from '@/utils';

type ProfileAvatarProps = { name: string; photoUrl: string | null; className?: string };

export function ProfileAvatar({ name, photoUrl, className }: ProfileAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => [...part][0]).join('').toUpperCase();
  return (
    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F766E] font-semibold text-white', className)}>
      {photoUrl && photoUrl !== failedUrl ? (
        <img src={photoUrl} alt={`Foto de ${name}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailedUrl(photoUrl)} />
      ) : (
        <span role="img" aria-label={`Avatar de ${name}`}>{initials || 'U'}</span>
      )}
    </div>
  );
}
