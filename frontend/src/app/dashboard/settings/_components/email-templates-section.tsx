'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Edit2, RotateCcw, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useGetEmailTemplateQuery,
  useUpsertEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
} from '@/redux/actions/mail-ingestion';

// ─── Config ───────────────────────────────────────────────────────────────────

const TEMPLATE_DEFS = [
  {
    type: 'accept',
    label: 'Application Accepted',
    description: 'Sent when an applicant is accepted / hired',
  },
  {
    type: 'reject',
    label: 'Application Rejected',
    description: 'Sent when an applicant is rejected',
  },
  {
    type: 'interview',
    label: 'Interview Invitation',
    description: 'Sent when an interview is scheduled',
  },
  {
    type: 'interviewAssignment',
    label: 'Interview Time-Slot Assignment',
    description: 'Sent when an applicant is asked to pick a time slot',
  },
] as const;

const HANDLEBARS_HINT =
  'Handlebars variables: {{applicantName}}, {{jobTitle}}, {{companyName}}, {{companyEmail}}, {{interviewDate}}, {{interviewTime}}, {{interviewLocation}}, {{meetingLink}}, {{feedback}}, {{salary}}, {{startDate}}, {{logoUrl}}, {{websiteUrl}}, {{year}}';

// ─── Single template row ──────────────────────────────────────────────────────

interface TemplateRowProps {
  type: string;
  label: string;
  description: string;
}

function TemplateRow({ type, label, description }: TemplateRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  const { data, refetch, isFetching } = useGetEmailTemplateQuery(type);
  const [upsert, { isLoading: isSaving }] = useUpsertEmailTemplateMutation();
  const [deleteTemplate, { isLoading: isDeleting }] = useDeleteEmailTemplateMutation();

  const customTemplate = data?.data ?? null;
  const isCustom = !!customTemplate;

  const handleOpenEdit = () => {
    setSubject(customTemplate?.subject ?? '');
    setHtmlContent(customTemplate?.htmlContent ?? '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast.error('Subject and HTML content are required');
      return;
    }
    try {
      await upsert({ type, body: { subject, htmlContent } }).unwrap();
      toast.success(`"${label}" template saved`);
      setEditOpen(false);
      void refetch();
    } catch {
      // global error handler
    }
  };

  const handleReset = async () => {
    try {
      await deleteTemplate(type).unwrap();
      toast.success(`"${label}" reverted to system default`);
      void refetch();
    } catch {
      // global error handler
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {isFetching ? (
            <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin text-muted-foreground" />
          ) : isCustom ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            className={
              isCustom
                ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25 text-xs'
                : 'bg-muted text-muted-foreground text-xs'
            }
          >
            {isCustom ? 'Custom' : 'System Default'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleOpenEdit}
          >
            <Edit2 className="h-3.5 w-3.5" />
            {isCustom ? 'Edit' : 'Customize'}
          </Button>

          {isCustom && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-0 shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to System Default?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your custom &quot;{label}&quot; template. The system default
                    will be used going forward.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Reset to Default
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-emerald-500" />
              Customize: {label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor={`subject-${type}`}>Email Subject</Label>
              <Input
                id={`subject-${type}`}
                placeholder="e.g. Your application for {{jobTitle}} at {{companyName}}"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`html-${type}`}>HTML Content</Label>
              <Textarea
                id={`html-${type}`}
                placeholder="<p>Dear {{applicantName}},</p>..."
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="font-mono text-xs min-h-[280px] resize-y"
              />
            </div>

            <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3 leading-relaxed border">
              {HANDLEBARS_HINT}
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving…' : 'Save Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function EmailTemplatesSection() {
  return (
    <div className="space-y-3">
      {TEMPLATE_DEFS.map((t) => (
        <TemplateRow key={t.type} type={t.type} label={t.label} description={t.description} />
      ))}
    </div>
  );
}
