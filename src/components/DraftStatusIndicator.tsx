import { Session } from '@/types';

interface DraftStatusIndicatorProps {
  session: Session;
  className?: string;
}

export function DraftStatusIndicator({ session, className = '' }: DraftStatusIndicatorProps) {
  const isShared = session.share_link_created;
  const isPdfExported = session.pdf_exported && !session.share_link_created;
  
  if (isShared) {
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

  if (isPdfExported) {
    return (
      <p className={`text-xs text-muted-foreground ${className}`}>
        PDF exported — not shared
      </p>
    );
  }

  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      Draft — not shared
    </p>
  );
}
