import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientFeedbackProps {
  reportId: string;
  shareToken: string;
}

export function ClientFeedback({ reportId, shareToken }: ClientFeedbackProps) {
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getViewerId = () => {
    let viewerId = localStorage.getItem('report_viewer_id');
    if (!viewerId) {
      viewerId = crypto.randomUUID();
      localStorage.setItem('report_viewer_id', viewerId);
    }
    return viewerId;
  };

  const handleSubmit = async (selectedRating: 'helpful' | 'not_helpful') => {
    if (submitting) return;
    setSubmitting(true);
    setRating(selectedRating);

    try {
      await supabase.from('report_feedback').insert({
        report_id: reportId,
        share_token: shareToken,
        viewer_id: getViewerId(),
        rating: selectedRating,
        comment: comment || null,
      } as any);
      setSubmitted(true);
    } catch {
      // Silently fail - feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from('report_feedback').insert({
        report_id: reportId,
        share_token: shareToken,
        viewer_id: getViewerId(),
        rating,
        comment,
      } as any);
      setSubmitted(true);
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="pdf-exclude"
      >
        <Card className="border-border/30 bg-muted/30">
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-accent mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Thanks for your feedback!</p>
            <p className="text-xs text-muted-foreground mt-1">Your input helps improve future reports.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="pdf-exclude">
      <Card className="border-border/30 bg-muted/30">
        <CardContent className="py-6">
          <p className="text-sm font-medium text-foreground text-center mb-4">
            Was this report helpful?
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={rating === 'helpful' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (!showComment) {
                  handleSubmit('helpful');
                } else {
                  setRating('helpful');
                }
              }}
              disabled={submitting}
              className="min-h-[44px] gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Helpful
            </Button>
            <Button
              variant={rating === 'not_helpful' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setRating('not_helpful');
                setShowComment(true);
              }}
              disabled={submitting}
              className="min-h-[44px] gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Not Helpful
            </Button>
          </div>

          <AnimatePresence>
            {showComment && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  <Textarea
                    placeholder="Any additional comments or questions? (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleCommentSubmit}
                      disabled={submitting}
                      className="min-h-[44px]"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Feedback
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
