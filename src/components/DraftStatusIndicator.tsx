import { Session } from '@/types';

interface DraftStatusIndicatorProps {
  session: Session;
  className?: string;
}

export function DraftStatusIndicator({ session, className = '' }: DraftStatusIndicatorProps) {
  const isShared = session.share_link_created || session.pdf_exported;
  
  if (isShared) {
    // Format the date when it was shared/exported
    const sharedDate = session.updated_at 
      ? new Date(session.updated_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null;
    
    return (
      <p className={`text-xs text-muted-foreground ${className}`}>
        Shared{sharedDate ? ` on ${sharedDate}` : ''}
      </p>
    );
  }

  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      Draft — not shared
    </p>
  );
}
