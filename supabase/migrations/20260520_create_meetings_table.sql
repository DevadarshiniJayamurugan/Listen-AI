-- SQL Migration for Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL, -- duration in seconds
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL DEFAULT 'Sync',
  audio_url TEXT,
  transcript JSONB NOT NULL, -- Stores array of diarized segments
  summary JSONB NOT NULL, -- Stores TLDR and key decisions
  action_items JSONB NOT NULL, -- Stores checklists
  chat_history JSONB NOT NULL DEFAULT '[]'::jsonb, -- Stores custom Q&A chat history
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Users can view their own meetings"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meetings"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings"
  ON public.meetings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow deletion of meetings
CREATE POLICY "Users can delete their own meetings"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings(user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_meetings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meetings_updated_at_column();
