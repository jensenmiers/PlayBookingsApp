-- Schema Inspection Helper Functions
-- Run this in Supabase SQL Editor to enable schema queries via RPC
-- These functions allow the schema inspector to query information_schema safely

-- Function to get table structure
CREATE OR REPLACE FUNCTION get_table_structure(table_name_param TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT,
  character_maximum_length INTEGER
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    COALESCE(c.column_default::TEXT, 'NULL'),
    c.character_maximum_length
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = table_name_param
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Function to get all triggers
CREATE OR REPLACE FUNCTION get_all_triggers()
RETURNS TABLE (
  trigger_name TEXT,
  event_manipulation TEXT,
  event_object_table TEXT,
  action_statement TEXT,
  action_timing TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.trigger_name::TEXT,
    t.event_manipulation::TEXT,
    t.event_object_table::TEXT,
    t.action_statement::TEXT,
    t.action_timing::TEXT
  FROM information_schema.triggers t
  WHERE t.event_object_schema = 'public'
  ORDER BY t.event_object_table, t.trigger_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get all functions
CREATE OR REPLACE FUNCTION get_all_functions()
RETURNS TABLE (
  function_name TEXT,
  return_type TEXT,
  argument_types TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.routine_name::TEXT,
    r.data_type::TEXT,
    COALESCE(r.external_name::TEXT, '') as argument_types
  FROM information_schema.routines r
  WHERE r.routine_schema = 'public'
    AND r.routine_type = 'FUNCTION'
  ORDER BY r.routine_name;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_table_structure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_triggers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_functions() TO authenticated;

-- Also grant to service_role for direct queries
GRANT EXECUTE ON FUNCTION get_table_structure(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_all_triggers() TO service_role;
GRANT EXECUTE ON FUNCTION get_all_functions() TO service_role;

