-- =============================================================================
-- Migration: 003_add_rpc_functions
-- Purpose: Add RPC functions for soft-delete, restore, and permanent delete
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: Soft delete a report (marks as deleted, archives, and logs audit)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_report(
    p_report_id UUID,
    p_deleted_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_report RECORD;
    v_updated_rows INT;
BEGIN
    -- Get the report data
    SELECT * INTO v_report
    FROM public.reports
    WHERE id = p_report_id;

    IF NOT FOUND THEN
        RETURN false;
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
        p_reason,
        v_report.updated_at
    );

    -- Soft delete the report
    UPDATE public.reports
    SET 
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = p_deleted_by,
        deletion_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_report_id;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    -- Log the deletion in audit table
    PERFORM public.log_deletion_audit(
        p_report_id,
        v_report.title,
        'soft_delete',
        p_deleted_by,
        p_reason,
        v_report.status,
        'archived'
    );

    RETURN v_updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: Restore a soft-deleted report
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_report(
    p_report_id UUID,
    p_restored_by UUID
)
RETURNS boolean AS $$
DECLARE
    v_report RECORD;
    v_updated_rows INT;
BEGIN
    -- Get the report data
    SELECT * INTO v_report
    FROM public.reports
    WHERE id = p_report_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Restore the report
    UPDATE public.reports
    SET 
        is_deleted = false,
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL,
        updated_at = NOW()
    WHERE id = p_report_id;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    -- Log the restore in audit table
    PERFORM public.log_deletion_audit(
        p_report_id,
        v_report.title,
        'restore',
        p_restored_by,
        'Report restored from archive',
        'archived',
        v_report.status
    );

    RETURN v_updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: Permanently delete a report (removes from both reports and archive)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.permanently_delete_report(
    p_report_id UUID
)
RETURNS boolean AS $$
DECLARE
    v_report RECORD;
    v_deleted_by UUID;
    v_report_title TEXT;
    v_updated_rows INT;
BEGIN
    -- Get the report data to capture deleted_by and title for audit
    SELECT * INTO v_report
    FROM public.reports
    WHERE id = p_report_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    v_deleted_by := v_report.deleted_by;
    v_report_title := v_report.title;

    -- Delete from archive table
    DELETE FROM public.deleted_reports_archive
    WHERE original_id = p_report_id;

    -- Permanently delete the report
    DELETE FROM public.reports
    WHERE id = p_report_id;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    -- Log the permanent deletion in audit table
    IF v_deleted_by IS NOT NULL THEN
        PERFORM public.log_deletion_audit(
            p_report_id,
            v_report_title,
            'permanent_delete',
            v_deleted_by,
            'Permanently deleted from system',
            'archived',
            NULL
        );
    END IF;

    RETURN v_updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: Get deletion audit trail for a report
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_deletion_audit_trail(
    p_report_id UUID
)
RETURNS TABLE (
    id UUID,
    report_id UUID,
    report_title TEXT,
    action_type TEXT,
    performed_by UUID,
    performed_at TIMESTAMPTZ,
    reason TEXT,
    previous_status TEXT,
    new_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dal.id,
        dal.report_id,
        dal.report_title,
        dal.action_type,
        dal.performed_by,
        dal.performed_at,
        dal.reason,
        dal.previous_status,
        dal.new_status
    FROM public.deletion_audit_log dal
    WHERE dal.report_id = p_report_id
    ORDER BY dal.performed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: Get all deletion audit logs (admin only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_deletion_audit_logs(
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    report_id UUID,
    report_title TEXT,
    action_type TEXT,
    performed_by UUID,
    performed_at TIMESTAMPTZ,
    reason TEXT,
    previous_status TEXT,
    new_status TEXT,
    performer_username TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dal.id,
        dal.report_id,
        dal.report_title,
        dal.action_type,
        dal.performed_by,
        dal.performed_at,
        dal.reason,
        dal.previous_status,
        dal.new_status,
        p.username
    FROM public.deletion_audit_log dal
    LEFT JOIN public.profiles p ON dal.performed_by = p.id
    ORDER BY dal.performed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- End of migration
-- =============================================================================