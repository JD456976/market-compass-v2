
-- Phase 2: Property Documents table and storage

-- 1. Create property_documents table
CREATE TABLE public.property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_size_bytes integer,
  storage_path text NOT NULL,
  raw_text text,
  extracted_fields jsonb DEFAULT '{}'::jsonb,
  field_confidence jsonb DEFAULT '{}'::jsonb,
  field_evidence jsonb DEFAULT '{}'::jsonb,
  mls_compliance_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'extracted', 'reviewed', 'approved')),
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Agents can manage their own documents
CREATE POLICY "Agents can manage own documents"
  ON public.property_documents FOR ALL
  USING (agent_user_id = auth.uid())
  WITH CHECK (agent_user_id = auth.uid());

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
  ON public.property_documents FOR SELECT
  USING (public.is_admin_user());

-- Updated_at trigger
CREATE TRIGGER update_property_documents_updated_at
  BEFORE UPDATE ON public.property_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Create storage bucket for property documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: agents can upload/read their own documents
CREATE POLICY "Agents can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Agents can view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Agents can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
