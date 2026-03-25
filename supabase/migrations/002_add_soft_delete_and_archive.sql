-- =============================================================================
-- Migration: 002_add_soft_delete_and_archive
-- Purpose: Add soft-delete capabilities, archive table, and audit logging for reports
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Add soft-delete columns to reports table
-- -----------------------------------------------------------------------------
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Index for efficient querying of non-deleted reports
CREATE INDEX IF NOT EXISTS idx_reports_not_deleted 
ON public.reports(id) 
WHERE is_deleted = false;

-- Index for deleted reports
CREATE INDEX IF NOT EXISTS idx_reports_deleted 
ON public.reports(deleted_at) 
WHERE is_deleted = true;

-- -----------------------------------------------------------------------------
-- Step 2: Create deleted_reports_archive table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deleted_reports_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_id UUID NOT NULL,
    type TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_by UUID,
    assigned_to UUID,
    evidence TEXT,
    verification_comments TEXT,
    verification_documents TEXT[],
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    -- Deletion audit fields
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID REFERENCES public.profiles(id),
    deletion_reason TEXT,
    original_updated_at TIMESTAMPTZ
);

-- Index for archive queries
CREATE INDEX IF NOT EXISTS idx_deleted_reports_archive_original_id 
ON public.deleted_reports_archive(original_id);

CREATE INDEX IF NOT EXISTS idx_deleted_reports_archive_deleted_at 
ON public.deleted_reports_archive(deleted_at);

CREATE INDEX IF NOT EXISTS idx_deleted_reports_archive_deleted_by 
ON public.deleted_reports_archive(deleted_by);

-- -----------------------------------------------------------------------------
-- Step 3: Create deletion_audit_log table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deletion_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL,
    report_title TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('soft_delete', 'permanent_delete', 'restore', 'bulk_delete', 'bulk_restore')),
    performed_by UUID REFERENCES public.profiles(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    previous_status TEXT,
    new_status TEXT,
    ip_address TEXT,
    user_agent TEXT
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_report_id 
ON public.deletion_audit_log(report_id);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_performed_by 
ON public.deletion_audit_log(performed_by);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_performed_at 
ON public.deletion_audit_log(performed_at);

-- -----------------------------------------------------------------------------
-- Step 4: Enable RLS on new tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.deleted_reports_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for deleted_reports_archive - admins can read all, users can read their own
CREATE POLICY "Admins can read all archived reports"
    ON public.deleted_reports_archive FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can read their own archived reports"
    ON public.deleted_reports_archive FOR SELECT
    USING (deleted_by = auth.uid());

-- Policy for deletion_audit_log - only admins can read
CREATE POLICY "Admins can read deletion audit log"
    ON public.deletion_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- -----------------------------------------------------------------------------
-- Step 5: Create function to log deletion audit
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_deletion_audit(
    p_report_id UUID,
    p_report_title TEXT,
    p_action_type TEXT,
    p_performed_by UUID,
    p_reason TEXT DEFAULT NULL,
    p_previous_status TEXT DEFAULT NULL,
    p_new_status TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.deletion_audit_log (
        report_id,
        report_title,
        action_type,
        performed_by,
        reason,
        previous_status,
        new_status
    )
    VALUES (
        p_report_id,
        p_report_title,
        p_action_type,
        p_performed_by,
        p_reason,
        p_previous_status,
        p_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Step 6: Create function to archive report before deletion
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_report_before_deletion(
    p_report_id UUID,
    p_deleted_by UUID,
    p_deletion_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_report RECORD;
BEGIN
    -- Get the report data
    SELECT * INTO v_report
    FROM public.reports
    WHERE id = p_report_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;

    -- Insert into archive table
    INSERT INTO public.deleted_reports_archive (
        original_id,
        type,
        title,
        description,
        status,
        is_anonymous,
        created_by,
        assigned_to,
        evidence,
        verification_comments,
        verification_documents,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        deletion_reason,
        original_updated_at
    )
    VALUES (
        v_report.id,
        v_report.type,
        v_report.title,
        v_report.description,
        v_report.status,
        v_report.is_anonymous,
        v_report.created_by,
        v_report.assigned_to,
        v_report.evidence,
        v_report.verification_comments,
        v_report.verification_documents,
        v_report.created_at,
        v_report.updated_at,
        NOW(),
        p_deleted_by,
        p_deletion_reason,
        v_report.updated_at
    );

    -- Log the deletion in audit table
    PERFORM public.log_deletion_audit(
        p_report_id,
        v_report.title,
        'soft_delete',
        p_deleted_by,
        p_deletion_reason,
        v_report.status,
        'archived'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Step 7: Create function to restore report from archive
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_report_from_archive(
    p_original_id UUID,
    p_restored_by UUID
)
RETURNS void AS $$
DECLARE
    v_archive RECORD;
BEGIN
    -- Get the archived report
    SELECT * INTO v_archive
    FROM public.deleted_reports_archive
    WHERE original_id = p_original_id
    ORDER BY deleted_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Archived report not found';
    END IF;

    -- Update the report to restore it
    UPDATE public.reports
    SET 
        is_deleted = false,
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL,
        updated_at = NOW()
    WHERE id = p_original_id;

    -- Log the restore in audit table
    PERFORM public.log_deletion_audit(
        p_original_id,
        v_archive.title,
        'restore',
        p_restored_by,
        'Report restored from archive',
        'archived',
        v_archive.status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Step 8: Create function for bulk soft delete
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_archive_reports(
    p_report_ids UUID[],
    p_deleted_by UUID,
    p_deletion_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_report_id UUID;
    v_report RECORD;
BEGIN
    FOREACH v_report_id IN ARRAY p_report_ids
    LOOP
        -- Get the report data
        SELECT * INTO v_report
        FROM public.reports
        WHERE id = v_report_id;

        IF FOUND THEN
            -- Insert into archive table
            INSERT INTO public.deleted_reports_archive (
                original_id,
                type,
                title,
                description,
                status,
                is_anonymous,
                created_by,
                assigned_to,
                evidence,
                verification_comments,
                verification_documents,
                created_at,
                updated_at,
                deleted_at,
                deleted_by,
                deletion_reason,
                original_updated_at
            )
            VALUES (
                v_report.id,
                v_report.type,
                v_report.title,
                v_report.description,
                v_report.status,
                v_report.is_anonymous,
                v_report.created_by,
                v_report.assigned_to,
                v_report.evidence,
                v_report.verification_comments,
                v_report.verification_documents,
                v_report.created_at,
                v_report.updated_at,
                NOW(),
                p_deleted_by,
                p_deletion_reason,
                v_report.updated_at
            );

            -- Soft delete the report
            UPDATE public.reports
            SET 
                is_deleted = true,
                deleted_at = NOW(),
                deleted_by = p_deleted_by,
                deletion_reason = p_deletion_reason,
                updated_at = NOW()
            WHERE id = v_report_id;

            -- Log in audit table
            PERFORM public.log_deletion_audit(
                v_report_id,
                v_report.title,
                'bulk_delete',
                p_deleted_by,
                p_deletion_reason,
                v_report.status,
                'archived'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Step 9: Create function for bulk restore
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_restore_reports(
    p_original_ids UUID[],
    p_restored_by UUID
)
RETURNS void AS $$
DECLARE
    v_original_id UUID;
    v_archive RECORD;
BEGIN
    FOREACH v_original_id IN ARRAY p_original_ids
    LOOP
        -- Get the archived report
        SELECT * INTO v_archive
        FROM public.deleted_reports_archive
        WHERE original_id = v_original_id
        ORDER BY deleted_at DESC
        LIMIT 1;

        IF FOUND THEN
            -- Restore the report
            UPDATE public.reports
            SET 
                is_deleted = false,
                deleted_at = NULL,
                deleted_by = NULL,
                deletion_reason = NULL,
                updated_at = NOW()
            WHERE id = v_original_id;

            -- Log in audit table
            PERFORM public.log_deletion_audit(
                v_original_id,
                v_archive.title,
                'bulk_restore',
                p_restored_by,
                'Reports restored from archive',
                'archived',
                v_archive.status
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- End of migration
-- =============================================================================