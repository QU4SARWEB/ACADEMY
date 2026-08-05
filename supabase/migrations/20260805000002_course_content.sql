CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL DEFAULT 'link' CHECK (material_type IN ('video', 'document', 'link', 'text')),
  resource_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_order ON public.course_modules(course_id, display_order);
CREATE INDEX IF NOT EXISTS idx_course_materials_module_order ON public.course_materials(module_id, display_order);
CREATE INDEX IF NOT EXISTS idx_material_progress_student ON public.course_material_progress(student_id);

CREATE OR REPLACE FUNCTION public.can_access_course_content(p_course_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_coach()
    OR EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE profile_id = p_profile_id AND course_id = p_course_id AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.course_assignments
      WHERE coach_id = p_profile_id AND course_id = p_course_id
    );
$$;

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_material_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_modules_read_access ON public.course_modules;
DROP POLICY IF EXISTS course_modules_manage_coach ON public.course_modules;
CREATE POLICY course_modules_read_access ON public.course_modules
  FOR SELECT USING (is_published AND public.can_access_course_content(course_id, auth.uid()));
CREATE POLICY course_modules_manage_coach ON public.course_modules
  FOR ALL USING (public.is_coach()) WITH CHECK (public.is_coach());

DROP POLICY IF EXISTS course_materials_read_access ON public.course_materials;
DROP POLICY IF EXISTS course_materials_manage_coach ON public.course_materials;
CREATE POLICY course_materials_read_access ON public.course_materials
  FOR SELECT USING (
    is_published AND EXISTS (
      SELECT 1 FROM public.course_modules cm
      WHERE cm.id = module_id AND public.can_access_course_content(cm.course_id, auth.uid())
    )
  );
CREATE POLICY course_materials_manage_coach ON public.course_materials
  FOR ALL USING (public.is_coach()) WITH CHECK (public.is_coach());

DROP POLICY IF EXISTS course_material_progress_read_own ON public.course_material_progress;
DROP POLICY IF EXISTS course_material_progress_insert_own ON public.course_material_progress;
DROP POLICY IF EXISTS course_material_progress_delete_own ON public.course_material_progress;
CREATE POLICY course_material_progress_read_own ON public.course_material_progress
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY course_material_progress_insert_own ON public.course_material_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY course_material_progress_delete_own ON public.course_material_progress
  FOR DELETE USING (student_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_materials TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.course_material_progress TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'course_modules') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_modules;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'course_materials') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_materials;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'course_material_progress') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_material_progress;
  END IF;
END
$$;
