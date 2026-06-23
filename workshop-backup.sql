--
-- PostgreSQL database dump
--

\restrict OVTw4eQXuK7C4fGju1ZgW7wdChtjFfW3FTdIsu7MIODWPhDBlfzFCwvujr9EGAQ

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP POLICY IF EXISTS tenant_isolation ON app.work_orders;
DROP POLICY IF EXISTS tenant_isolation ON app.work_order_lines;
DROP POLICY IF EXISTS tenant_isolation ON app.work_order_approvals;
DROP POLICY IF EXISTS tenant_isolation ON app.voice_drafts;
DROP POLICY IF EXISTS tenant_isolation ON app.travel_orders;
DROP POLICY IF EXISTS tenant_isolation ON app.time_entries;
DROP POLICY IF EXISTS tenant_isolation ON app.sync_mutations;
DROP POLICY IF EXISTS tenant_isolation ON app.suppliers;
DROP POLICY IF EXISTS tenant_isolation ON app.supplier_items;
DROP POLICY IF EXISTS tenant_isolation ON app.stock_movements;
DROP POLICY IF EXISTS tenant_isolation ON app.stock_levels;
DROP POLICY IF EXISTS tenant_isolation ON app.stock_counts;
DROP POLICY IF EXISTS tenant_isolation ON app.stock_count_lines;
DROP POLICY IF EXISTS tenant_isolation ON app.service_vehicles;
DROP POLICY IF EXISTS tenant_isolation ON app.rental_vehicles;
DROP POLICY IF EXISTS tenant_isolation ON app.rental_reservations;
DROP POLICY IF EXISTS tenant_isolation ON app.rental_damages;
DROP POLICY IF EXISTS tenant_isolation ON app.rental_contracts;
DROP POLICY IF EXISTS tenant_isolation ON app.purchase_orders;
DROP POLICY IF EXISTS tenant_isolation ON app.purchase_order_lines;
DROP POLICY IF EXISTS tenant_isolation ON app.presets;
DROP POLICY IF EXISTS tenant_isolation ON app.portal_sessions;
DROP POLICY IF EXISTS tenant_isolation ON app.plate_recognitions;
DROP POLICY IF EXISTS tenant_isolation ON app.payments;
DROP POLICY IF EXISTS tenant_isolation ON app.payment_allocations;
DROP POLICY IF EXISTS tenant_isolation ON app.parts_categories;
DROP POLICY IF EXISTS tenant_isolation ON app.outbox;
DROP POLICY IF EXISTS tenant_isolation ON app.ocr_extractions;
DROP POLICY IF EXISTS tenant_isolation ON app.notifications;
DROP POLICY IF EXISTS tenant_isolation ON app.memberships;
DROP POLICY IF EXISTS tenant_isolation ON app.member_permission_overrides;
DROP POLICY IF EXISTS tenant_isolation ON app.locations;
DROP POLICY IF EXISTS tenant_isolation ON app.leave_requests;
DROP POLICY IF EXISTS tenant_isolation ON app.labour_standards;
DROP POLICY IF EXISTS tenant_isolation ON app.invoices;
DROP POLICY IF EXISTS tenant_isolation ON app.invoice_work_orders;
DROP POLICY IF EXISTS tenant_isolation ON app.invoice_vat_breakdown;
DROP POLICY IF EXISTS tenant_isolation ON app.invoice_lines;
DROP POLICY IF EXISTS tenant_isolation ON app.inventory_items;
DROP POLICY IF EXISTS tenant_isolation ON app.integration_credentials;
DROP POLICY IF EXISTS tenant_isolation ON app.insight_snapshots;
DROP POLICY IF EXISTS tenant_isolation ON app.goods_receipts;
DROP POLICY IF EXISTS tenant_isolation ON app.goods_receipt_lines;
DROP POLICY IF EXISTS tenant_isolation ON app.fleets;
DROP POLICY IF EXISTS tenant_isolation ON app.field_service_events;
DROP POLICY IF EXISTS tenant_isolation ON app.estimates;
DROP POLICY IF EXISTS tenant_isolation ON app.einvoice_documents;
DROP POLICY IF EXISTS tenant_isolation ON app.document_counters;
DROP POLICY IF EXISTS tenant_isolation ON app.customers;
DROP POLICY IF EXISTS tenant_isolation ON app.change_feed;
DROP POLICY IF EXISTS tenant_isolation ON app.bank_imports;
DROP POLICY IF EXISTS tenant_isolation ON app.bank_import_entries;
DROP POLICY IF EXISTS tenant_isolation ON app.audit_log;
DROP POLICY IF EXISTS tenant_isolation ON app.attendance_days;
DROP POLICY IF EXISTS tenant_isolation ON app.attendance_breaks;
DROP POLICY IF EXISTS tenant_isolation ON app.assets;
DROP POLICY IF EXISTS tenant_isolation ON app.asset_links;
DROP POLICY IF EXISTS tenant_isolation ON app.appointments;
DROP POLICY IF EXISTS tenant_isolation ON app.appointment_requests;
DROP POLICY IF EXISTS tenant_isolation ON app.api_keys;
DROP POLICY IF EXISTS tenant_isolation ON app.ai_suggestions;
DROP POLICY IF EXISTS tenant_isolation ON app.ai_interactions;
DROP POLICY IF EXISTS attachments_tenant_isolation ON app.attachments;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_fleet_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_assigned_mechanic_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_asset_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_advisor_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_order_lines DROP CONSTRAINT IF EXISTS work_order_lines_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_order_lines DROP CONSTRAINT IF EXISTS work_order_lines_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_order_lines DROP CONSTRAINT IF EXISTS work_order_lines_reserved_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_order_approvals DROP CONSTRAINT IF EXISTS work_order_approvals_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_order_approvals DROP CONSTRAINT IF EXISTS work_order_approvals_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_order_approvals DROP CONSTRAINT IF EXISTS work_order_approvals_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.voice_drafts DROP CONSTRAINT IF EXISTS voice_drafts_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.voice_drafts DROP CONSTRAINT IF EXISTS voice_drafts_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.voice_drafts DROP CONSTRAINT IF EXISTS voice_drafts_attachment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.user_credentials DROP CONSTRAINT IF EXISTS user_credentials_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.travel_orders DROP CONSTRAINT IF EXISTS travel_orders_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.travel_orders DROP CONSTRAINT IF EXISTS travel_orders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.travel_orders DROP CONSTRAINT IF EXISTS travel_orders_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.travel_orders DROP CONSTRAINT IF EXISTS travel_orders_service_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY app.travel_orders DROP CONSTRAINT IF EXISTS travel_orders_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.time_entries DROP CONSTRAINT IF EXISTS time_entries_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.time_entries DROP CONSTRAINT IF EXISTS time_entries_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.time_entries DROP CONSTRAINT IF EXISTS time_entries_mechanic_id_fkey;
ALTER TABLE IF EXISTS ONLY app.sync_mutations DROP CONSTRAINT IF EXISTS sync_mutations_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.suppliers DROP CONSTRAINT IF EXISTS suppliers_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.supplier_items DROP CONSTRAINT IF EXISTS supplier_items_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.supplier_items DROP CONSTRAINT IF EXISTS supplier_items_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY app.supplier_items DROP CONSTRAINT IF EXISTS supplier_items_item_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_work_order_line_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_item_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_levels DROP CONSTRAINT IF EXISTS stock_levels_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_levels DROP CONSTRAINT IF EXISTS stock_levels_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_levels DROP CONSTRAINT IF EXISTS stock_levels_item_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_counts DROP CONSTRAINT IF EXISTS stock_counts_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_counts DROP CONSTRAINT IF EXISTS stock_counts_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_count_lines DROP CONSTRAINT IF EXISTS stock_count_lines_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_count_lines DROP CONSTRAINT IF EXISTS stock_count_lines_stock_count_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_count_lines DROP CONSTRAINT IF EXISTS stock_count_lines_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_count_lines DROP CONSTRAINT IF EXISTS stock_count_lines_item_id_fkey;
ALTER TABLE IF EXISTS ONLY app.stock_count_lines DROP CONSTRAINT IF EXISTS stock_count_lines_adjustment_movement_id_fkey;
ALTER TABLE IF EXISTS ONLY app.service_vehicles DROP CONSTRAINT IF EXISTS service_vehicles_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.service_vehicles DROP CONSTRAINT IF EXISTS service_vehicles_assigned_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_vehicles DROP CONSTRAINT IF EXISTS rental_vehicles_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_reservations DROP CONSTRAINT IF EXISTS rental_reservations_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_reservations DROP CONSTRAINT IF EXISTS rental_reservations_rental_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_reservations DROP CONSTRAINT IF EXISTS rental_reservations_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_damages DROP CONSTRAINT IF EXISTS rental_damages_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_damages DROP CONSTRAINT IF EXISTS rental_damages_contract_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_return_signature_attachment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_reservation_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_rental_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_handover_signature_attachment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY app.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_ship_to_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_supplier_item_id_fkey;
ALTER TABLE IF EXISTS ONLY app.purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_purchase_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_item_id_fkey;
ALTER TABLE IF EXISTS ONLY app.presets DROP CONSTRAINT IF EXISTS presets_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.portal_sessions DROP CONSTRAINT IF EXISTS portal_sessions_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.portal_sessions DROP CONSTRAINT IF EXISTS portal_sessions_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.plate_recognitions DROP CONSTRAINT IF EXISTS plate_recognitions_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.plate_recognitions DROP CONSTRAINT IF EXISTS plate_recognitions_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.plate_recognitions DROP CONSTRAINT IF EXISTS plate_recognitions_confirmed_asset_id_fkey;
ALTER TABLE IF EXISTS ONLY app.plate_recognitions DROP CONSTRAINT IF EXISTS plate_recognitions_attachment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.payments DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.payments DROP CONSTRAINT IF EXISTS payments_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.parts_categories DROP CONSTRAINT IF EXISTS parts_categories_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.parts_categories DROP CONSTRAINT IF EXISTS parts_categories_parent_id_fkey;
ALTER TABLE IF EXISTS ONLY app.outbox DROP CONSTRAINT IF EXISTS outbox_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.ocr_extractions DROP CONSTRAINT IF EXISTS ocr_extractions_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.ocr_extractions DROP CONSTRAINT IF EXISTS ocr_extractions_matched_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY app.ocr_extractions DROP CONSTRAINT IF EXISTS ocr_extractions_goods_receipt_id_fkey;
ALTER TABLE IF EXISTS ONLY app.ocr_extractions DROP CONSTRAINT IF EXISTS ocr_extractions_attachment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.notifications DROP CONSTRAINT IF EXISTS notifications_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.memberships DROP CONSTRAINT IF EXISTS memberships_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.member_permission_overrides DROP CONSTRAINT IF EXISTS member_permission_overrides_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.member_permission_overrides DROP CONSTRAINT IF EXISTS member_permission_overrides_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.member_permission_overrides DROP CONSTRAINT IF EXISTS member_permission_overrides_created_by_fkey;
ALTER TABLE IF EXISTS ONLY app.login_events DROP CONSTRAINT IF EXISTS login_events_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.login_events DROP CONSTRAINT IF EXISTS login_events_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.locations DROP CONSTRAINT IF EXISTS locations_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_decided_by_fkey;
ALTER TABLE IF EXISTS ONLY app.labour_standards DROP CONSTRAINT IF EXISTS labour_standards_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoices DROP CONSTRAINT IF EXISTS invoices_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoices DROP CONSTRAINT IF EXISTS invoices_corrects_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_work_orders DROP CONSTRAINT IF EXISTS invoice_work_orders_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_work_orders DROP CONSTRAINT IF EXISTS invoice_work_orders_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_work_orders DROP CONSTRAINT IF EXISTS invoice_work_orders_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_vat_breakdown DROP CONSTRAINT IF EXISTS invoice_vat_breakdown_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_vat_breakdown DROP CONSTRAINT IF EXISTS invoice_vat_breakdown_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.integration_credentials DROP CONSTRAINT IF EXISTS integration_credentials_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.insight_snapshots DROP CONSTRAINT IF EXISTS insight_snapshots_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_purchase_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_ocr_attachment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_purchase_order_line_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_movement_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_location_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_item_id_fkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_goods_receipt_id_fkey;
ALTER TABLE IF EXISTS ONLY app.fleets DROP CONSTRAINT IF EXISTS fleets_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.fleets DROP CONSTRAINT IF EXISTS fleets_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.work_order_lines DROP CONSTRAINT IF EXISTS fk_wol_item;
ALTER TABLE IF EXISTS ONLY app.inventory_items DROP CONSTRAINT IF EXISTS fk_inv_items_superseded_by;
ALTER TABLE IF EXISTS ONLY app.inventory_items DROP CONSTRAINT IF EXISTS fk_inv_items_preferred_supplier;
ALTER TABLE IF EXISTS ONLY app.inventory_items DROP CONSTRAINT IF EXISTS fk_inv_items_category;
ALTER TABLE IF EXISTS ONLY app.assets DROP CONSTRAINT IF EXISTS fk_assets_fleet;
ALTER TABLE IF EXISTS ONLY app.field_service_events DROP CONSTRAINT IF EXISTS field_service_events_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.field_service_events DROP CONSTRAINT IF EXISTS field_service_events_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.field_service_events DROP CONSTRAINT IF EXISTS field_service_events_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.estimates DROP CONSTRAINT IF EXISTS estimates_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.estimates DROP CONSTRAINT IF EXISTS estimates_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.estimates DROP CONSTRAINT IF EXISTS estimates_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.estimates DROP CONSTRAINT IF EXISTS estimates_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.estimates DROP CONSTRAINT IF EXISTS estimates_asset_id_fkey;
ALTER TABLE IF EXISTS ONLY app.einvoice_documents DROP CONSTRAINT IF EXISTS einvoice_documents_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.einvoice_documents DROP CONSTRAINT IF EXISTS einvoice_documents_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.document_counters DROP CONSTRAINT IF EXISTS document_counters_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.customers DROP CONSTRAINT IF EXISTS customers_vat_id_validated_by_fkey;
ALTER TABLE IF EXISTS ONLY app.customers DROP CONSTRAINT IF EXISTS customers_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.change_feed DROP CONSTRAINT IF EXISTS change_feed_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.bank_imports DROP CONSTRAINT IF EXISTS bank_imports_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.bank_import_entries DROP CONSTRAINT IF EXISTS bank_import_entries_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.bank_import_entries DROP CONSTRAINT IF EXISTS bank_import_entries_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY app.bank_import_entries DROP CONSTRAINT IF EXISTS bank_import_entries_matched_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY app.bank_import_entries DROP CONSTRAINT IF EXISTS bank_import_entries_import_id_fkey;
ALTER TABLE IF EXISTS ONLY app.audit_log DROP CONSTRAINT IF EXISTS audit_log_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.attendance_days DROP CONSTRAINT IF EXISTS attendance_days_user_id_fkey;
ALTER TABLE IF EXISTS ONLY app.attendance_days DROP CONSTRAINT IF EXISTS attendance_days_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.attendance_days DROP CONSTRAINT IF EXISTS attendance_days_corrected_by_fkey;
ALTER TABLE IF EXISTS ONLY app.attendance_breaks DROP CONSTRAINT IF EXISTS attendance_breaks_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.attendance_breaks DROP CONSTRAINT IF EXISTS attendance_breaks_attendance_day_id_fkey;
ALTER TABLE IF EXISTS ONLY app.attachments DROP CONSTRAINT IF EXISTS attachments_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.attachments DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY app.attachments DROP CONSTRAINT IF EXISTS attachments_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.assets DROP CONSTRAINT IF EXISTS assets_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.assets DROP CONSTRAINT IF EXISTS assets_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.asset_links DROP CONSTRAINT IF EXISTS asset_links_trailer_asset_id_fkey;
ALTER TABLE IF EXISTS ONLY app.asset_links DROP CONSTRAINT IF EXISTS asset_links_tractor_asset_id_fkey;
ALTER TABLE IF EXISTS ONLY app.asset_links DROP CONSTRAINT IF EXISTS asset_links_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.appointments DROP CONSTRAINT IF EXISTS appointments_work_order_id_fkey;
ALTER TABLE IF EXISTS ONLY app.appointments DROP CONSTRAINT IF EXISTS appointments_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.appointments DROP CONSTRAINT IF EXISTS appointments_asset_id_fkey;
ALTER TABLE IF EXISTS ONLY app.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY app.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_asset_id_fkey;
ALTER TABLE IF EXISTS ONLY app.api_keys DROP CONSTRAINT IF EXISTS api_keys_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.api_keys DROP CONSTRAINT IF EXISTS api_keys_revoked_by_fkey;
ALTER TABLE IF EXISTS ONLY app.api_keys DROP CONSTRAINT IF EXISTS api_keys_created_by_fkey;
ALTER TABLE IF EXISTS ONLY app.ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY app.ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_interaction_id_fkey;
ALTER TABLE IF EXISTS ONLY app.ai_interactions DROP CONSTRAINT IF EXISTS ai_interactions_tenant_id_fkey;
DROP TRIGGER IF EXISTS trg_wol_touch ON app.work_order_lines;
DROP TRIGGER IF EXISTS trg_wo_touch ON app.work_orders;
DROP TRIGGER IF EXISTS trg_voice_drafts_touch ON app.voice_drafts;
DROP TRIGGER IF EXISTS trg_users_touch ON app.users;
DROP TRIGGER IF EXISTS trg_user_credentials_touch ON app.user_credentials;
DROP TRIGGER IF EXISTS trg_travel_orders_touch ON app.travel_orders;
DROP TRIGGER IF EXISTS trg_tenants_touch ON app.tenants;
DROP TRIGGER IF EXISTS trg_te_touch ON app.time_entries;
DROP TRIGGER IF EXISTS trg_suppliers_touch ON app.suppliers;
DROP TRIGGER IF EXISTS trg_supplier_items_touch ON app.supplier_items;
DROP TRIGGER IF EXISTS trg_stock_levels_touch ON app.stock_levels;
DROP TRIGGER IF EXISTS trg_service_vehicles_touch ON app.service_vehicles;
DROP TRIGGER IF EXISTS trg_rental_vehicles_touch ON app.rental_vehicles;
DROP TRIGGER IF EXISTS trg_rental_reservations_touch ON app.rental_reservations;
DROP TRIGGER IF EXISTS trg_rental_damages_touch ON app.rental_damages;
DROP TRIGGER IF EXISTS trg_rental_contracts_touch ON app.rental_contracts;
DROP TRIGGER IF EXISTS trg_presets_touch ON app.presets;
DROP TRIGGER IF EXISTS trg_po_touch ON app.purchase_orders;
DROP TRIGGER IF EXISTS trg_plate_recognitions_touch ON app.plate_recognitions;
DROP TRIGGER IF EXISTS trg_parts_categories_touch ON app.parts_categories;
DROP TRIGGER IF EXISTS trg_outbox_touch ON app.outbox;
DROP TRIGGER IF EXISTS trg_ocr_extractions_touch ON app.ocr_extractions;
DROP TRIGGER IF EXISTS trg_memberships_touch ON app.memberships;
DROP TRIGGER IF EXISTS trg_leave_requests_touch ON app.leave_requests;
DROP TRIGGER IF EXISTS trg_labour_std_touch ON app.labour_standards;
DROP TRIGGER IF EXISTS trg_invoices_touch ON app.invoices;
DROP TRIGGER IF EXISTS trg_invoices_immutable ON app.invoices;
DROP TRIGGER IF EXISTS trg_inv_items_touch ON app.inventory_items;
DROP TRIGGER IF EXISTS trg_intcred_touch ON app.integration_credentials;
DROP TRIGGER IF EXISTS trg_grn_touch ON app.goods_receipts;
DROP TRIGGER IF EXISTS trg_fleets_touch ON app.fleets;
DROP TRIGGER IF EXISTS trg_field_service_touch ON app.field_service_events;
DROP TRIGGER IF EXISTS trg_estimates_touch ON app.estimates;
DROP TRIGGER IF EXISTS trg_einvoice_touch ON app.einvoice_documents;
DROP TRIGGER IF EXISTS trg_customers_touch ON app.customers;
DROP TRIGGER IF EXISTS trg_counts_touch ON app.stock_counts;
DROP TRIGGER IF EXISTS trg_attendance_days_touch ON app.attendance_days;
DROP TRIGGER IF EXISTS trg_attendance_breaks_touch ON app.attendance_breaks;
DROP TRIGGER IF EXISTS trg_assets_touch ON app.assets;
DROP TRIGGER IF EXISTS trg_appt_touch ON app.appointment_requests;
DROP TRIGGER IF EXISTS trg_approvals_touch ON app.work_order_approvals;
DROP TRIGGER IF EXISTS trg_appointments_touch ON app.appointments;
DROP RULE IF EXISTS stock_moves_no_update ON app.stock_movements;
DROP RULE IF EXISTS stock_moves_no_delete ON app.stock_movements;
DROP RULE IF EXISTS pay_alloc_no_update ON app.payment_allocations;
DROP RULE IF EXISTS pay_alloc_no_delete ON app.payment_allocations;
DROP RULE IF EXISTS audit_no_update ON app.audit_log;
DROP RULE IF EXISTS audit_no_delete ON app.audit_log;
DROP INDEX IF EXISTS app.uq_work_orders_number;
DROP INDEX IF EXISTS app.uq_user_session_device;
DROP INDEX IF EXISTS app.uq_suppliers_tenant_code;
DROP INDEX IF EXISTS app.uq_supplier_items_preferred;
DROP INDEX IF EXISTS app.uq_one_open_entry_per_mechanic;
DROP INDEX IF EXISTS app.uq_invoices_number;
DROP INDEX IF EXISTS app.uq_inv_items_tenant_sku;
DROP INDEX IF EXISTS app.uq_estimates_tenant_number;
DROP INDEX IF EXISTS app.uq_customers_tenant_minimax;
DROP INDEX IF EXISTS app.uq_customers_tenant_code;
DROP INDEX IF EXISTS app.uq_assets_tenant_plate;
DROP INDEX IF EXISTS app.tenants_stripe_subscription_uq;
DROP INDEX IF EXISTS app.tenants_stripe_customer_uq;
DROP INDEX IF EXISTS app.idx_work_orders_tenant_status;
DROP INDEX IF EXISTS app.idx_work_orders_tenant_customer;
DROP INDEX IF EXISTS app.idx_work_orders_tenant_asset;
DROP INDEX IF EXISTS app.idx_wol_tenant_wo;
DROP INDEX IF EXISTS app.idx_voice_drafts_work_order;
DROP INDEX IF EXISTS app.idx_voice_drafts_tenant;
DROP INDEX IF EXISTS app.idx_voice_drafts_attachment;
DROP INDEX IF EXISTS app.idx_user_sessions_user;
DROP INDEX IF EXISTS app.idx_travel_orders_user;
DROP INDEX IF EXISTS app.idx_travel_orders_status;
DROP INDEX IF EXISTS app.idx_time_entries_tenant_wo;
DROP INDEX IF EXISTS app.idx_suppliers_tenant_name;
DROP INDEX IF EXISTS app.idx_supplier_items_supplier;
DROP INDEX IF EXISTS app.idx_supplier_items_item;
DROP INDEX IF EXISTS app.idx_stock_moves_transfer;
DROP INDEX IF EXISTS app.idx_stock_moves_tenant_item;
DROP INDEX IF EXISTS app.idx_stock_levels_tenant_item;
DROP INDEX IF EXISTS app.idx_signup_tokens_email;
DROP INDEX IF EXISTS app.idx_service_vehicles_tenant;
DROP INDEX IF EXISTS app.idx_rental_vehicles_tenant;
DROP INDEX IF EXISTS app.idx_rental_res_tenant_vehicle;
DROP INDEX IF EXISTS app.idx_rental_res_tenant_status;
DROP INDEX IF EXISTS app.idx_rental_damages_tenant_contract;
DROP INDEX IF EXISTS app.idx_rental_contracts_tenant_vehicle;
DROP INDEX IF EXISTS app.idx_rental_contracts_tenant_status;
DROP INDEX IF EXISTS app.idx_presets_tenant;
DROP INDEX IF EXISTS app.idx_portal_sessions_lookup;
DROP INDEX IF EXISTS app.idx_portal_sessions_customer;
DROP INDEX IF EXISTS app.idx_po_tenant_supplier;
DROP INDEX IF EXISTS app.idx_po_tenant_status;
DROP INDEX IF EXISTS app.idx_po_lines_po;
DROP INDEX IF EXISTS app.idx_plate_recognitions_tenant;
DROP INDEX IF EXISTS app.idx_plate_recognitions_attachment;
DROP INDEX IF EXISTS app.idx_plate_recognitions_asset;
DROP INDEX IF EXISTS app.idx_perm_overrides_user;
DROP INDEX IF EXISTS app.idx_payments_tenant_customer;
DROP INDEX IF EXISTS app.idx_pay_alloc_invoice;
DROP INDEX IF EXISTS app.idx_parts_categories_tenant;
DROP INDEX IF EXISTS app.idx_outbox_due;
DROP INDEX IF EXISTS app.idx_ocr_extractions_tenant;
DROP INDEX IF EXISTS app.idx_ocr_extractions_grn;
DROP INDEX IF EXISTS app.idx_ocr_extractions_attachment;
DROP INDEX IF EXISTS app.idx_notifications_recipient;
DROP INDEX IF EXISTS app.idx_memberships_user;
DROP INDEX IF EXISTS app.idx_login_events_user;
DROP INDEX IF EXISTS app.idx_login_events_tenant;
DROP INDEX IF EXISTS app.idx_login_events_at;
DROP INDEX IF EXISTS app.idx_locations_tenant;
DROP INDEX IF EXISTS app.idx_leave_requests_user;
DROP INDEX IF EXISTS app.idx_leave_requests_status;
DROP INDEX IF EXISTS app.idx_labour_std_tenant;
DROP INDEX IF EXISTS app.idx_iwo_work_order;
DROP INDEX IF EXISTS app.idx_iwo_tenant;
DROP INDEX IF EXISTS app.idx_invoices_tenant_status;
DROP INDEX IF EXISTS app.idx_invoices_tenant_due;
DROP INDEX IF EXISTS app.idx_invoices_tenant_customer;
DROP INDEX IF EXISTS app.idx_invoice_lines_wo;
DROP INDEX IF EXISTS app.idx_invoice_lines_tenant_inv;
DROP INDEX IF EXISTS app.idx_inv_items_tenant_name;
DROP INDEX IF EXISTS app.idx_inv_items_category;
DROP INDEX IF EXISTS app.idx_inv_items_barcode;
DROP INDEX IF EXISTS app.idx_insight_snapshots_tenant;
DROP INDEX IF EXISTS app.idx_grn_tenant_status;
DROP INDEX IF EXISTS app.idx_grn_tenant_po;
DROP INDEX IF EXISTS app.idx_grn_lines_grn;
DROP INDEX IF EXISTS app.idx_fleets_tenant_customer;
DROP INDEX IF EXISTS app.idx_field_service_user;
DROP INDEX IF EXISTS app.idx_estimates_tenant_customer;
DROP INDEX IF EXISTS app.idx_estimates_tenant_created;
DROP INDEX IF EXISTS app.idx_einvoice_tenant_status;
DROP INDEX IF EXISTS app.idx_customers_tenant_name;
DROP INDEX IF EXISTS app.idx_counts_tenant_status;
DROP INDEX IF EXISTS app.idx_count_lines_count;
DROP INDEX IF EXISTS app.idx_change_feed_tenant_cursor;
DROP INDEX IF EXISTS app.idx_bank_imports_tenant;
DROP INDEX IF EXISTS app.idx_bank_entries_tenant;
DROP INDEX IF EXISTS app.idx_audit_tenant_seq;
DROP INDEX IF EXISTS app.idx_attendance_days_user;
DROP INDEX IF EXISTS app.idx_attendance_breaks_day;
DROP INDEX IF EXISTS app.idx_attachments_work_order;
DROP INDEX IF EXISTS app.idx_attachments_status;
DROP INDEX IF EXISTS app.idx_assets_tenant_customer;
DROP INDEX IF EXISTS app.idx_asset_links_tenant;
DROP INDEX IF EXISTS app.idx_appt_customer;
DROP INDEX IF EXISTS app.idx_approvals_wo;
DROP INDEX IF EXISTS app.idx_approvals_customer;
DROP INDEX IF EXISTS app.idx_appointments_tenant_start;
DROP INDEX IF EXISTS app.idx_appointments_tenant_customer;
DROP INDEX IF EXISTS app.idx_api_keys_tenant;
DROP INDEX IF EXISTS app.idx_api_keys_hash;
DROP INDEX IF EXISTS app.idx_ai_suggestions_tenant;
DROP INDEX IF EXISTS app.idx_ai_interactions_tenant;
ALTER TABLE IF EXISTS ONLY app.work_orders DROP CONSTRAINT IF EXISTS work_orders_pkey;
ALTER TABLE IF EXISTS ONLY app.work_order_lines DROP CONSTRAINT IF EXISTS work_order_lines_work_order_id_line_no_key;
ALTER TABLE IF EXISTS ONLY app.work_order_lines DROP CONSTRAINT IF EXISTS work_order_lines_pkey;
ALTER TABLE IF EXISTS ONLY app.work_order_approvals DROP CONSTRAINT IF EXISTS work_order_approvals_pkey;
ALTER TABLE IF EXISTS ONLY app.voice_drafts DROP CONSTRAINT IF EXISTS voice_drafts_pkey;
ALTER TABLE IF EXISTS ONLY app.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY app.users DROP CONSTRAINT IF EXISTS users_external_subject_key;
ALTER TABLE IF EXISTS ONLY app.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY app.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_pkey;
ALTER TABLE IF EXISTS ONLY app.user_credentials DROP CONSTRAINT IF EXISTS user_credentials_pkey;
ALTER TABLE IF EXISTS ONLY app.travel_orders DROP CONSTRAINT IF EXISTS travel_orders_pkey;
ALTER TABLE IF EXISTS ONLY app.time_entries DROP CONSTRAINT IF EXISTS time_entries_pkey;
ALTER TABLE IF EXISTS ONLY app.tenants DROP CONSTRAINT IF EXISTS tenants_pkey;
ALTER TABLE IF EXISTS ONLY app.sync_mutations DROP CONSTRAINT IF EXISTS sync_mutations_tenant_id_device_id_idempotency_key_key;
ALTER TABLE IF EXISTS ONLY app.sync_mutations DROP CONSTRAINT IF EXISTS sync_mutations_pkey;
ALTER TABLE IF EXISTS ONLY app.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE IF EXISTS ONLY app.supplier_items DROP CONSTRAINT IF EXISTS supplier_items_tenant_id_supplier_id_item_id_key;
ALTER TABLE IF EXISTS ONLY app.supplier_items DROP CONSTRAINT IF EXISTS supplier_items_pkey;
ALTER TABLE IF EXISTS ONLY app.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_pkey;
ALTER TABLE IF EXISTS ONLY app.stock_levels DROP CONSTRAINT IF EXISTS stock_levels_tenant_id_item_id_location_id_key;
ALTER TABLE IF EXISTS ONLY app.stock_levels DROP CONSTRAINT IF EXISTS stock_levels_pkey;
ALTER TABLE IF EXISTS ONLY app.stock_counts DROP CONSTRAINT IF EXISTS stock_counts_pkey;
ALTER TABLE IF EXISTS ONLY app.stock_count_lines DROP CONSTRAINT IF EXISTS stock_count_lines_stock_count_id_item_id_location_id_key;
ALTER TABLE IF EXISTS ONLY app.stock_count_lines DROP CONSTRAINT IF EXISTS stock_count_lines_pkey;
ALTER TABLE IF EXISTS ONLY app.signup_tokens DROP CONSTRAINT IF EXISTS signup_tokens_token_hash_key;
ALTER TABLE IF EXISTS ONLY app.signup_tokens DROP CONSTRAINT IF EXISTS signup_tokens_pkey;
ALTER TABLE IF EXISTS ONLY app.service_vehicles DROP CONSTRAINT IF EXISTS service_vehicles_pkey;
ALTER TABLE IF EXISTS ONLY app.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY app.rental_vehicles DROP CONSTRAINT IF EXISTS rental_vehicles_pkey;
ALTER TABLE IF EXISTS ONLY app.rental_reservations DROP CONSTRAINT IF EXISTS rental_reservations_pkey;
ALTER TABLE IF EXISTS ONLY app.rental_damages DROP CONSTRAINT IF EXISTS rental_damages_pkey;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_tenant_id_number_key;
ALTER TABLE IF EXISTS ONLY app.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_pkey;
ALTER TABLE IF EXISTS ONLY app.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_pkey;
ALTER TABLE IF EXISTS ONLY app.purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_purchase_order_id_line_no_key;
ALTER TABLE IF EXISTS ONLY app.purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_pkey;
ALTER TABLE IF EXISTS ONLY app.presets DROP CONSTRAINT IF EXISTS presets_pkey;
ALTER TABLE IF EXISTS ONLY app.portal_sessions DROP CONSTRAINT IF EXISTS portal_sessions_pkey;
ALTER TABLE IF EXISTS ONLY app.plate_recognitions DROP CONSTRAINT IF EXISTS plate_recognitions_pkey;
ALTER TABLE IF EXISTS ONLY app.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY app.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_pkey;
ALTER TABLE IF EXISTS ONLY app.parts_categories DROP CONSTRAINT IF EXISTS parts_categories_pkey;
ALTER TABLE IF EXISTS ONLY app.outbox DROP CONSTRAINT IF EXISTS outbox_tenant_id_idempotency_key_key;
ALTER TABLE IF EXISTS ONLY app.outbox DROP CONSTRAINT IF EXISTS outbox_pkey;
ALTER TABLE IF EXISTS ONLY app.ocr_extractions DROP CONSTRAINT IF EXISTS ocr_extractions_pkey;
ALTER TABLE IF EXISTS ONLY app.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY app.memberships DROP CONSTRAINT IF EXISTS memberships_tenant_id_user_id_key;
ALTER TABLE IF EXISTS ONLY app.memberships DROP CONSTRAINT IF EXISTS memberships_pkey;
ALTER TABLE IF EXISTS ONLY app.member_permission_overrides DROP CONSTRAINT IF EXISTS member_permission_overrides_pkey;
ALTER TABLE IF EXISTS ONLY app.login_events DROP CONSTRAINT IF EXISTS login_events_pkey;
ALTER TABLE IF EXISTS ONLY app.locations DROP CONSTRAINT IF EXISTS locations_pkey;
ALTER TABLE IF EXISTS ONLY app.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_pkey;
ALTER TABLE IF EXISTS ONLY app.labour_standards DROP CONSTRAINT IF EXISTS labour_standards_tenant_id_op_code_vehicle_class_key;
ALTER TABLE IF EXISTS ONLY app.labour_standards DROP CONSTRAINT IF EXISTS labour_standards_pkey;
ALTER TABLE IF EXISTS ONLY app.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY app.invoice_work_orders DROP CONSTRAINT IF EXISTS invoice_work_orders_pkey;
ALTER TABLE IF EXISTS ONLY app.invoice_vat_breakdown DROP CONSTRAINT IF EXISTS invoice_vat_breakdown_pkey;
ALTER TABLE IF EXISTS ONLY app.invoice_vat_breakdown DROP CONSTRAINT IF EXISTS invoice_vat_breakdown_invoice_id_rate_pct_reverse_charge_key;
ALTER TABLE IF EXISTS ONLY app.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_pkey;
ALTER TABLE IF EXISTS ONLY app.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_invoice_id_line_no_key;
ALTER TABLE IF EXISTS ONLY app.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pkey;
ALTER TABLE IF EXISTS ONLY app.integration_credentials DROP CONSTRAINT IF EXISTS integration_credentials_tenant_id_provider_key;
ALTER TABLE IF EXISTS ONLY app.integration_credentials DROP CONSTRAINT IF EXISTS integration_credentials_pkey;
ALTER TABLE IF EXISTS ONLY app.insight_snapshots DROP CONSTRAINT IF EXISTS insight_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_pkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_pkey;
ALTER TABLE IF EXISTS ONLY app.goods_receipt_lines DROP CONSTRAINT IF EXISTS goods_receipt_lines_goods_receipt_id_line_no_key;
ALTER TABLE IF EXISTS ONLY app.fleets DROP CONSTRAINT IF EXISTS fleets_pkey;
ALTER TABLE IF EXISTS ONLY app.field_service_events DROP CONSTRAINT IF EXISTS field_service_events_pkey;
ALTER TABLE IF EXISTS ONLY app.estimates DROP CONSTRAINT IF EXISTS estimates_pkey;
ALTER TABLE IF EXISTS ONLY app.einvoice_documents DROP CONSTRAINT IF EXISTS einvoice_documents_pkey;
ALTER TABLE IF EXISTS ONLY app.einvoice_documents DROP CONSTRAINT IF EXISTS einvoice_documents_invoice_id_channel_key;
ALTER TABLE IF EXISTS ONLY app.document_counters DROP CONSTRAINT IF EXISTS document_counters_pkey;
ALTER TABLE IF EXISTS ONLY app.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY app.change_feed DROP CONSTRAINT IF EXISTS change_feed_pkey;
ALTER TABLE IF EXISTS ONLY app.bank_imports DROP CONSTRAINT IF EXISTS bank_imports_pkey;
ALTER TABLE IF EXISTS ONLY app.bank_import_entries DROP CONSTRAINT IF EXISTS bank_import_entries_tenant_id_fingerprint_key;
ALTER TABLE IF EXISTS ONLY app.bank_import_entries DROP CONSTRAINT IF EXISTS bank_import_entries_pkey;
ALTER TABLE IF EXISTS ONLY app.audit_log DROP CONSTRAINT IF EXISTS audit_log_tenant_id_seq_key;
ALTER TABLE IF EXISTS ONLY app.audit_log DROP CONSTRAINT IF EXISTS audit_log_pkey;
ALTER TABLE IF EXISTS ONLY app.attendance_days DROP CONSTRAINT IF EXISTS attendance_days_tenant_id_user_id_work_date_key;
ALTER TABLE IF EXISTS ONLY app.attendance_days DROP CONSTRAINT IF EXISTS attendance_days_pkey;
ALTER TABLE IF EXISTS ONLY app.attendance_breaks DROP CONSTRAINT IF EXISTS attendance_breaks_pkey;
ALTER TABLE IF EXISTS ONLY app.attachments DROP CONSTRAINT IF EXISTS attachments_storage_key_key;
ALTER TABLE IF EXISTS ONLY app.attachments DROP CONSTRAINT IF EXISTS attachments_pkey;
ALTER TABLE IF EXISTS ONLY app.assets DROP CONSTRAINT IF EXISTS assets_pkey;
ALTER TABLE IF EXISTS ONLY app.asset_links DROP CONSTRAINT IF EXISTS asset_links_pkey;
ALTER TABLE IF EXISTS ONLY app.appointments DROP CONSTRAINT IF EXISTS appointments_pkey;
ALTER TABLE IF EXISTS ONLY app.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_pkey;
ALTER TABLE IF EXISTS ONLY app.api_keys DROP CONSTRAINT IF EXISTS api_keys_pkey;
ALTER TABLE IF EXISTS ONLY app.ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_pkey;
ALTER TABLE IF EXISTS ONLY app.ai_interactions DROP CONSTRAINT IF EXISTS ai_interactions_pkey;
ALTER TABLE IF EXISTS app.change_feed ALTER COLUMN cursor DROP DEFAULT;
DROP TABLE IF EXISTS app.work_orders;
DROP TABLE IF EXISTS app.work_order_lines;
DROP TABLE IF EXISTS app.work_order_approvals;
DROP TABLE IF EXISTS app.voice_drafts;
DROP TABLE IF EXISTS app.users;
DROP TABLE IF EXISTS app.user_sessions;
DROP TABLE IF EXISTS app.user_credentials;
DROP TABLE IF EXISTS app.travel_orders;
DROP TABLE IF EXISTS app.time_entries;
DROP TABLE IF EXISTS app.tenants;
DROP TABLE IF EXISTS app.sync_mutations;
DROP TABLE IF EXISTS app.suppliers;
DROP TABLE IF EXISTS app.supplier_items;
DROP TABLE IF EXISTS app.stock_movements;
DROP TABLE IF EXISTS app.stock_levels;
DROP TABLE IF EXISTS app.stock_counts;
DROP TABLE IF EXISTS app.stock_count_lines;
DROP TABLE IF EXISTS app.signup_tokens;
DROP TABLE IF EXISTS app.service_vehicles;
DROP TABLE IF EXISTS app.schema_migrations;
DROP TABLE IF EXISTS app.rental_vehicles;
DROP TABLE IF EXISTS app.rental_reservations;
DROP TABLE IF EXISTS app.rental_damages;
DROP TABLE IF EXISTS app.rental_contracts;
DROP TABLE IF EXISTS app.purchase_orders;
DROP TABLE IF EXISTS app.purchase_order_lines;
DROP TABLE IF EXISTS app.presets;
DROP TABLE IF EXISTS app.portal_sessions;
DROP TABLE IF EXISTS app.plate_recognitions;
DROP TABLE IF EXISTS app.payments;
DROP TABLE IF EXISTS app.payment_allocations;
DROP TABLE IF EXISTS app.parts_categories;
DROP TABLE IF EXISTS app.outbox;
DROP TABLE IF EXISTS app.ocr_extractions;
DROP TABLE IF EXISTS app.notifications;
DROP TABLE IF EXISTS app.memberships;
DROP TABLE IF EXISTS app.member_permission_overrides;
DROP TABLE IF EXISTS app.login_events;
DROP TABLE IF EXISTS app.locations;
DROP TABLE IF EXISTS app.leave_requests;
DROP TABLE IF EXISTS app.labour_standards;
DROP TABLE IF EXISTS app.invoices;
DROP TABLE IF EXISTS app.invoice_work_orders;
DROP TABLE IF EXISTS app.invoice_vat_breakdown;
DROP TABLE IF EXISTS app.invoice_lines;
DROP TABLE IF EXISTS app.inventory_items;
DROP TABLE IF EXISTS app.integration_credentials;
DROP TABLE IF EXISTS app.insight_snapshots;
DROP TABLE IF EXISTS app.goods_receipts;
DROP TABLE IF EXISTS app.goods_receipt_lines;
DROP TABLE IF EXISTS app.fleets;
DROP TABLE IF EXISTS app.field_service_events;
DROP TABLE IF EXISTS app.estimates;
DROP TABLE IF EXISTS app.einvoice_documents;
DROP TABLE IF EXISTS app.document_counters;
DROP TABLE IF EXISTS app.customers;
DROP SEQUENCE IF EXISTS app.change_feed_cursor_seq;
DROP TABLE IF EXISTS app.change_feed;
DROP TABLE IF EXISTS app.bank_imports;
DROP TABLE IF EXISTS app.bank_import_entries;
DROP TABLE IF EXISTS app.audit_log;
DROP TABLE IF EXISTS app.attendance_days;
DROP TABLE IF EXISTS app.attendance_breaks;
DROP TABLE IF EXISTS app.attachments;
DROP TABLE IF EXISTS app.assets;
DROP TABLE IF EXISTS app.asset_links;
DROP TABLE IF EXISTS app.appointments;
DROP TABLE IF EXISTS app.appointment_requests;
DROP TABLE IF EXISTS app.api_keys;
DROP TABLE IF EXISTS app.ai_suggestions;
DROP TABLE IF EXISTS app.ai_interactions;
DROP FUNCTION IF EXISTS app.touch_updated_at();
DROP FUNCTION IF EXISTS app.invoices_guard_immutable();
DROP FUNCTION IF EXISTS app.current_tenant_id();
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS citext;
DROP SCHEMA IF EXISTS app;
--
-- Name: app; Type: SCHEMA; Schema: -; Owner: workshop
--

CREATE SCHEMA app;


ALTER SCHEMA app OWNER TO workshop;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: app; Owner: workshop
--

CREATE FUNCTION app.current_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;


ALTER FUNCTION app.current_tenant_id() OWNER TO workshop;

--
-- Name: invoices_guard_immutable(); Type: FUNCTION; Schema: app; Owner: workshop
--

CREATE FUNCTION app.invoices_guard_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    IF NEW.number IS DISTINCT FROM OLD.number
       OR NEW.total_net_minor IS DISTINCT FROM OLD.total_net_minor
       OR NEW.total_vat_minor IS DISTINCT FROM OLD.total_vat_minor
       OR NEW.total_gross_minor IS DISTINCT FROM OLD.total_gross_minor
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.vat_treatment IS DISTINCT FROM OLD.vat_treatment THEN
      RAISE EXCEPTION 'Issued invoice % is immutable; use a credit note to correct it', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION app.invoices_guard_immutable() OWNER TO workshop;

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: app; Owner: workshop
--

CREATE FUNCTION app.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;


ALTER FUNCTION app.touch_updated_at() OWNER TO workshop;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_interactions; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.ai_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    feature text NOT NULL,
    user_id uuid,
    model text NOT NULL,
    residency_region text NOT NULL,
    input_ref text,
    output jsonb,
    confidence numeric(5,4),
    latency_ms integer,
    cost_micros bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.ai_interactions FORCE ROW LEVEL SECURITY;


ALTER TABLE app.ai_interactions OWNER TO workshop;

--
-- Name: ai_suggestions; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.ai_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    interaction_id uuid NOT NULL,
    target_entity_type text NOT NULL,
    target_entity_id text,
    suggested_payload jsonb NOT NULL,
    decision text DEFAULT 'pending'::text NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_suggestions_decision_check CHECK ((decision = ANY (ARRAY['pending'::text, 'accepted'::text, 'edited'::text, 'rejected'::text])))
);

ALTER TABLE ONLY app.ai_suggestions FORCE ROW LEVEL SECURITY;


ALTER TABLE app.ai_suggestions OWNER TO workshop;

--
-- Name: api_keys; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    prefix text NOT NULL,
    key_hash text NOT NULL,
    roles text[] DEFAULT '{}'::text[] NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoked_by uuid
);

ALTER TABLE ONLY app.api_keys FORCE ROW LEVEL SECURITY;


ALTER TABLE app.api_keys OWNER TO workshop;

--
-- Name: appointment_requests; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.appointment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    asset_id uuid,
    preferred_date date,
    description text,
    status text DEFAULT 'requested'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appointment_requests_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'scheduled'::text, 'declined'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.appointment_requests FORCE ROW LEVEL SECURITY;


ALTER TABLE app.appointment_requests OWNER TO workshop;

--
-- Name: appointments; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid,
    asset_id uuid,
    work_order_id uuid,
    title text NOT NULL,
    start_at timestamp without time zone NOT NULL,
    end_at timestamp without time zone,
    duration_min integer,
    note text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appointments_check CHECK (((end_at IS NULL) OR (end_at > start_at))),
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'done'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.appointments FORCE ROW LEVEL SECURITY;


ALTER TABLE app.appointments OWNER TO workshop;

--
-- Name: asset_links; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.asset_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    tractor_asset_id uuid NOT NULL,
    trailer_asset_id uuid NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_to timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT asset_links_check CHECK ((tractor_asset_id <> trailer_asset_id))
);

ALTER TABLE ONLY app.asset_links FORCE ROW LEVEL SECURITY;


ALTER TABLE app.asset_links OWNER TO workshop;

--
-- Name: assets; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    fleet_id uuid,
    type text NOT NULL,
    plate text NOT NULL,
    country_of_plate character(2) NOT NULL,
    vin text,
    make text,
    model text,
    year integer,
    odometer_last integer,
    engine_hours_last integer,
    tecdoc_type_id text,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT assets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'sold'::text, 'scrapped'::text]))),
    CONSTRAINT assets_type_check CHECK ((type = ANY (ARRAY['tractor'::text, 'truck'::text, 'van'::text, 'trailer'::text, 'other'::text])))
);

ALTER TABLE ONLY app.assets FORCE ROW LEVEL SECURITY;


ALTER TABLE app.assets OWNER TO workshop;

--
-- Name: attachments; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    work_order_id uuid,
    kind text NOT NULL,
    storage_key text NOT NULL,
    content_type text NOT NULL,
    byte_size bigint NOT NULL,
    checksum_sha256 text,
    original_filename text,
    transcript text,
    status text DEFAULT 'pending'::text NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stored_at timestamp with time zone,
    CONSTRAINT attachments_byte_size_check CHECK ((byte_size > 0)),
    CONSTRAINT attachments_kind_check CHECK ((kind = ANY (ARRAY['photo'::text, 'voice_note'::text, 'document'::text]))),
    CONSTRAINT attachments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'stored'::text, 'quarantined'::text, 'deleted'::text])))
);

ALTER TABLE ONLY app.attachments FORCE ROW LEVEL SECURITY;


ALTER TABLE app.attachments OWNER TO workshop;

--
-- Name: attendance_breaks; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.attendance_breaks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    attendance_day_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.attendance_breaks FORCE ROW LEVEL SECURITY;


ALTER TABLE app.attendance_breaks OWNER TO workshop;

--
-- Name: attendance_days; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.attendance_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    work_date date NOT NULL,
    clock_in_at timestamp with time zone,
    clock_out_at timestamp with time zone,
    corrected_by uuid,
    corrected_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.attendance_days FORCE ROW LEVEL SECURITY;


ALTER TABLE app.attendance_days OWNER TO workshop;

--
-- Name: audit_log; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    seq bigint NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    before jsonb,
    after jsonb,
    occurred_at timestamp with time zone NOT NULL,
    prev_hash character(64) NOT NULL,
    hash character(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.audit_log FORCE ROW LEVEL SECURITY;


ALTER TABLE app.audit_log OWNER TO workshop;

--
-- Name: bank_import_entries; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.bank_import_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    import_id uuid,
    fingerprint text NOT NULL,
    amount_minor bigint NOT NULL,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    booking_date date,
    payer_name text,
    payer_iban text,
    reference text,
    details text,
    status text DEFAULT 'pending'::text NOT NULL,
    matched_invoice_id uuid,
    payment_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bank_import_entries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'skipped'::text])))
);


ALTER TABLE app.bank_import_entries OWNER TO workshop;

--
-- Name: COLUMN bank_import_entries.fingerprint; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.bank_import_entries.fingerprint IS 'AcctSvcrRef / EndToEndId / hash ÔÇö idempotenca uvoza po najemniku.';


--
-- Name: bank_imports; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.bank_imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    filename text,
    account_iban text,
    stmt_from date,
    stmt_to date,
    entries_total integer DEFAULT 0 NOT NULL,
    entries_credit integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.bank_imports OWNER TO workshop;

--
-- Name: change_feed; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.change_feed (
    cursor bigint NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    op text NOT NULL,
    version integer NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT change_feed_op_check CHECK ((op = ANY (ARRAY['upsert'::text, 'delete'::text])))
);

ALTER TABLE ONLY app.change_feed FORCE ROW LEVEL SECURITY;


ALTER TABLE app.change_feed OWNER TO workshop;

--
-- Name: change_feed_cursor_seq; Type: SEQUENCE; Schema: app; Owner: workshop
--

CREATE SEQUENCE app.change_feed_cursor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.change_feed_cursor_seq OWNER TO workshop;

--
-- Name: change_feed_cursor_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: workshop
--

ALTER SEQUENCE app.change_feed_cursor_seq OWNED BY app.change_feed.cursor;


--
-- Name: customers; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text,
    name text NOT NULL,
    type text DEFAULT 'company'::text NOT NULL,
    country character(2) NOT NULL,
    address text,
    post_code text,
    city text,
    vat_liable boolean DEFAULT true NOT NULL,
    vat_id text,
    tax_id text,
    registration_no text,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    payment_terms_days integer DEFAULT 30 NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0 NOT NULL,
    price_list_id uuid,
    einvoice_capable boolean DEFAULT false NOT NULL,
    peppol_id text,
    minimax_partner_id text,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    vat_id_validated boolean DEFAULT false NOT NULL,
    vat_id_validated_at timestamp with time zone,
    vat_id_validation_source text,
    vat_id_validated_by uuid,
    vat_id_validation_note text,
    phone text,
    CONSTRAINT customers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT customers_type_check CHECK ((type = ANY (ARRAY['individual'::text, 'company'::text]))),
    CONSTRAINT customers_vat_id_validation_source_check CHECK ((vat_id_validation_source = ANY (ARRAY['vies'::text, 'manual'::text]))),
    CONSTRAINT customers_vat_validation_provenance CHECK ((((vat_id_validated = true) AND (vat_id_validation_source IS NOT NULL) AND (vat_id_validated_at IS NOT NULL)) OR ((vat_id_validated = false) AND (vat_id_validation_source IS NULL))))
);

ALTER TABLE ONLY app.customers FORCE ROW LEVEL SECURITY;


ALTER TABLE app.customers OWNER TO workshop;

--
-- Name: COLUMN customers.vat_id_validated; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.customers.vat_id_validated IS 'True only when the VAT id has been validated via VIES or by an audited manual confirmation. Gates EU reverse charge.';


--
-- Name: document_counters; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.document_counters (
    tenant_id uuid NOT NULL,
    doc_type text NOT NULL,
    year integer NOT NULL,
    value integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.document_counters FORCE ROW LEVEL SECURITY;


ALTER TABLE app.document_counters OWNER TO workshop;

--
-- Name: einvoice_documents; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.einvoice_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    channel text NOT NULL,
    format text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payload text,
    authority_ref text,
    last_error text,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT einvoice_documents_channel_check CHECK ((channel = ANY (ARRAY['hr_fiscalization'::text, 'si_eslog_peppol'::text, 'peppol'::text]))),
    CONSTRAINT einvoice_documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'built'::text, 'signed'::text, 'transmitted'::text, 'acknowledged'::text, 'rejected'::text, 'failed'::text])))
);

ALTER TABLE ONLY app.einvoice_documents FORCE ROW LEVEL SECURITY;


ALTER TABLE app.einvoice_documents OWNER TO workshop;

--
-- Name: estimates; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.estimates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number text NOT NULL,
    customer_id uuid NOT NULL,
    asset_id uuid,
    work_order_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    valid_until date,
    invoice_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT estimates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'invoiced'::text])))
);

ALTER TABLE ONLY app.estimates FORCE ROW LEVEL SECURITY;


ALTER TABLE app.estimates OWNER TO workshop;

--
-- Name: field_service_events; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.field_service_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    customer_id uuid,
    kind text NOT NULL,
    location text,
    country text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    travel_seconds integer DEFAULT 0 NOT NULL,
    work_seconds integer DEFAULT 0 NOT NULL,
    waiting_seconds integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT field_service_events_kind_check CHECK ((kind = ANY (ARRAY['field_repair'::text, 'road_assistance'::text, 'mobile_service'::text, 'towing'::text, 'customer_visit'::text, 'parts_collection'::text])))
);

ALTER TABLE ONLY app.field_service_events FORCE ROW LEVEL SECURITY;


ALTER TABLE app.field_service_events OWNER TO workshop;

--
-- Name: fleets; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.fleets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    name text NOT NULL,
    cost_center text,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fleets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);

ALTER TABLE ONLY app.fleets FORCE ROW LEVEL SECURITY;


ALTER TABLE app.fleets OWNER TO workshop;

--
-- Name: goods_receipt_lines; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.goods_receipt_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    goods_receipt_id uuid NOT NULL,
    line_no integer NOT NULL,
    purchase_order_line_id uuid,
    item_id uuid NOT NULL,
    location_id uuid NOT NULL,
    qty integer NOT NULL,
    unit_cost_minor bigint DEFAULT 0 NOT NULL,
    ocr_raw_text text,
    ocr_confidence numeric,
    match_status text DEFAULT 'matched'::text NOT NULL,
    movement_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT goods_receipt_lines_match_status_check CHECK ((match_status = ANY (ARRAY['matched'::text, 'unmatched'::text, 'new_item'::text]))),
    CONSTRAINT goods_receipt_lines_qty_check CHECK ((qty > 0))
);

ALTER TABLE ONLY app.goods_receipt_lines FORCE ROW LEVEL SECURITY;


ALTER TABLE app.goods_receipt_lines OWNER TO workshop;

--
-- Name: goods_receipts; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.goods_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number text,
    supplier_id uuid NOT NULL,
    purchase_order_id uuid,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    received_by uuid,
    delivery_note_ref text,
    source text DEFAULT 'manual'::text NOT NULL,
    ocr_attachment_id uuid,
    ocr_confidence numeric,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT goods_receipts_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ocr'::text]))),
    CONSTRAINT goods_receipts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.goods_receipts FORCE ROW LEVEL SECURITY;


ALTER TABLE app.goods_receipts OWNER TO workshop;

--
-- Name: insight_snapshots; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.insight_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    period_label text NOT NULL,
    window_days integer NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    by_severity jsonb DEFAULT '{}'::jsonb NOT NULL,
    by_category jsonb DEFAULT '{}'::jsonb NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.insight_snapshots FORCE ROW LEVEL SECURITY;


ALTER TABLE app.insight_snapshots OWNER TO workshop;

--
-- Name: integration_credentials; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.integration_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret_ciphertext text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.integration_credentials FORCE ROW LEVEL SECURITY;


ALTER TABLE app.integration_credentials OWNER TO workshop;

--
-- Name: inventory_items; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sku text,
    oem_ref text,
    name text NOT NULL,
    unit text DEFAULT 'pcs'::text NOT NULL,
    cost_minor bigint DEFAULT 0 NOT NULL,
    price_minor bigint DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    vat_rate_pct numeric(5,2) DEFAULT 22 NOT NULL,
    is_core boolean DEFAULT false NOT NULL,
    minimax_article_id text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avg_cost_minor bigint DEFAULT 0 NOT NULL,
    category_id uuid,
    barcode text,
    superseded_by_id uuid,
    preferred_supplier_id uuid
);

ALTER TABLE ONLY app.inventory_items FORCE ROW LEVEL SECURITY;


ALTER TABLE app.inventory_items OWNER TO workshop;

--
-- Name: COLUMN inventory_items.avg_cost_minor; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.inventory_items.avg_cost_minor IS 'Moving weighted-average unit cost (minor units), recomputed on each costed receipt. Basis for stock valuation and part cost on issue.';


--
-- Name: invoice_lines; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.invoice_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    line_no integer NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    quantity numeric(12,3) DEFAULT 1 NOT NULL,
    unit_price_minor bigint DEFAULT 0 NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0 NOT NULL,
    vat_rate_pct numeric(5,2) DEFAULT 0 NOT NULL,
    reverse_charge boolean DEFAULT false NOT NULL,
    net_minor bigint DEFAULT 0 NOT NULL,
    vat_minor bigint DEFAULT 0 NOT NULL,
    gross_minor bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    work_order_id uuid
);

ALTER TABLE ONLY app.invoice_lines FORCE ROW LEVEL SECURITY;


ALTER TABLE app.invoice_lines OWNER TO workshop;

--
-- Name: invoice_vat_breakdown; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.invoice_vat_breakdown (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    rate_pct numeric(5,2) NOT NULL,
    reverse_charge boolean DEFAULT false NOT NULL,
    net_minor bigint NOT NULL,
    vat_minor bigint NOT NULL
);

ALTER TABLE ONLY app.invoice_vat_breakdown FORCE ROW LEVEL SECURITY;


ALTER TABLE app.invoice_vat_breakdown OWNER TO workshop;

--
-- Name: invoice_work_orders; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.invoice_work_orders (
    invoice_id uuid NOT NULL,
    work_order_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.invoice_work_orders FORCE ROW LEVEL SECURITY;


ALTER TABLE app.invoice_work_orders OWNER TO workshop;

--
-- Name: invoices; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    kind text DEFAULT 'invoice'::text NOT NULL,
    number text,
    work_order_id uuid,
    customer_id uuid NOT NULL,
    corrects_invoice_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    vat_treatment text,
    reverse_charge boolean DEFAULT false NOT NULL,
    vat_note text,
    total_net_minor bigint DEFAULT 0 NOT NULL,
    total_vat_minor bigint DEFAULT 0 NOT NULL,
    total_gross_minor bigint DEFAULT 0 NOT NULL,
    paid_minor bigint DEFAULT 0 NOT NULL,
    issue_date date,
    due_date date,
    issued_at timestamp with time zone,
    minimax_invoice_id text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    issued_by uuid,
    CONSTRAINT invoices_kind_check CHECK ((kind = ANY (ARRAY['invoice'::text, 'credit_note'::text, 'proforma'::text]))),
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'sent'::text, 'partly_paid'::text, 'paid'::text, 'overdue'::text, 'credited'::text, 'void'::text])))
);

ALTER TABLE ONLY app.invoices FORCE ROW LEVEL SECURITY;


ALTER TABLE app.invoices OWNER TO workshop;

--
-- Name: labour_standards; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.labour_standards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    op_code text NOT NULL,
    description text NOT NULL,
    vehicle_class text,
    standard_minutes integer NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT labour_standards_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'oem'::text, 'tecdoc'::text]))),
    CONSTRAINT labour_standards_standard_minutes_check CHECK ((standard_minutes > 0))
);

ALTER TABLE ONLY app.labour_standards FORCE ROW LEVEL SECURITY;


ALTER TABLE app.labour_standards OWNER TO workshop;

--
-- Name: leave_requests; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    hours_per_day numeric DEFAULT 8 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reason text,
    decided_by uuid,
    decided_at timestamp with time zone,
    decision_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leave_requests_check CHECK ((end_date >= start_date)),
    CONSTRAINT leave_requests_leave_type_check CHECK ((leave_type = ANY (ARRAY['vacation'::text, 'sick_leave'::text, 'personal_leave'::text, 'business_leave'::text, 'public_holiday'::text, 'planned_absence'::text]))),
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.leave_requests FORCE ROW LEVEL SECURITY;


ALTER TABLE app.leave_requests OWNER TO workshop;

--
-- Name: locations; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    bays integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.locations FORCE ROW LEVEL SECURITY;


ALTER TABLE app.locations OWNER TO workshop;

--
-- Name: login_events; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.login_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    tenant_id uuid,
    email_attempted text,
    method text NOT NULL,
    success boolean NOT NULL,
    ip text,
    user_agent text,
    detail text,
    at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT login_events_method_check CHECK ((method = ANY (ARRAY['local'::text, 'oidc_session'::text, 'api_key'::text, 'logout'::text])))
);


ALTER TABLE app.login_events OWNER TO workshop;

--
-- Name: member_permission_overrides; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.member_permission_overrides (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission text NOT NULL,
    allow boolean NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.member_permission_overrides FORCE ROW LEVEL SECURITY;


ALTER TABLE app.member_permission_overrides OWNER TO workshop;

--
-- Name: memberships; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    roles text[] DEFAULT '{}'::text[] NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.memberships FORCE ROW LEVEL SECURITY;


ALTER TABLE app.memberships OWNER TO workshop;

--
-- Name: notifications; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    recipient_user_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    entity_type text,
    entity_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.notifications FORCE ROW LEVEL SECURITY;


ALTER TABLE app.notifications OWNER TO workshop;

--
-- Name: ocr_extractions; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.ocr_extractions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    attachment_id uuid,
    interaction_id uuid,
    document_type text NOT NULL,
    goods_receipt_id uuid,
    matched_supplier_id uuid,
    overall_confidence numeric,
    review_payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ocr_extractions_document_type_check CHECK ((document_type = ANY (ARRAY['delivery_note'::text, 'supplier_invoice'::text])))
);

ALTER TABLE ONLY app.ocr_extractions FORCE ROW LEVEL SECURITY;


ALTER TABLE app.ocr_extractions OWNER TO workshop;

--
-- Name: outbox; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    idempotency_key text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'dead'::text])))
);

ALTER TABLE ONLY app.outbox FORCE ROW LEVEL SECURITY;


ALTER TABLE app.outbox OWNER TO workshop;

--
-- Name: parts_categories; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.parts_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.parts_categories FORCE ROW LEVEL SECURITY;


ALTER TABLE app.parts_categories OWNER TO workshop;

--
-- Name: payment_allocations; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.payment_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    applied_minor bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_allocations_applied_minor_check CHECK ((applied_minor > 0))
);

ALTER TABLE ONLY app.payment_allocations FORCE ROW LEVEL SECURITY;


ALTER TABLE app.payment_allocations OWNER TO workshop;

--
-- Name: payments; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    amount_minor bigint NOT NULL,
    method text DEFAULT 'bank'::text NOT NULL,
    received_at date NOT NULL,
    reference text,
    unapplied_minor bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    reversed_at timestamp with time zone,
    reversed_by uuid,
    reversal_reason text,
    CONSTRAINT payments_amount_minor_check CHECK ((amount_minor > 0)),
    CONSTRAINT payments_method_check CHECK ((method = ANY (ARRAY['bank'::text, 'cash'::text, 'card'::text, 'other'::text])))
);

ALTER TABLE ONLY app.payments FORCE ROW LEVEL SECURITY;


ALTER TABLE app.payments OWNER TO workshop;

--
-- Name: COLUMN payments.reversed_at; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.payments.reversed_at IS 'Storno: pla─ìilo razknji┼¥eno (paid_minor na ra─ìunih vrnjen); NULL = veljavno pla─ìilo.';


--
-- Name: plate_recognitions; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.plate_recognitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    attachment_id uuid,
    interaction_id uuid,
    read_plate text,
    canonical_plate text,
    country text,
    confidence numeric,
    outcome text DEFAULT 'none'::text NOT NULL,
    review_payload jsonb NOT NULL,
    confirmed_asset_id uuid,
    work_order_id uuid,
    work_order_created boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plate_recognitions_outcome_check CHECK ((outcome = ANY (ARRAY['single'::text, 'ambiguous'::text, 'none'::text])))
);

ALTER TABLE ONLY app.plate_recognitions FORCE ROW LEVEL SECURITY;


ALTER TABLE app.plate_recognitions OWNER TO workshop;

--
-- Name: portal_sessions; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.portal_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    token_hash text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);

ALTER TABLE ONLY app.portal_sessions FORCE ROW LEVEL SECURITY;


ALTER TABLE app.portal_sessions OWNER TO workshop;

--
-- Name: presets; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    vehicle_classes text[] DEFAULT '{}'::text[] NOT NULL,
    powertrains text[] DEFAULT '{}'::text[] NOT NULL,
    lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.presets FORCE ROW LEVEL SECURITY;


ALTER TABLE app.presets OWNER TO workshop;

--
-- Name: purchase_order_lines; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.purchase_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    purchase_order_id uuid NOT NULL,
    line_no integer NOT NULL,
    item_id uuid NOT NULL,
    supplier_item_id uuid,
    description text NOT NULL,
    qty_ordered integer NOT NULL,
    qty_received integer DEFAULT 0 NOT NULL,
    unit_cost_minor bigint DEFAULT 0 NOT NULL,
    vat_rate_pct numeric(5,2) DEFAULT 22 NOT NULL,
    net_minor bigint DEFAULT 0 NOT NULL,
    vat_minor bigint DEFAULT 0 NOT NULL,
    gross_minor bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_order_lines_qty_ordered_check CHECK ((qty_ordered > 0)),
    CONSTRAINT purchase_order_lines_qty_received_check CHECK ((qty_received >= 0))
);

ALTER TABLE ONLY app.purchase_order_lines FORCE ROW LEVEL SECURITY;


ALTER TABLE app.purchase_order_lines OWNER TO workshop;

--
-- Name: purchase_orders; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number text,
    supplier_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    expected_date date,
    ship_to_location_id uuid,
    total_net_minor bigint DEFAULT 0 NOT NULL,
    total_vat_minor bigint DEFAULT 0 NOT NULL,
    total_gross_minor bigint DEFAULT 0 NOT NULL,
    notes text,
    minimax_doc_id text,
    created_by uuid,
    updated_by uuid,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'partially_received'::text, 'received'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.purchase_orders FORCE ROW LEVEL SECURITY;


ALTER TABLE app.purchase_orders OWNER TO workshop;

--
-- Name: rental_contracts; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.rental_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number text NOT NULL,
    reservation_id uuid,
    rental_vehicle_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    pickup_location text,
    return_location text,
    daily_rate_minor bigint DEFAULT 0 NOT NULL,
    included_km_per_day integer DEFAULT 0 NOT NULL,
    per_km_rate_minor bigint DEFAULT 0 NOT NULL,
    per_fuel_eighth_minor bigint DEFAULT 0 NOT NULL,
    cleaning_fee_minor bigint DEFAULT 0 NOT NULL,
    late_fee_per_day_minor bigint DEFAULT 0 NOT NULL,
    deposit_minor bigint DEFAULT 0 NOT NULL,
    deductible_minor bigint DEFAULT 0 NOT NULL,
    casco boolean DEFAULT false NOT NULL,
    fuel_policy text DEFAULT 'full_to_full'::text NOT NULL,
    mileage_policy text,
    late_policy text,
    currency text DEFAULT 'EUR'::text NOT NULL,
    start_mileage_km integer,
    start_fuel_eighths integer,
    handover_at timestamp with time zone,
    handover_signature_attachment_id uuid,
    return_mileage_km integer,
    return_fuel_eighths integer,
    returned_dirty boolean DEFAULT false NOT NULL,
    return_at timestamp with time zone,
    return_signature_attachment_id uuid,
    charges jsonb,
    invoice_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rental_contracts_check CHECK ((end_at > start_at)),
    CONSTRAINT rental_contracts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'handed_over'::text, 'returned'::text, 'invoiced'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.rental_contracts FORCE ROW LEVEL SECURITY;


ALTER TABLE app.rental_contracts OWNER TO workshop;

--
-- Name: rental_damages; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.rental_damages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    recorded_at_stage text DEFAULT 'return'::text NOT NULL,
    description text NOT NULL,
    severity text DEFAULT 'minor'::text NOT NULL,
    estimated_cost_minor bigint DEFAULT 0 NOT NULL,
    photo_attachment_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rental_damages_recorded_at_stage_check CHECK ((recorded_at_stage = ANY (ARRAY['handover'::text, 'return'::text]))),
    CONSTRAINT rental_damages_severity_check CHECK ((severity = ANY (ARRAY['minor'::text, 'moderate'::text, 'major'::text])))
);

ALTER TABLE ONLY app.rental_damages FORCE ROW LEVEL SECURITY;


ALTER TABLE app.rental_damages OWNER TO workshop;

--
-- Name: rental_reservations; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.rental_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    rental_vehicle_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    pickup_location text,
    return_location text,
    status text DEFAULT 'reserved'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rental_reservations_check CHECK ((end_at > start_at)),
    CONSTRAINT rental_reservations_status_check CHECK ((status = ANY (ARRAY['reserved'::text, 'confirmed'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.rental_reservations FORCE ROW LEVEL SECURITY;


ALTER TABLE app.rental_reservations OWNER TO workshop;

--
-- Name: rental_vehicles; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.rental_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    category text DEFAULT 'car'::text NOT NULL,
    make text,
    model text,
    plate text NOT NULL,
    vin text,
    year integer,
    daily_rate_minor bigint DEFAULT 0 NOT NULL,
    included_km_per_day integer DEFAULT 0 NOT NULL,
    per_km_rate_minor bigint DEFAULT 0 NOT NULL,
    per_fuel_eighth_minor bigint DEFAULT 0 NOT NULL,
    cleaning_fee_minor bigint DEFAULT 0 NOT NULL,
    late_fee_per_day_minor bigint DEFAULT 0 NOT NULL,
    deposit_minor bigint DEFAULT 0 NOT NULL,
    deductible_minor bigint DEFAULT 0 NOT NULL,
    fuel_tank_eighths integer DEFAULT 8 NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    current_mileage_km integer DEFAULT 0 NOT NULL,
    current_fuel_eighths integer DEFAULT 8 NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rental_vehicles_category_check CHECK ((category = ANY (ARRAY['motorhome'::text, 'car'::text, 'replacement'::text, 'service'::text, 'van'::text, 'other'::text]))),
    CONSTRAINT rental_vehicles_status_check CHECK ((status = ANY (ARRAY['available'::text, 'rented'::text, 'maintenance'::text, 'retired'::text])))
);

ALTER TABLE ONLY app.rental_vehicles FORCE ROW LEVEL SECURITY;


ALTER TABLE app.rental_vehicles OWNER TO workshop;

--
-- Name: schema_migrations; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.schema_migrations (
    filename text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.schema_migrations OWNER TO workshop;

--
-- Name: service_vehicles; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.service_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    registration_number text NOT NULL,
    vin text,
    make text,
    model text,
    fuel_type text,
    current_mileage_km integer DEFAULT 0 NOT NULL,
    assigned_user_id uuid,
    insurance_note text,
    registration_expiry date,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_vehicles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'retired'::text])))
);

ALTER TABLE ONLY app.service_vehicles FORCE ROW LEVEL SECURITY;


ALTER TABLE app.service_vehicles OWNER TO workshop;

--
-- Name: signup_tokens; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.signup_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    token_hash character(64) NOT NULL,
    purpose text DEFAULT 'signup'::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT signup_tokens_purpose_check CHECK ((purpose = ANY (ARRAY['signup'::text, 'password_reset'::text])))
);

ALTER TABLE ONLY app.signup_tokens FORCE ROW LEVEL SECURITY;


ALTER TABLE app.signup_tokens OWNER TO workshop;

--
-- Name: stock_count_lines; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.stock_count_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    stock_count_id uuid NOT NULL,
    item_id uuid NOT NULL,
    location_id uuid NOT NULL,
    system_qty integer NOT NULL,
    counted_qty integer,
    variance integer GENERATED ALWAYS AS ((COALESCE(counted_qty, 0) - system_qty)) STORED,
    adjustment_movement_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.stock_count_lines FORCE ROW LEVEL SECURITY;


ALTER TABLE app.stock_count_lines OWNER TO workshop;

--
-- Name: stock_counts; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.stock_counts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number text,
    scope text DEFAULT 'location'::text NOT NULL,
    location_id uuid,
    status text DEFAULT 'open'::text NOT NULL,
    started_by uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_by uuid,
    closed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_counts_scope_check CHECK ((scope = ANY (ARRAY['location'::text, 'item_subset'::text, 'full'::text]))),
    CONSTRAINT stock_counts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'counting'::text, 'review'::text, 'closed'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.stock_counts FORCE ROW LEVEL SECURITY;


ALTER TABLE app.stock_counts OWNER TO workshop;

--
-- Name: stock_levels; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.stock_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    item_id uuid NOT NULL,
    location_id uuid NOT NULL,
    on_hand integer DEFAULT 0 NOT NULL,
    reserved integer DEFAULT 0 NOT NULL,
    reorder_point integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reorder_qty integer DEFAULT 0 NOT NULL,
    max_qty integer,
    bin text,
    CONSTRAINT stock_levels_check CHECK ((reserved <= on_hand)),
    CONSTRAINT stock_levels_on_hand_check CHECK ((on_hand >= 0)),
    CONSTRAINT stock_levels_reserved_check CHECK ((reserved >= 0))
);

ALTER TABLE ONLY app.stock_levels FORCE ROW LEVEL SECURITY;


ALTER TABLE app.stock_levels OWNER TO workshop;

--
-- Name: stock_movements; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    item_id uuid NOT NULL,
    location_id uuid NOT NULL,
    type text NOT NULL,
    quantity integer NOT NULL,
    work_order_line_id uuid,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    unit_cost_minor bigint,
    transfer_id uuid,
    source_ref text,
    CONSTRAINT stock_movements_type_check CHECK ((type = ANY (ARRAY['receive'::text, 'reserve'::text, 'issue'::text, 'release'::text, 'adjust'::text, 'transfer_out'::text, 'transfer_in'::text])))
);

ALTER TABLE ONLY app.stock_movements FORCE ROW LEVEL SECURITY;


ALTER TABLE app.stock_movements OWNER TO workshop;

--
-- Name: COLUMN stock_movements.unit_cost_minor; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.stock_movements.unit_cost_minor IS 'Per-unit cost captured on receive/transfer_in movements; null for reserve/release/issue/adjust.';


--
-- Name: supplier_items; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.supplier_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    item_id uuid NOT NULL,
    supplier_sku text,
    supplier_name text,
    pack_size integer DEFAULT 1 NOT NULL,
    last_price_minor bigint DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    lead_time_days integer,
    preferred boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT supplier_items_pack_size_check CHECK ((pack_size >= 1))
);

ALTER TABLE ONLY app.supplier_items FORCE ROW LEVEL SECURITY;


ALTER TABLE app.supplier_items OWNER TO workshop;

--
-- Name: suppliers; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text,
    name text NOT NULL,
    country character(2) DEFAULT 'SI'::bpchar NOT NULL,
    vat_id text,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    payment_terms_days integer DEFAULT 30 NOT NULL,
    default_lead_time_days integer DEFAULT 3 NOT NULL,
    email text,
    phone text,
    address text,
    notes text,
    minimax_partner_id text,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid,
    updated_by uuid,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppliers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);

ALTER TABLE ONLY app.suppliers FORCE ROW LEVEL SECURITY;


ALTER TABLE app.suppliers OWNER TO workshop;

--
-- Name: sync_mutations; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.sync_mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    device_id text NOT NULL,
    idempotency_key text NOT NULL,
    result jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.sync_mutations FORCE ROW LEVEL SECURITY;


ALTER TABLE app.sync_mutations OWNER TO workshop;

--
-- Name: tenants; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    country character(2) NOT NULL,
    vat_id text,
    tax_id text,
    registration_no text,
    default_currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    languages text[] DEFAULT ARRAY['sl'::text, 'en'::text] NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    plan text DEFAULT 'founders'::text NOT NULL,
    billing_status text DEFAULT 'active'::text NOT NULL,
    trial_ends_at timestamp with time zone,
    iban text,
    bank_name text,
    address text,
    post_code text,
    city text,
    stripe_customer_id text,
    stripe_subscription_id text,
    phone text,
    fax text,
    email text,
    website text,
    bic text,
    iban2 text,
    bic2 text,
    registration_note text,
    sms_enabled boolean DEFAULT true NOT NULL,
    minimax_enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT tenants_billing_status_check CHECK ((billing_status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'suspended'::text, 'cancelled'::text]))),
    CONSTRAINT tenants_plan_check CHECK ((plan = ANY (ARRAY['trial'::text, 'start'::text, 'delavnica'::text, 'flota'::text, 'founders'::text]))),
    CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text])))
);


ALTER TABLE app.tenants OWNER TO workshop;

--
-- Name: COLUMN tenants.iban; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.iban IS 'TRR delavnice za UPN QR (prejemnikov IBAN, polje 15).';


--
-- Name: COLUMN tenants.bank_name; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.bank_name IS 'Naziv banke (informativno, prikaz na ra─ìunu).';


--
-- Name: COLUMN tenants.address; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.address IS 'Ulica in hi┼ína ┼ítevilka (UPN QR polje 18, e-SLOG prodajalec).';


--
-- Name: COLUMN tenants.post_code; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.post_code IS 'Po┼ítna ┼ítevilka (del UPN QR polja 19).';


--
-- Name: COLUMN tenants.city; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.city IS 'Kraj (del UPN QR polja 19).';


--
-- Name: COLUMN tenants.stripe_customer_id; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.stripe_customer_id IS 'Stripe Customer (cus_ÔÇª) ÔÇö vezava za Billing Portal in webhooke.';


--
-- Name: COLUMN tenants.stripe_subscription_id; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.stripe_subscription_id IS 'Stripe Subscription (sub_ÔÇª) ÔÇö vezava za status webhooke.';


--
-- Name: COLUMN tenants.registration_note; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.registration_note IS 'Noga ra─ìuna: registracija dru┼¥be, osnovni kapital, mati─ìna ┼ít. ÔÇö prosto besedilo, izpi┼íe se na dnu vsakega ra─ìuna.';


--
-- Name: COLUMN tenants.sms_enabled; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.sms_enabled IS 'Ali delavnica po┼íilja operativna SMS obvestila strankam (vehicle_ready, invoice_available, payment_reminder, appointment_reminder). Dejanska dostava ┼íe vedno zahteva INFOBIP_* poverilnice; izklop tukaj sporo─ìila sploh ne uvrsti v outbox.';


--
-- Name: COLUMN tenants.minimax_enabled; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.tenants.minimax_enabled IS 'Ali se izdani ra─ìuni sinhronizirajo v Minimax. Izklop prepre─ìi uvrstitev minimax.invoice.upsert / partner upsert v outbox.';


--
-- Name: time_entries; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.time_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    work_order_id uuid NOT NULL,
    mechanic_id uuid NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    cost_minor bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT time_entries_check CHECK (((ended_at IS NULL) OR (ended_at >= started_at)))
);

ALTER TABLE ONLY app.time_entries FORCE ROW LEVEL SECURITY;


ALTER TABLE app.time_entries OWNER TO workshop;

--
-- Name: travel_orders; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.travel_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number text,
    user_id uuid NOT NULL,
    service_vehicle_id uuid,
    customer_id uuid,
    work_order_id uuid,
    purpose text NOT NULL,
    destination text,
    country text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    travel_seconds integer DEFAULT 0 NOT NULL,
    work_seconds integer DEFAULT 0 NOT NULL,
    waiting_seconds integer DEFAULT 0 NOT NULL,
    km numeric DEFAULT 0 NOT NULL,
    per_km_rate_minor integer DEFAULT 0 NOT NULL,
    expenses_minor integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_orders_purpose_check CHECK ((purpose = ANY (ARRAY['field_repair'::text, 'field_repair_abroad'::text, 'road_assistance'::text, 'towing'::text, 'parts_pickup'::text, 'customer_visit'::text]))),
    CONSTRAINT travel_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'completed'::text, 'exported'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.travel_orders FORCE ROW LEVEL SECURITY;


ALTER TABLE app.travel_orders OWNER TO workshop;

--
-- Name: user_credentials; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.user_credentials (
    user_id uuid NOT NULL,
    password_hash text NOT NULL,
    email_verified_at timestamp with time zone,
    failed_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY app.user_credentials FORCE ROW LEVEL SECURITY;


ALTER TABLE app.user_credentials OWNER TO workshop;

--
-- Name: user_sessions; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_id text,
    user_agent text,
    ip_hint text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone
);


ALTER TABLE app.user_sessions OWNER TO workshop;

--
-- Name: users; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    name text NOT NULL,
    locale text DEFAULT 'sl'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    external_subject text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text,
    phone text,
    avatar_key text,
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text])))
);


ALTER TABLE app.users OWNER TO workshop;

--
-- Name: voice_drafts; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.voice_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    attachment_id uuid,
    interaction_id uuid,
    transcript text,
    language text,
    intent text DEFAULT 'unclear'::text NOT NULL,
    completeness numeric,
    needs_review boolean DEFAULT true NOT NULL,
    draft_payload jsonb NOT NULL,
    work_order_id uuid,
    outcome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT voice_drafts_intent_check CHECK ((intent = ANY (ARRAY['create_new'::text, 'update_existing'::text, 'unclear'::text]))),
    CONSTRAINT voice_drafts_outcome_check CHECK ((outcome = ANY (ARRAY['created'::text, 'updated'::text, 'discarded'::text])))
);

ALTER TABLE ONLY app.voice_drafts FORCE ROW LEVEL SECURITY;


ALTER TABLE app.voice_drafts OWNER TO workshop;

--
-- Name: work_order_approvals; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.work_order_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    work_order_id uuid NOT NULL,
    kind text DEFAULT 'additional_work'::text NOT NULL,
    title text NOT NULL,
    proposed_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    amount_net_minor bigint DEFAULT 0 NOT NULL,
    amount_gross_minor bigint DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    responded_at timestamp with time zone,
    response_note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT work_order_approvals_kind_check CHECK ((kind = ANY (ARRAY['additional_work'::text, 'estimate'::text]))),
    CONSTRAINT work_order_approvals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text, 'expired'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY app.work_order_approvals FORCE ROW LEVEL SECURITY;


ALTER TABLE app.work_order_approvals OWNER TO workshop;

--
-- Name: work_order_lines; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.work_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    work_order_id uuid NOT NULL,
    line_no integer NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    inventory_item_id uuid,
    quantity numeric(12,3) DEFAULT 1 NOT NULL,
    unit_price_minor bigint DEFAULT 0 NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0 NOT NULL,
    vat_rate_pct numeric(5,2) DEFAULT 22 NOT NULL,
    net_minor bigint DEFAULT 0 NOT NULL,
    vat_minor bigint DEFAULT 0 NOT NULL,
    gross_minor bigint DEFAULT 0 NOT NULL,
    issued boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reserved_location_id uuid,
    standard_minutes integer,
    clocked_seconds integer,
    CONSTRAINT work_order_lines_type_check CHECK ((type = ANY (ARRAY['labour'::text, 'part'::text, 'sublet'::text, 'kit'::text, 'fee'::text, 'core'::text, 'discount'::text])))
);

ALTER TABLE ONLY app.work_order_lines FORCE ROW LEVEL SECURITY;


ALTER TABLE app.work_order_lines OWNER TO workshop;

--
-- Name: COLUMN work_order_lines.reserved_location_id; Type: COMMENT; Schema: app; Owner: workshop
--

COMMENT ON COLUMN app.work_order_lines.reserved_location_id IS 'Location where this part line reserved stock; issuing must occur at this same location.';


--
-- Name: work_orders; Type: TABLE; Schema: app; Owner: workshop
--

CREATE TABLE app.work_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number text,
    location_id uuid,
    customer_id uuid NOT NULL,
    asset_id uuid,
    fleet_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    complaint text,
    diagnosis text,
    odometer integer,
    engine_hours integer,
    advisor_id uuid,
    assigned_mechanic_id uuid,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    customer_po text,
    total_net_minor bigint DEFAULT 0 NOT NULL,
    total_vat_minor bigint DEFAULT 0 NOT NULL,
    total_gross_minor bigint DEFAULT 0 NOT NULL,
    opened_at timestamp with time zone,
    ready_at timestamp with time zone,
    invoiced_at timestamp with time zone,
    closed_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);

ALTER TABLE ONLY app.work_orders FORCE ROW LEVEL SECURITY;


ALTER TABLE app.work_orders OWNER TO workshop;

--
-- Name: change_feed cursor; Type: DEFAULT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.change_feed ALTER COLUMN cursor SET DEFAULT nextval('app.change_feed_cursor_seq'::regclass);


--
-- Data for Name: ai_interactions; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.ai_interactions (id, tenant_id, feature, user_id, model, residency_region, input_ref, output, confidence, latency_ms, cost_micros, created_at) FROM stdin;
4811d2e6-45cb-4ff6-8d6b-506516607cb3	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-07 20:49:02.847635+00
2f2622de-e587-4851-b070-dc388297d780	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-09 13:54:58.560953+00
f5b1b8c3-8573-46c9-a4de-7b44ac4074a9	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-11 10:42:06.283063+00
1ae0cc6e-3705-4fbc-a99b-baec5f7f901e	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-11 10:42:09.598896+00
d4ee00ed-fd36-41ee-9545-04f593096144	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-11 10:42:09.629023+00
0e6b73f1-6608-4aa2-822e-72b419539db8	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-11 10:42:30.974583+00
0064acd0-fc72-45ce-9437-f2c8740eba71	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-11 10:42:30.993201+00
4a701536-bf59-48db-a4dd-22c498eed3bd	00000000-0000-0000-0000-0000000a5b71	workshop_manager_summary	00000000-0000-0000-0000-0000000a5001	fixture	eu	\N	"{}"	\N	1	0	2026-06-11 10:42:32.179445+00
\.


--
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.ai_suggestions (id, tenant_id, interaction_id, target_entity_type, target_entity_id, suggested_payload, decision, decided_by, decided_at, created_at) FROM stdin;
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.api_keys (id, tenant_id, name, prefix, key_hash, roles, created_by, created_at, last_used_at, revoked_at, revoked_by) FROM stdin;
fda4d968-25cf-416c-b3f4-9e7022a1304a	00000000-0000-0000-0000-0000000a5b71	QA test (Playwright)	wos_419b95e1	29252e8f9430d9d8e5691717cc0bd91a3e3a60a755624345d43b8a94e7c1b83c	{read_only}	00000000-0000-0000-0000-0000000a5001	2026-06-12 14:07:57.095671+00	\N	2026-06-13 16:34:32.244695+00	00000000-0000-0000-0000-0000000a5001
\.


--
-- Data for Name: appointment_requests; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.appointment_requests (id, tenant_id, customer_id, asset_id, preferred_date, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.appointments (id, tenant_id, customer_id, asset_id, work_order_id, title, start_at, end_at, duration_min, note, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: asset_links; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.asset_links (id, tenant_id, tractor_asset_id, trailer_asset_id, valid_from, valid_to, created_at) FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.assets (id, tenant_id, customer_id, fleet_id, type, plate, country_of_plate, vin, make, model, year, odometer_last, engine_hours_last, tecdoc_type_id, status, version, created_at, updated_at, created_by, updated_by) FROM stdin;
f1a21afa-39f2-4c5b-a029-fb5b8f569f02	00000000-0000-0000-0000-0000000a5b71	4e7b58b9-73ba-452c-a233-c52184906127	\N	truck	NMJT240	SI	\N	\N	\N	\N	\N	\N	\N	active	1	2026-06-09 19:19:01.506008+00	2026-06-09 19:19:01.506008+00	00000000-0000-0000-0000-0000000a5001	00000000-0000-0000-0000-0000000a5001
40871ba1-624b-4224-b079-0519c2118eb4	00000000-0000-0000-0000-0000000a5b71	400733fd-c416-4d12-85ba-31203783e0f6	\N	truck	NMTEST1	SI	\N	MAN	TGX	\N	\N	\N	\N	active	1	2026-06-09 20:58:17.476856+00	2026-06-09 20:58:17.476856+00	00000000-0000-0000-0000-0000000a5001	00000000-0000-0000-0000-0000000a5001
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.attachments (id, tenant_id, work_order_id, kind, storage_key, content_type, byte_size, checksum_sha256, original_filename, transcript, status, uploaded_by, created_at, stored_at) FROM stdin;
\.


--
-- Data for Name: attendance_breaks; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.attendance_breaks (id, tenant_id, attendance_day_id, start_at, end_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance_days; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.attendance_days (id, tenant_id, user_id, work_date, clock_in_at, clock_out_at, corrected_by, corrected_at, note, created_at, updated_at) FROM stdin;
c9d59de7-1556-4f7a-8196-4ff19b1b777b	00000000-0000-0000-0000-0000000a5b71	00000000-0000-0000-0000-0000000a5001	2026-06-07	2026-06-07 21:22:54.461+00	2026-06-07 21:22:56.318+00	\N	\N	\N	2026-06-07 21:22:54.460619+00	2026-06-07 21:22:56.317592+00
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.audit_log (id, tenant_id, seq, actor_id, action, entity_type, entity_id, before, after, occurred_at, prev_hash, hash, created_at) FROM stdin;
39253488-063c-43b6-89be-ea8f09be2350	00000000-0000-0000-0000-0000000a5b71	1	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	2961afee-cd4f-44ca-b852-4d6f4ef32a03	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-07 20:49:02.853+00	0000000000000000000000000000000000000000000000000000000000000000	6eb5f547c3e6e94d3d04a269f4262508666f86f1487dd2a76e099b53f03fffa0	2026-06-07 20:49:02.851933+00
7a206c2c-e1c1-4676-aa65-e22cae88df2e	00000000-0000-0000-0000-0000000a5b71	2	00000000-0000-0000-0000-0000000a5001	attendance.clock_in	attendance_day	c9d59de7-1556-4f7a-8196-4ff19b1b777b	\N	{"clockInAt": "2026-06-07T21:22:54.461Z"}	2026-06-07 21:22:54.464+00	6eb5f547c3e6e94d3d04a269f4262508666f86f1487dd2a76e099b53f03fffa0	e952845805fca2c8cccffec733733fef572689e24ce92896d55ce1e4b7d2fa8c	2026-06-07 21:22:54.460619+00
db0aa557-6071-496c-9a40-09dc3d503b6d	00000000-0000-0000-0000-0000000a5b71	3	00000000-0000-0000-0000-0000000a5001	attendance.clock_out	attendance_day	c9d59de7-1556-4f7a-8196-4ff19b1b777b	{"clockOutAt": null}	{"clockOutAt": "2026-06-07T21:22:56.318Z"}	2026-06-07 21:22:56.321+00	e952845805fca2c8cccffec733733fef572689e24ce92896d55ce1e4b7d2fa8c	037f76748e478b2c1324d96d57be7133517a038d41fef586faecb8d8f2eac3b4	2026-06-07 21:22:56.317592+00
c4f03ef8-e8f0-46ca-ade8-e1b8390e32ed	00000000-0000-0000-0000-0000000a5b71	4	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	e0c308db-87fc-4731-9a16-de377cf7e4a2	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-09 13:54:58.565+00	037f76748e478b2c1324d96d57be7133517a038d41fef586faecb8d8f2eac3b4	9edf46ff02b7979352eb0f230f74cead53dfa78234e242cfc7abf591801512ad	2026-06-09 13:54:58.564801+00
880053da-0c77-4e1b-b8fc-007ed280f5a7	00000000-0000-0000-0000-0000000a5b71	5	00000000-0000-0000-0000-0000000a5001	customer.created	customer	bea20189-620d-4064-8e4b-4ac62512d0c8	\N	{"id": "bea20189-620d-4064-8e4b-4ac62512d0c8", "city": "Kranj", "code": null, "name": "Testni prevozi d.o.o", "type": "company", "notes": null, "taxId": null, "vatId": null, "status": "active", "address": "Harkovska1", "country": "BA", "currency": "EUR", "peppolId": null, "postCode": "2311", "tenantId": "00000000-0000-0000-0000-0000000a5b71", "vatLiable": false, "discountPct": "5.00", "priceListId": null, "registrationNo": null, "vatIdValidated": false, "einvoiceCapable": false, "minimaxPartnerId": null, "paymentTermsDays": 30, "vatIdValidatedAt": null, "vatIdValidationSource": null}	2026-06-09 19:17:48.885+00	9edf46ff02b7979352eb0f230f74cead53dfa78234e242cfc7abf591801512ad	def73770f522b2946b5e625fdd81e58e03f8fa939526f442f54f7889d93d7d9e	2026-06-09 19:17:48.881863+00
b37a5041-61b7-4595-9897-67fa1f879b00	00000000-0000-0000-0000-0000000a5b71	6	00000000-0000-0000-0000-0000000a5001	customer.created	customer	4e7b58b9-73ba-452c-a233-c52184906127	\N	{"id": "4e7b58b9-73ba-452c-a233-c52184906127", "city": null, "code": null, "name": "TEST", "type": "company", "notes": null, "taxId": null, "vatId": null, "status": "active", "address": "t342", "country": "SI", "currency": "EUR", "peppolId": null, "postCode": "4234", "tenantId": "00000000-0000-0000-0000-0000000a5b71", "vatLiable": false, "discountPct": "0.00", "priceListId": null, "registrationNo": null, "vatIdValidated": false, "einvoiceCapable": false, "minimaxPartnerId": null, "paymentTermsDays": 30, "vatIdValidatedAt": null, "vatIdValidationSource": null}	2026-06-09 19:18:47.914+00	def73770f522b2946b5e625fdd81e58e03f8fa939526f442f54f7889d93d7d9e	eee8abeb523254792f4d169455c311194a86b8ff4ec31c8aec7345f3764c11fc	2026-06-09 19:18:47.911325+00
2934a67f-7187-4f5e-87bb-32633819a180	00000000-0000-0000-0000-0000000a5b71	7	00000000-0000-0000-0000-0000000a5001	asset.created	asset	f1a21afa-39f2-4c5b-a029-fb5b8f569f02	\N	{"id": "f1a21afa-39f2-4c5b-a029-fb5b8f569f02", "vin": null, "make": null, "type": "truck", "year": null, "model": null, "plate": "NMJT240", "status": "active", "fleetId": null, "tenantId": "00000000-0000-0000-0000-0000000a5b71", "customerId": "4e7b58b9-73ba-452c-a233-c52184906127", "odometerLast": null, "countryOfPlate": "SI"}	2026-06-09 19:19:01.508+00	eee8abeb523254792f4d169455c311194a86b8ff4ec31c8aec7345f3764c11fc	2d85a83c4ca3bf8be2d634e57401c03720dd160cbca49576e541859fd0190666	2026-06-09 19:19:01.506008+00
e2f5e023-6895-4ee3-9444-e88f66c5d4f7	00000000-0000-0000-0000-0000000a5b71	8	00000000-0000-0000-0000-0000000a5001	customer.created	customer	400733fd-c416-4d12-85ba-31203783e0f6	\N	{"id": "400733fd-c416-4d12-85ba-31203783e0f6", "city": null, "code": null, "name": "Test Prevoz d.o.o.", "type": "company", "notes": null, "taxId": null, "vatId": "SI12345678", "status": "active", "address": null, "country": "SI", "currency": "EUR", "peppolId": null, "postCode": null, "tenantId": "00000000-0000-0000-0000-0000000a5b71", "vatLiable": true, "discountPct": "0.00", "priceListId": null, "registrationNo": null, "vatIdValidated": false, "einvoiceCapable": false, "minimaxPartnerId": null, "paymentTermsDays": 30, "vatIdValidatedAt": null, "vatIdValidationSource": null}	2026-06-09 20:53:44.381+00	2d85a83c4ca3bf8be2d634e57401c03720dd160cbca49576e541859fd0190666	005eb2b1f5fa8a3a185e8a1087d509033610888b04df9037108ac29b45049e5a	2026-06-09 20:53:44.378447+00
c31aad80-81f6-458f-92df-99abaab4d23e	00000000-0000-0000-0000-0000000a5b71	9	00000000-0000-0000-0000-0000000a5001	asset.created	asset	40871ba1-624b-4224-b079-0519c2118eb4	\N	{"id": "40871ba1-624b-4224-b079-0519c2118eb4", "vin": null, "make": "MAN", "type": "truck", "year": null, "model": "TGX", "plate": "NMTEST1", "status": "active", "fleetId": null, "tenantId": "00000000-0000-0000-0000-0000000a5b71", "customerId": "400733fd-c416-4d12-85ba-31203783e0f6", "odometerLast": null, "countryOfPlate": "SI"}	2026-06-09 20:58:17.478+00	005eb2b1f5fa8a3a185e8a1087d509033610888b04df9037108ac29b45049e5a	682c9265f78e7eb0cb26ced5f35287e2597fbaf12d839846e77034ec517c68bf	2026-06-09 20:58:17.476856+00
bc4b0243-7375-4aff-9307-2f8aae1dbbd3	00000000-0000-0000-0000-0000000a5b71	10	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	515165e5-6009-4528-9702-f2c2078356d1	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-11 10:42:06.292+00	682c9265f78e7eb0cb26ced5f35287e2597fbaf12d839846e77034ec517c68bf	192216f23a4a0fa856669de806534d04594e7e183f51046fd25678e8cc0d74e5	2026-06-11 10:42:06.28884+00
0f399161-b84d-432b-ac45-2aa5928ef50c	00000000-0000-0000-0000-0000000a5b71	11	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	c416a55d-eb2b-4729-8b2f-4fde22951465	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-11 10:42:09.611+00	192216f23a4a0fa856669de806534d04594e7e183f51046fd25678e8cc0d74e5	8154ee5aac2cdebc50203f70e9c078c31e5314b679ec2d9300fd3eb76b96c690	2026-06-11 10:42:09.609455+00
f4006adb-3eb7-4976-949a-866b94461c8e	00000000-0000-0000-0000-0000000a5b71	12	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	3b8a93b2-6488-45ea-afcc-15a6f7ceaeec	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-11 10:42:09.637+00	8154ee5aac2cdebc50203f70e9c078c31e5314b679ec2d9300fd3eb76b96c690	d7ac4ab1eec016f66079b2fc9a174ddd5ee240d574ffced419817859a891070f	2026-06-11 10:42:09.636796+00
a8170320-19d1-4204-a731-88c97d4443b8	00000000-0000-0000-0000-0000000a5b71	13	00000000-0000-0000-0000-0000000a5001	export.snapshot	tenant	00000000-0000-0000-0000-0000000a5b71	\N	{"rows": 1005, "entities": 14}	2026-06-11 10:42:18.023+00	d7ac4ab1eec016f66079b2fc9a174ddd5ee240d574ffced419817859a891070f	df601a8d1d3c0f6fc9d3045355da4e5c1ae9cfe53e6d0d322a854d26f91a23de	2026-06-11 10:42:17.990761+00
dffeeaa8-e5be-4d4e-b6c8-30e54843b733	00000000-0000-0000-0000-0000000a5b71	14	00000000-0000-0000-0000-0000000a5001	export.snapshot	tenant	00000000-0000-0000-0000-0000000a5b71	\N	{"rows": 1005, "entities": 14}	2026-06-11 10:42:23.769+00	df601a8d1d3c0f6fc9d3045355da4e5c1ae9cfe53e6d0d322a854d26f91a23de	55f7397dee25b3627d306eae5b5cb5d7b05ed9f4f11aec7452a0e4a9c3e0f4e6	2026-06-11 10:42:23.750549+00
b92d72bf-1c30-4def-ab78-2bb1fdcdfa08	00000000-0000-0000-0000-0000000a5b71	15	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	742cc390-58a7-4d8c-a8fc-1e5be370fb22	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-11 10:42:30.979+00	55f7397dee25b3627d306eae5b5cb5d7b05ed9f4f11aec7452a0e4a9c3e0f4e6	4a33ae9fb185c12dcd4f5ae8d3df4cc6c476d79e15f8c4cb5586ec36e21c038c	2026-06-11 10:42:30.978976+00
87062015-024e-4079-ab56-bb6de51284aa	00000000-0000-0000-0000-0000000a5b71	16	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	f7d47bb4-b697-4e2b-bfaf-efe24f442248	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-11 10:42:30.996+00	4a33ae9fb185c12dcd4f5ae8d3df4cc6c476d79e15f8c4cb5586ec36e21c038c	4dee59b18716c9aa25476e0030a1237921be5e0d683f2e17cecb79647f3044b6	2026-06-11 10:42:30.996816+00
3b3349fd-3658-426b-9516-9fab5ce2a1b0	00000000-0000-0000-0000-0000000a5b71	17	00000000-0000-0000-0000-0000000a5001	manager.insights_generated	insight_snapshot	f397124e-f64b-4c6a-a5e8-c18574d49756	\N	{"total": 0, "bySeverity": {}, "windowDays": 30, "periodLabel": "Last 30 days"}	2026-06-11 10:42:32.197+00	4dee59b18716c9aa25476e0030a1237921be5e0d683f2e17cecb79647f3044b6	c5cf8046156a4c882fa7c3cdc1a5c6c9c26de2a3dd0cc390088f235a2aee88f3	2026-06-11 10:42:32.195576+00
c6c8a51d-91f0-4c44-836e-c88a51b6b756	00000000-0000-0000-0000-0000000a5b71	18	00000000-0000-0000-0000-0000000a5001	member.permissions_updated	membership	00000000-0000-0000-0000-0000000a5002	{"overrides": []}	{"overrides": [{"allow": true, "permission": "estimate:manage"}]}	2026-06-12 14:00:58.154+00	c5cf8046156a4c882fa7c3cdc1a5c6c9c26de2a3dd0cc390088f235a2aee88f3	58b6b68dbea5844f60d086b8e5deadee3cd47cddf25af33d35a79730d33f0b56	2026-06-12 14:00:58.15129+00
18062b2d-80b4-44eb-8255-2c96d0b95ea8	00000000-0000-0000-0000-0000000a5b71	19	00000000-0000-0000-0000-0000000a5001	member.permissions_updated	membership	00000000-0000-0000-0000-0000000a5002	{"overrides": [{"allow": true, "permission": "estimate:manage"}]}	{"overrides": []}	2026-06-12 14:03:58.101+00	58b6b68dbea5844f60d086b8e5deadee3cd47cddf25af33d35a79730d33f0b56	ab1aa9ce498d50ac2fa2853a140aeea5850743e25caf9ec92af2512b2b1f5b7e	2026-06-12 14:03:58.099989+00
4fe7ef67-7426-4e09-8534-ee092663ff15	00000000-0000-0000-0000-0000000a5b71	20	00000000-0000-0000-0000-0000000a5001	apikey.created	api_key	fda4d968-25cf-416c-b3f4-9e7022a1304a	\N	{"name": "QA test (Playwright)", "roles": ["read_only"], "prefix": "wos_419b95e1"}	2026-06-12 14:07:57.096+00	ab1aa9ce498d50ac2fa2853a140aeea5850743e25caf9ec92af2512b2b1f5b7e	0799bad667457079c2874404662c7049ec1f0db9cdd6247e008abe636987e90f	2026-06-12 14:07:57.095671+00
1b49c0d3-63a6-44c6-a450-762bdc386355	00000000-0000-0000-0000-0000000a5b71	21	00000000-0000-0000-0000-0000000a5001	apikey.revoked	api_key	fda4d968-25cf-416c-b3f4-9e7022a1304a	\N	{"name": "QA test (Playwright)", "prefix": "wos_419b95e1"}	2026-06-13 16:34:32.246+00	0799bad667457079c2874404662c7049ec1f0db9cdd6247e008abe636987e90f	2c4a926999353d2f8c15998b7e80881f552b185cac1e221aee135daaf8c17a29	2026-06-13 16:34:32.244695+00
a1c4683c-8f43-4034-81cf-1dd5fb84376d	00000000-0000-0000-0000-0000000a5b71	22	00000000-0000-0000-0000-0000000a5001	customer.updated	customer	34ed179b-59d2-4186-80fc-582e657a51f1	{"id": "34ed179b-59d2-4186-80fc-582e657a51f1", "city": "LJUBLJANA", "code": "3460320", "name": "1A AVTO d.o.o.", "type": "company", "notes": null, "phone": null, "taxId": "38219522", "vatId": "SI38219522", "status": "active", "address": "┼¢IGONOVA ULICA 004", "country": "SI", "currency": "EUR", "peppolId": null, "postCode": "1000", "tenantId": "00000000-0000-0000-0000-0000000a5b71", "vatLiable": true, "discountPct": "0.00", "priceListId": null, "registrationNo": "2124831000", "vatIdValidated": false, "einvoiceCapable": false, "minimaxPartnerId": "3460320", "paymentTermsDays": 30, "vatIdValidatedAt": null, "vatIdValidationSource": null}	{"id": "34ed179b-59d2-4186-80fc-582e657a51f1", "city": "LJUBLJANA", "code": "3460320", "name": "1A AVTO d.o.o.", "type": "company", "notes": null, "phone": "041 555 123", "taxId": "38219522", "vatId": "SI38219522", "status": "active", "address": "┼¢IGONOVA ULICA 004", "country": "SI", "currency": "EUR", "peppolId": null, "postCode": "1000", "tenantId": "00000000-0000-0000-0000-0000000a5b71", "vatLiable": true, "discountPct": "0.00", "priceListId": null, "registrationNo": "2124831000", "vatIdValidated": false, "einvoiceCapable": false, "minimaxPartnerId": "3460320", "paymentTermsDays": 30, "vatIdValidatedAt": null, "vatIdValidationSource": null}	2026-06-13 16:36:25.281+00	2c4a926999353d2f8c15998b7e80881f552b185cac1e221aee135daaf8c17a29	fc573b0c6e2d8a0a3ca047d24dea72870ae8542440502ee95df8a1614aae38a7	2026-06-13 16:36:25.269346+00
\.


--
-- Data for Name: bank_import_entries; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.bank_import_entries (id, tenant_id, import_id, fingerprint, amount_minor, currency, booking_date, payer_name, payer_iban, reference, details, status, matched_invoice_id, payment_id, created_at) FROM stdin;
\.


--
-- Data for Name: bank_imports; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.bank_imports (id, tenant_id, filename, account_iban, stmt_from, stmt_to, entries_total, entries_credit, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: change_feed; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.change_feed (cursor, tenant_id, entity_type, entity_id, op, version, payload, created_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.customers (id, tenant_id, code, name, type, country, address, post_code, city, vat_liable, vat_id, tax_id, registration_no, currency, payment_terms_days, discount_pct, price_list_id, einvoice_capable, peppol_id, minimax_partner_id, notes, status, version, created_at, updated_at, created_by, updated_by, vat_id_validated, vat_id_validated_at, vat_id_validation_source, vat_id_validated_by, vat_id_validation_note, phone) FROM stdin;
19ed0102-ea54-4907-a27b-03d74b9b6d51	00000000-0000-0000-0000-0000000a5b71	1465661	"LALI─å" D.O.O. , MLADENOVAC	company	RS	UL. VUKA KARAD┼¢I─åA 111	11400	MLADENOVAC	t	RS101543610	101543610	\N	EUR	30	0.00	\N	f	\N	1465661	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
41291c12-4c28-490c-a1ed-c51cc3697e73	00000000-0000-0000-0000-0000000a5b71	654733	"Livaja Transporti" vl. Marinko Livaja	company	HR	Povrtlarska 14	10251	Hrvatski Leskovac	t	HR45180378059	45180378059	\N	EUR	0	0.00	\N	f	\N	654733	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
53fbf710-09c4-491f-8a79-8f586926aad2	00000000-0000-0000-0000-0000000a5b71	4013029	"Maja" Rzadkowalski, Reczkowsk	company	PL	Nowa 26	88-100	Inowroclaw	t	PL5562439399	\N	\N	EUR	0	0.00	\N	f	\N	11252401	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f3a95173-b618-4620-8129-8197ba0f85a0	00000000-0000-0000-0000-0000000a5b71	3654819	"REMS" TAPETNI┼áTVO, TRGOVINA, TALNE OBLOGE ANDREJ REMS S.P.	company	SI	KOLODVORSKA CESTA 057	8340	─îRNOMELJ	t	SI90932102	90932102	1059327000	EUR	30	0.00	\N	f	\N	3654819	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0727b47b-bdd3-4d76-9852-6b1a161d2206	00000000-0000-0000-0000-0000000a5b71	1207789	"RIMEKS" ROBERT IMPERL S.P.	company	SI	NA DORCU 015	8280	BRESTANICA	t	SI18923763	18923763	1749455000	EUR	0	0.00	\N	f	\N	1207789	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
66a38a48-9505-4e34-b685-4e37c64da7b2	00000000-0000-0000-0000-0000000a5b71	2971890	"Si-Ker" Szabo Ignacne E.V.	company	HU	Ribiszke str.17	8600	Siofok	t	HU73691196	73691196	\N	EUR	30	0.00	\N	f	\N	2971890	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
779c7ed2-d80d-4675-aef4-45ab1ed8053b	00000000-0000-0000-0000-0000000a5b71	1150102	"SONJA" PREVOZNI┼áTVO, d.o.o.	company	SI	ZGORNJA HAJDINA 067	2288	HAJDINA	t	SI75602385	75602385	3661458000	EUR	0	0.00	\N	f	\N	1150102	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f04c3d5a-92ff-48ee-a8a2-86622bc929ff	00000000-0000-0000-0000-0000000a5b71	3274640	"STANDARD" sp.z.o.o.	company	PL	Ul.Olszewskiego 10	20-481	LUBLIN	t	PL7120152851	7120152851	\N	EUR	45	0.00	\N	f	\N	3274640	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
764c9a89-6291-4ce3-9af8-215b27b92193	00000000-0000-0000-0000-0000000a5b71	4011457	"Transport Javori─ç", vl. Ankic	company	HR	DRU┼áKOVEC HUMSKI 73A	49231	HUM NA SUTLI	t	HR52413482945	\N	\N	EUR	0	0.00	\N	f	\N	9748423	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8c01342f-851f-485d-b1f0-7ac1e2bd5565	00000000-0000-0000-0000-0000000a5b71	4015936	(Inter) Nationaal Transport en	company	NL	De Mors 21	7631	AH Ootmarsum	t	NL806902243B01	\N	\N	EUR	0	0.00	\N	f	\N	16084414	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a25202a8-6821-45e8-b919-518cee16645c	00000000-0000-0000-0000-0000000a5b71	4012618	@ded Logistics BV	company	NL	Van Coehoornstraat 9-11	5916	PH VENLO	t	NL852503222B01	\N	\N	EUR	0	0.00	\N	f	\N	10878507	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2509e09e-28e0-4839-b5c1-b5debba90a2b	00000000-0000-0000-0000-0000000a5b71	2002830	╦ØBARNY╦Ø MLADEN BARNJAK	company	HR	BENKOVA─îKO SELO 85	23420	BENKOVAC	t	HR28345483638	28345483638	\N	EUR	30	0.00	\N	f	\N	2002830	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f25673ab-3c46-45d2-a323-557ec0181db0	00000000-0000-0000-0000-0000000a5b71	966934	1 A FRONTE D.O.O.	company	SI	KOLODVORSKA ULICA 33C	3313	POLZELA	t	SI43321178	43321178	5822106	EUR	0	0.00	\N	f	\N	966934	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
91a25cd0-5b59-4853-a182-3a37fa69c34f	00000000-0000-0000-0000-0000000a5b71	3049828	10-TRANSALLIANCE GBE	company	FR	Rte du Canal Tancarville	76430	SANDOUVILLE	t	FR57414817023	57414817023	\N	EUR	60	0.00	\N	f	\N	3049828	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a7adfc72-31fe-4a49-a6c5-42a7730edfa0	00000000-0000-0000-0000-0000000a5b71	4011788	12Logistics GmbH	company	DE	Hofer Stra├ƒe 26	93057	Regensburg	t	DE292824056	\N	\N	EUR	0	0.00	\N	f	\N	10030124	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8b14a889-7ef9-46a5-9e6f-54f6a99c23ef	00000000-0000-0000-0000-0000000a5b71	3724709	24VIP Logistic Services d.o.o.	company	BA	Rajlovacka cesta b.b.	71000	Sarajevo	t	BA201319770003	201319770003	\N	EUR	45	0.00	\N	f	\N	3724709	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c6a85a2f-2e34-4791-8357-c4c9f68f9794	00000000-0000-0000-0000-0000000a5b71	\N	2ban transport d.o.o.	company	SI	Savska cesta 034A	4000	Kranj	t	SI81201788	81201788	3783251000	EUR	60	0.00	\N	f	\N	6431034	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8b2a9192-dc82-461c-a303-9273d620d5f5	00000000-0000-0000-0000-0000000a5b71	4007091	2HM Logistics, d.o.o.	company	SI	Ankaranska 7A	6000	KOPER	t	SI61762091	\N	\N	EUR	0	0.00	\N	f	\N	6821141	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ff12d780-b49f-4159-afdb-47efed1d452e	00000000-0000-0000-0000-0000000a5b71	\N	3 express transport S.R.O. (SK-703)	company	SK	Tallerova 4	81102	BRATISLAVA	t	SK2820008147	2820008147	\N	EUR	60	0.00	\N	f	\N	6854983	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f61f31b7-60cb-4ba7-b71b-292e2a96af0c	00000000-0000-0000-0000-0000000a5b71	1327481	360┬░ Forwarding Agency GMBH	company	DE	Mittelstrasse 12-14b	50672	Koln	t	DE227065912	227065912	\N	EUR	0	0.00	\N	f	\N	1327481	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
19b8c5ac-82fb-486b-89f7-ed9b20293642	00000000-0000-0000-0000-0000000a5b71	2891340	3B+D d.o.o.	company	SI	Mijav─ìeva ulica 016	1291	┼ákofljica	t	SI71393897	71393897	5997321000	EUR	30	0.00	\N	f	\N	2891340	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
17824007-c9a9-47a7-ad26-41530e6ce16b	00000000-0000-0000-0000-0000000a5b71	2328219	3CCREATIVE LTD. (BG-100)	company	BG	11 PLOVDIVSKO POLE, STR.	1756	SOFIA	t	BG175330340	175330340	\N	EUR	60	0.00	\N	f	\N	2328219	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d3c2b217-364e-47f9-ba17-76a320afe6f3	00000000-0000-0000-0000-0000000a5b71	985549	3DA D.O.O.	company	SI	PODZEMELJ 20A	8332	GRADEC V BELI KRAJIN	t	SI87270480	87270480	3532607000	EUR	0	0.00	\N	f	\N	985549	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3a5e1323-b58e-475f-8df3-d810ae800dbf	00000000-0000-0000-0000-0000000a5b71	\N	3M TRANS d.o.o.	company	SI	Maistrova ulica 005	1270	Litija	t	SI98137042	98137042	3698483000	EUR	60	0.00	\N	f	\N	4397105	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1733fb14-dc41-494b-abbf-806a605c063c	00000000-0000-0000-0000-0000000a5b71	4017188	4CARGO Sp. z o.o.	company	PL	W┼éadys┼éawa Nehringa 3	60-247	Pozna┼ä	t	PL5273011241	\N	\N	EUR	0	0.00	\N	f	\N	18831173	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7f9670b4-d91c-4ebc-9a2a-c590392440c7	00000000-0000-0000-0000-0000000a5b71	2727646	4M4U SKUPINA d.o.o.	company	SI	Smetanova ulica 27	2000	Maribor	t	SI42493471	42493471	6158528000	EUR	30	0.00	\N	f	\N	2727646	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
768c3f23-fe9e-49db-b20c-ad3522f53f47	00000000-0000-0000-0000-0000000a5b71	4013829	4M4U Transport d.o.o.	company	SI	Smetanova ulica 27	2000	MARIBOR	t	SI96716509	\N	\N	EUR	0	0.00	\N	f	\N	12235898	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f6831833-61ea-43c4-9c69-8bfa37100adf	00000000-0000-0000-0000-0000000a5b71	4001966	4Mex Logistics B.V. (NL-528)	company	NL	Schaardijk 19K	2921 LG	Krimpen aan den IJssel	t	NL854353811B01	\N	\N	EUR	0	0.00	\N	f	\N	4819476	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
38db988f-0bb0-4f55-bed6-5bc0545ba239	00000000-0000-0000-0000-0000000a5b71	\N	5ER, Peter ┼áega s.p.	company	SI	┼áentvid pri Sti─ìni 059A	1296	┼áentvid pri Sti─ìni	t	SI92933467	92933467	7044518000	EUR	30	0.00	\N	f	\N	11454217	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
488fab5b-8804-4018-876d-9ba34a044006	00000000-0000-0000-0000-0000000a5b71	\N	5roles d.o.o.	company	SI	Tan─ìa Gora 041A	8343	Dragatu┼í	t	SI42491711	42491711	8807264000	EUR	30	0.00	\N	f	\N	15002975	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6ff448b7-6c0a-4f90-a1de-cf7c30f8cc24	00000000-0000-0000-0000-0000000a5b71	\N	6 TRADE, David Gerzina s.p.	company	SI	Brege 011	8273	Leskovec pri Kr┼íkem	t	SI84332344	84332344	9490361000	EUR	30	0.00	\N	f	\N	16492432	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a16a0647-625f-40b6-a9e8-7dcc7fba1a46	00000000-0000-0000-0000-0000000a5b71	\N	69Performance d.o.o.	company	SI	Tr┼¥a┼íka cesta 133	1000	Ljubljana	t	SI68313454	68313454	8916055000	EUR	30	0.00	\N	f	\N	19057330	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
52ed9ff4-1fa2-43d4-9f52-ef35a6179786	00000000-0000-0000-0000-0000000a5b71	\N	7-TRADE d.o.o.	company	SI	Sloven─ìeva ulica 097	1000	Ljubljana	t	SI29225167	29225167	5699690000	EUR	30	0.00	\N	f	\N	9061842	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fed898ee-d758-4b41-b955-c1917deb7b16	00000000-0000-0000-0000-0000000a5b71	4014165	89 DHL Freight GmbH Wei├ƒenhorn	company	DE	Daimlerstra├ƒe 43	89264	Wei├ƒenhorn	t	DE811152493	\N	\N	EUR	0	0.00	\N	f	\N	12802120	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8267f35e-9e73-4a79-bd15-9bf17326d551	00000000-0000-0000-0000-0000000a5b71	2295573	A / ┼¢ Storitve	company	SI	Skrita Ulica 13	2000	Maribor	t	SI94989346	94989346	\N	EUR	60	0.00	\N	f	\N	2295573	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cbfd7ac0-dc4f-4ea5-ae74-80f2a05ab56b	00000000-0000-0000-0000-0000000a5b71	\N	A DVORNIK d.o.o.	company	SI	Pod Gradom 040	2380	Slovenj Gradec	t	SI99615959	99615959	8879613000	EUR	30	0.00	\N	f	\N	16889999	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7e39802e-c19f-4f73-83bd-fe8cf82c49a5	00000000-0000-0000-0000-0000000a5b71	2509497	A TURBO d.o.o.	company	SI	JEZERO 065	1352	PRESERJE	t	SI68456000	68456000	3857654000	EUR	30	0.00	\N	f	\N	2509497	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
178be615-8151-4ef9-95c8-503ec6657753	00000000-0000-0000-0000-0000000a5b71	1943848	A&M SPED D.O.O. (BA-070)	company	BA	UL.BRA─åE KOTORI─å BB	74264	JELAH	t	BA218673810004	218673810004	\N	EUR	30	0.00	\N	f	\N	1943848	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b115413a-7a6d-40cb-b8c4-0fb8f4a8a3e6	00000000-0000-0000-0000-0000000a5b71	4013391	A. Ebner Internationale Transp	company	AT	Breitwies 9	5303	Thalgau	t	ATU50191304	\N	\N	EUR	0	0.00	\N	f	\N	11696722	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3884d66c-394b-423e-ac10-1639ebfbaaf2	00000000-0000-0000-0000-0000000a5b71	4015239	a. hartrodt hungary Kft.	company	HU	K┼æb├ínyai ├║t 49/b	1101	Budapest	t	HU12505894	\N	\N	EUR	0	0.00	\N	f	\N	14873262	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fa8237a3-6964-4128-aaaf-5294246bc57a	00000000-0000-0000-0000-0000000a5b71	4004609	A. Thilo Internationale Spedit	company	DE	Am Bahndamm 18	85296	Rohrbach	t	DE812897784	\N	\N	EUR	0	0.00	\N	f	\N	6821137	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8ae465ab-9f87-4aae-97b9-832f921b6b05	00000000-0000-0000-0000-0000000a5b71	2194403	A.B. TRANSPORT d.o.o. LJUBU┼áKI	company	BA	Hardomilje bb	88320	LJUBU┼áKI	t	BA272168380008	272168380008	\N	EUR	30	0.00	\N	f	\N	2194403	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
712f42c1-4080-4ee5-a01d-eed9c85aa87c	00000000-0000-0000-0000-0000000a5b71	1559614	A.B.T. d.o.o.	company	SI	CESTA K TAMU 077	2000	MARIBOR	t	SI36946524	36946524	2296179	EUR	30	0.00	\N	f	\N	1559614	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7d84a68d-a5b9-464c-8997-93f9b473e144	00000000-0000-0000-0000-0000000a5b71	\N	A.C.S., d.o.o., Ljubljana	company	SI	Celov┼íka cesta 108	1000	Ljubljana	t	SI87168294	87168294	5576016000	EUR	30	0.00	\N	f	\N	12834856	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3d02e2d0-e6ae-48bd-9209-a9d05e78d47f	00000000-0000-0000-0000-0000000a5b71	4015279	A.G. 90 Log├¡stica S.L.U.	company	ES	Pol.Ind. Constanti - C/ Paisos Baixos, Illa 2 Nau	43120	Constant├¡ ( Tarragona)	t	ESB13974522	\N	\N	EUR	0	0.00	\N	f	\N	14987415	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ff30abd2-27f1-4206-b00b-2ea11a613d4c	00000000-0000-0000-0000-0000000a5b71	\N	A.H.R. TRADE, d.o.o.	company	SI	Zalo┼íka cesta 167	1000	Ljubljana	t	SI76753590	76753590	5903629000	EUR	60	0.00	\N	f	\N	7028895	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
14b2faf4-9495-4fd5-a073-24eba00394f5	00000000-0000-0000-0000-0000000a5b71	4001071	A.L.P.H.A. Logistic&Brokerage	company	DE	Aschaffenburger Str. 197	63857	Waldaschaff	t	DE287485313	\N	\N	EUR	0	0.00	\N	f	\N	4445147	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6b62d35a-0410-40c4-aa47-574c28027b9a	00000000-0000-0000-0000-0000000a5b71	\N	A.M.TRANS Artur Dudek.Marian Misiewicz(pl)	company	PL	Centrum Handlove GRANICA 405/A/60	37732	MEDYKA	t	PL7952299665	7952299665	\N	EUR	60	0.00	\N	f	\N	6568087	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9ddd466a-7731-4618-9575-67efefbc0e9a	00000000-0000-0000-0000-0000000a5b71	4010961	A.N. Pek d.o.o. (HR-191)	company	HR	Radni─ìka cesta 9D	10437	Rakitje	t	HR-85001067860	\N	\N	EUR	0	0.00	\N	f	\N	9245773	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
69803995-44ed-454a-8ecc-27bc44f5449c	00000000-0000-0000-0000-0000000a5b71	2420560	A.S.S. Logistik Gmbh&CO KG	company	AT	Logistikpark11	4063	Horsching	t	ATU47575903	U47575903	\N	EUR	30	0.00	\N	f	\N	2420560	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f3f3d201-8090-4b89-a5da-cc00bcc3d101	00000000-0000-0000-0000-0000000a5b71	4001007	A/┼¢ STORITVE - PREVOZI, POSRE	company	SI	Skrita Ulica 13	2000	MARIBOR	t	SI94989346	\N	\N	EUR	0	0.00	\N	f	\N	4376200	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bfd6acb9-9a58-478c-af67-bdf2df682a31	00000000-0000-0000-0000-0000000a5b71	430431	A1 Slovenija d.d.	company	SI	┼áMARTINSKA CESTA 134 B	1000	LJUBLJANA	t	SI60595256	60595256	1196332000	EUR	0	0.00	\N	f	\N	430431	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0154e1cb-b276-44c3-9ef9-256af6239d32	00000000-0000-0000-0000-0000000a5b71	2336017	A2 LOGISTICS ENGINEERING (NL-528)	company	NL	MIDDELKAMPSEWEG 1	5311	PC	t	NL818620249B01	818620249B01	\N	EUR	45	0.00	\N	f	\N	2336017	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1323a495-888b-40a9-b41c-a5b4b56cbab2	00000000-0000-0000-0000-0000000a5b71	4003466	A2B Expess  Logistika d.o.o. (HR-191)	company	HR	Buzinski prilaz 36a	10010	ZAGREB	t	HR54655542852	\N	\N	EUR	0	0.00	\N	f	\N	5509263	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4d5e04c1-aef0-46dc-bfc9-39298d20344b	00000000-0000-0000-0000-0000000a5b71	496426	A4 LOGISTIKA D.O.O.	company	SI	GRI─îI 005 I	5290	┼áEMPETER PRI GORICI	t	SI34747761	34747761	3463257000	EUR	0	0.00	\N	f	\N	496426	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
09a8e2f2-5223-41a1-a6ac-c2b98c8687d1	00000000-0000-0000-0000-0000000a5b71	\N	AAM OKI─å d.o.o.	company	SI	Dunajska cesta 010	1000	Ljubljana	t	SI68241496	68241496	8247200000	EUR	30	0.00	\N	f	\N	16472345	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ffb09fb9-3f5d-4761-b559-e8890cc8a19e	00000000-0000-0000-0000-0000000a5b71	993875	AB OKNA ANDREJ BRODARI─î s.p.	company	SI	Majer 16	8340	─îRNOMELJ	t	SI92009433	92009433	3292401000	EUR	0	0.00	\N	f	\N	993875	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
33341281-ab8b-417d-a73b-a0227ccd47de	00000000-0000-0000-0000-0000000a5b71	\N	AB Trans d.o.o.	company	SI	Proletarska cesta 004	1000	Ljubljana	t	SI27032531	27032531	7116578000	EUR	60	0.00	\N	f	\N	5828159	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5d849b0f-0c23-4612-bd69-4ae9824d3f77	00000000-0000-0000-0000-0000000a5b71	\N	AB VAL LES d.o.o.	company	SI	Dutovlje 185	6221	Dutovlje	t	SI35886773	35886773	6520600000	EUR	30	0.00	\N	f	\N	8901431	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
302fd96b-e74f-4f51-879b-86d700a0a24f	00000000-0000-0000-0000-0000000a5b71	\N	ABACO s.p.a. (it)	company	IT	Via flli.cervi 6l	35129	PADOVA	f	\N	\N	\N	EUR	60	0.00	\N	f	\N	6105850	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2f6b13be-7c00-41e9-a990-0fb722f71a35	00000000-0000-0000-0000-0000000a5b71	4010673	ABAKUS LOGISTICS SP. Z O.O.	company	PL	Aleje Jerozolimskie 96	00-807	WARSZAWA	t	PL7010453787	\N	\N	EUR	0	0.00	\N	f	\N	16084407	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0de54e07-10e2-4cff-913e-68956876d34a	00000000-0000-0000-0000-0000000a5b71	\N	ABAKUS LOGISTICS Sp.z.o.o.	company	PL	ul.ALEJE JEROZOLIMSKIE 92	00-807	WARSZAWA	t	PL7010453787	7010453787	\N	PLN	30	0.00	\N	f	\N	9821371	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7ac29820-8528-4e20-83ca-9b1323cc70d0	00000000-0000-0000-0000-0000000a5b71	2989762	ABANKA d.d.	company	SI	Slovenska cesta 058	1000	Ljubljana	t	SI68297530	68297530	5026024	EUR	0	0.00	\N	f	\N	2989762	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4b46f3a6-8bbe-47eb-a793-23a5594f8e70	00000000-0000-0000-0000-0000000a5b71	4000421	Abc European Air & Sea Cargo	company	SI	Leskov┼íkova cesta 9E	1000	LJUBLJANA	t	SI89837487	\N	\N	EUR	0	0.00	\N	f	\N	5628947	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
90582bf5-49a4-440d-8f61-a614fa04ecb7	00000000-0000-0000-0000-0000000a5b71	\N	ABC SPED s. r. o.,Bratislava ????	company	SK	x	1000	Bratislava	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	15948500	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
344cd5eb-4ddf-4f16-8723-03f6f704c6c0	00000000-0000-0000-0000-0000000a5b71	4015856	ABC SPED S.R.O.	company	SK	─¢udov├¡ta Fullu 3084/25	841 05	Bratislava	t	SK2122128228	\N	\N	EUR	0	0.00	\N	f	\N	15977793	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
310d387b-2f76-4e53-8e2c-01bbba2e6a91	00000000-0000-0000-0000-0000000a5b71	532887	ABC TRANSPORT D.O.O.	company	SI	PREGLOV TRG 1	1000	LJUBLJANA	t	SI89345746	89345746	1867652	EUR	0	0.00	\N	f	\N	532887	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cf44112c-bec1-448c-b0e7-40f47a6b1535	00000000-0000-0000-0000-0000000a5b71	2286630	ABC-CZEPCZYNSKI SP. Z.O.O. SP.K. (PL-616)	company	PL	UL.WIGURY 20	64400	MIEDZYCHOD	t	PL5951442504	5951442504	\N	EUR	60	0.00	\N	f	\N	2286630	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b27036d3-2ec4-415c-94df-15506a71849f	00000000-0000-0000-0000-0000000a5b71	\N	ABC-JUKAN d.o.o.(ba)	company	BA	Pribava bb	75320	GRA─îANICA	t	BA209168930004	209168930004	\N	EUR	30	0.00	\N	f	\N	6085083	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0fe1e26d-6f55-4615-8c26-a78b3a64831b	00000000-0000-0000-0000-0000000a5b71	\N	ABES d.o.o.	company	SI	GORI─îICA PRI IHANU 015	1230	DOM┼¢ALE	t	SI47659661	47659661	2227169000	EUR	30	0.00	\N	f	\N	9097383	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f6a2fadc-d749-44f4-b4f6-c74683dee06f	00000000-0000-0000-0000-0000000a5b71	4003660	ABC Logistika d.o.o.	company	SI	Ankaranska  7B	6000	KOPER	t	SI48959456	\N	\N	EUR	0	0.00	\N	f	\N	5586455	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
947a4287-1c0b-42b3-95f8-9c3e54d31127	00000000-0000-0000-0000-0000000a5b71	3259893	ABONEX,s.r.o.	company	SK	Marku┼íovska cesta 1	05201	Spi┼íska Nova Ves	t	SK2020034918	2020034918	\N	EUR	60	0.00	\N	f	\N	3259893	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4f8b3b06-92da-48a7-b497-5303b1ea66ab	00000000-0000-0000-0000-0000000a5b71	4014762	ABX Solution Wojciech Trela	company	PL	Toru┼äska 30	87-800	WLOCLAWEK	t	PL8882707839	\N	\N	EUR	0	0.00	\N	f	\N	13834031	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5d15abe1-fc78-45dc-b70a-3d540715a8e4	00000000-0000-0000-0000-0000000a5b71	4017582	AC BUTESCU LOGISTIC SERV SRL	company	RO	Sat Camarasu nr 363, Jud Cluj	407141	CLUJ	t	RO44677230	\N	\N	EUR	0	0.00	\N	f	\N	19911916	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f0797260-bc41-4b83-8204-c6a5251253bf	00000000-0000-0000-0000-0000000a5b71	4016007	AC Logistik GmbH	company	DE	Neue Hafenstrasse 2	38239	Salzgitter	t	DE321253957	\N	\N	EUR	0	0.00	\N	f	\N	16318753	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3ef5bda2-e2ab-4663-9172-d459ed8a4c96	00000000-0000-0000-0000-0000000a5b71	\N	ACC Logistics Feret Krzysztof (pl-616)	company	PL	Lewakowskiego 1a/55	35119	RZESZOW	t	PL8133333644	8133333644	\N	EUR	60	0.00	\N	f	\N	6911254	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d14fb857-5b71-4150-9064-896269ce2c75	00000000-0000-0000-0000-0000000a5b71	\N	ACE AVTO d.o.o.	company	SI	Gorenjska cesta 019	1234	Menge┼í	t	SI74210505	74210505	3728323000	EUR	30	0.00	\N	f	\N	9654919	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c75a511a-55bb-449b-a641-24759716b82a	00000000-0000-0000-0000-0000000a5b71	4009872	ACE Logistics Latvia SIA	company	LV	Kalnini A	2167	Marupes novads	t	LV40003370021	\N	\N	EUR	0	0.00	\N	f	\N	8231818	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c25bad83-9f1c-4676-94ca-247b32266c19	00000000-0000-0000-0000-0000000a5b71	4007316	Achterberg en Van Doornspeek	company	NL	Doejenburg 22	4024	HE Eck en Wiel	t	NL815452378B01	\N	\N	EUR	0	0.00	\N	f	\N	6927211	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4a9bd3eb-6511-42d5-8067-34e3438f3f7d	00000000-0000-0000-0000-0000000a5b71	4011414	ACL Schwerlast	company	AT	Maxlhaid 47	4600	WELS	t	ATU75777134	\N	\N	EUR	0	0.00	\N	f	\N	9680983	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
29794f9f-25c7-422b-9a1f-90d25597e139	00000000-0000-0000-0000-0000000a5b71	2445703	ACORD-92, d.o.o., Ljubljana	company	SI	Stegne 013	1000	Ljubljana	t	SI95346872	95346872	5460450000	EUR	30	0.00	\N	f	\N	2445703	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a2c33f20-8163-4ad2-9485-440c31faabd1	00000000-0000-0000-0000-0000000a5b71	\N	A-COSMOS, d.d.	company	SI	Celov┼íka cesta 182	1000	Ljubljana	t	SI16457161	16457161	5400210000	EUR	30	0.00	\N	f	\N	5092181	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
61da68c3-7672-4ab1-8d91-26c085790e13	00000000-0000-0000-0000-0000000a5b71	\N	ACTA VIVA d.o.o.	company	SI	Ulica Sade┼¥ 035	8340	─îrnomelj	f	\N	69045917	6928030000	EUR	30	0.00	\N	f	\N	13618271	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
94a5d11c-b47c-4c10-8b5e-5f0403a6e758	00000000-0000-0000-0000-0000000a5b71	3740657	ACTING SP ZOO (pl)	company	PL	UL.KRAKOWSKA 73	40391	KATOWICW	t	PL6340128593	6340128593	\N	EUR	30	0.00	\N	f	\N	3740657	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f8031cbc-386f-4a11-810d-8e84dcf3cc49	00000000-0000-0000-0000-0000000a5b71	4004546	Active Logistics Srl	company	IT	Via F.lli Bandiera  48	61026.	LUNANO	t	IT02530250410	\N	\N	EUR	0	0.00	\N	f	\N	5942962	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
293cabdb-55cb-4e5f-965d-f833e5672a1d	00000000-0000-0000-0000-0000000a5b71	\N	ACTIVE TRANSPORT d.o.o. ( RS-688)	company	RS	Franje Kr─ìa 3a	11185	ZEMUN	t	RS109531343	109531343	\N	EUR	30	0.00	\N	f	\N	9119014	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
95a41f60-85d0-4fff-bdae-281922bf46db	00000000-0000-0000-0000-0000000a5b71	3674558	ACTROS d.o.o. Prnjavor	company	BA	Gornji ┼átrpci bb	78439	PRNJAVOR	t	BA401234580000	401234580000	\N	EUR	60	0.00	\N	f	\N	3674558	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
49c363ab-b704-4e3c-882a-a79bcd2cddc2	00000000-0000-0000-0000-0000000a5b71	4008409	AD INTEREUROPA (RS-688)	company	RS	Zemunaska 174	11272	Beograd-Dobanovci	t	RS100213102	\N	\N	EUR	0	0.00	\N	f	\N	7906886	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
10578d19-05d1-47c3-81b9-54dcf134eddc	00000000-0000-0000-0000-0000000a5b71	\N	Ad Matricem d.o.o,. (HR)	company	HR	Tomislavova 260	22300	Knin	t	HR62788158810	62788158810	\N	EUR	30	0.00	\N	f	\N	17654305	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e567bec7-3323-40b8-9d59-3f6eb43a2bd3	00000000-0000-0000-0000-0000000a5b71	\N	AD VITA d.o.o.	company	SI	Tovarni┼íka cesta 007B	3210	Slovenske Konjice	t	SI50048899	50048899	2129787000	EUR	30	0.00	\N	f	\N	16029357	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
65381871-b2aa-40f4-85e1-060973c8aa4d	00000000-0000-0000-0000-0000000a5b71	4015778	ADAL LOGISTIC Sp.	company	PL	Lipowa 72	42-350	Kozieg┼é├│wki	t	PL8971811403	\N	\N	EUR	0	0.00	\N	f	\N	15862843	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bfad6ecc-7b37-4969-84f8-2c7d278ec012	00000000-0000-0000-0000-0000000a5b71	4000678	Adam Offergeld Spedition Lager	company	DE	Gr├╝ner Weg 1-3	52146	W├╝rselen	t	DE121741107	121741107	\N	EUR	0	0.00	\N	f	\N	4224985	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8271d48e-23e5-4625-8a5a-8ec0f80f8dcf	00000000-0000-0000-0000-0000000a5b71	\N	Adamov ─Éurica s.p.	company	SI	Ravnica 001	8000	Novo mesto	t	SI73870757	73870757	3722864000	EUR	30	0.00	\N	f	\N	8505048	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
31b6459d-f9c7-4441-8e7c-4ccd3e82261a	00000000-0000-0000-0000-0000000a5b71	\N	Adam-Trans Joanna Dekoszczak ( PL-616)	company	PL	ul. Pogodna 9/8	77100	Byton	t	PL8421527803	8421527803	\N	PLN	30	0.00	\N	f	\N	8674016	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0f9d255d-096f-4910-b96e-c47abff7c548	00000000-0000-0000-0000-0000000a5b71	4004306	Adar sp.z.o.o.	company	PL	Ul. Sw. Floriana 7B	82-300	ELBLAG	t	PL5782594127	\N	\N	EUR	0	0.00	\N	f	\N	17689715	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7d037ee4-f27b-4cbf-94de-a802a735302b	00000000-0000-0000-0000-0000000a5b71	\N	ADAR sp.zo.o(pl)	company	PL	Floriana 7b	82300	ELBLAG	t	PL5782594127	5782594127	\N	EUR	60	0.00	\N	f	\N	5860730	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
aad3ad47-bc9c-4d98-aa19-d99b08260d63	00000000-0000-0000-0000-0000000a5b71	3507108	ADC LOG s.r.o.	company	CZ	Krkono┼ísk├í 202/18	46606	Jablonec nad Nisou	t	CZ28259017	28259017	\N	EUR	60	0.00	\N	f	\N	3507108	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3875fe3e-2912-495b-bb57-81e7cf7706d7	00000000-0000-0000-0000-0000000a5b71	4001452	ADI LOGISTIKA, POSREDNI┼áTVO,	company	SI	SUHODOL─îANOVA ULICA 4	2212	┼áENTILJ V SLOV. GORICAH	t	SI32995342	\N	\N	EUR	0	0.00	\N	f	\N	4631517	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ada35ae0-b96b-49eb-8ffa-62d69c34ac46	00000000-0000-0000-0000-0000000a5b71	\N	ADICOM - Ale┼í ─îadej s.p.	company	SI	Cesta Kozjanskega odreda 079	3230	┼áentjur	t	SI84745231	84745231	6047530	EUR	30	0.00	\N	f	\N	7640905	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
743525fe-3b00-43ff-88aa-b772da974245	00000000-0000-0000-0000-0000000a5b71	4011170	Adinutza & Ovi SRL (RO-642)	company	RO	Lipovei nr 27	310320	Arad	t	RO16665175	\N	\N	EUR	0	0.00	\N	f	\N	9537664	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
414f6a68-7088-47db-abc3-10fd51dd9dcd	00000000-0000-0000-0000-0000000a5b71	\N	ADINVEST d.o.o.	company	SI	Tr┼¥a┼íka cesta 134	1000	Ljubljana	t	SI83783504	83783504	6755160000	EUR	30	0.00	\N	f	\N	5653897	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6a57fe5d-0b00-490c-a61f-d9d4dd42b331	00000000-0000-0000-0000-0000000a5b71	\N	ADI-TRANS d.o.o.(hr)	company	HR	─Éure ┼ápanovi─ça 10	10430	Samobor	t	HR11423108151	11423108151	\N	EUR	60	0.00	\N	f	\N	5615420	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d3bd9bff-2626-477f-9ef2-a089bda82570	00000000-0000-0000-0000-0000000a5b71	748619	ADLES D.O.O.	company	SI	OB ┼¢ELEZNICI 018	1000	LJUBLJANA	t	SI49505360	49505360	5745683000	EUR	0	0.00	\N	f	\N	748619	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
641dbd94-ccba-4220-81b2-906246653be1	00000000-0000-0000-0000-0000000a5b71	4010582	Adomida , UAB (LT-440)	company	LT	Vilniaus g. 103	33114	Moletai	t	LT100010491814	\N	\N	EUR	0	0.00	\N	f	\N	8835827	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fa25981c-2e28-4d48-bf11-b75da9d7c2d3	00000000-0000-0000-0000-0000000a5b71	3055629	ADOS d.o.o.	company	SI	Stari trg 326B	2380	Slovenj Gradec	t	SI65926056	65926056	5496144000	EUR	60	0.00	\N	f	\N	3055629	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bea20189-620d-4064-8e4b-4ac62512d0c8	00000000-0000-0000-0000-0000000a5b71	\N	Testni prevozi d.o.o	company	BA	Harkovska1	2311	Kranj	f	\N	\N	\N	EUR	30	5.00	\N	f	\N	\N	\N	active	1	2026-06-09 19:17:48.881863+00	2026-06-09 19:17:48.881863+00	00000000-0000-0000-0000-0000000a5001	00000000-0000-0000-0000-0000000a5001	f	\N	\N	\N	\N	\N
c02a2689-b61a-4293-a7e6-9548739b3991	00000000-0000-0000-0000-0000000a5b71	2773601	ADPOL Jerzy Saniewski (PL-616)	company	PL	Elzbiecin 26a	18421	PIATNICA	t	PL7180006449	7180006449	\N	EUR	60	0.00	\N	f	\N	2773601	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fd38641a-86c4-4d46-be34-f67e4e5d3530	00000000-0000-0000-0000-0000000a5b71	\N	ADRIA AIRWAYS d.o.o.	company	SI	Zgornji Brnik 130H	4210	Brnik - Aerodrom	t	SI51049406	51049406	5156505000	EUR	30	0.00	\N	f	\N	6118933	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
84954df1-e408-4383-818a-4bc4d0753b8d	00000000-0000-0000-0000-0000000a5b71	2528106	ADRIA DOM d.o.o.	company	SI	Kani┼¥arica 041	8340	─îrnomelj	t	SI66141125	66141125	1732528000	EUR	30	0.00	\N	f	\N	2528106	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
20ecc2f4-5a09-429b-9fe9-b20aaa538a18	00000000-0000-0000-0000-0000000a5b71	2945092	ADRIA GRUPA D.O.O.	company	HR	Heinzlova 53 a	10000	ZAGREB	t	HR06637660960	06637660960	\N	EUR	60	0.00	\N	f	\N	2945092	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1960c9b0-7e3a-493a-92c6-7ad46bc565f3	00000000-0000-0000-0000-0000000a5b71	2416904	Adria Servis Transport d.o.o. (HR)	company	HR	Heinzelova 53a	10000	ZAGREB	t	HR94193707385	94193707385	\N	EUR	60	0.00	\N	f	\N	2416904	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
119ecac2-6027-4e19-94ae-b812131b6253	00000000-0000-0000-0000-0000000a5b71	\N	ADRIA TERMINALI d.o.o.	company	SI	Vojkovo nabre┼¥je 038	6000	Koper - Capodistria	t	SI97958000	97958000	2272598000	EUR	30	0.00	\N	f	\N	6791953	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
02812280-68e1-412d-8ee7-0b5d8c844d11	00000000-0000-0000-0000-0000000a5b71	4010151	Adriatic BST d.o.o.	company	SI	Verov┼íkova  55	1000	LJUBLJANA	t	SI71034803	\N	\N	EUR	0	0.00	\N	f	\N	8410625	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bda9eaa7-e52d-4bbe-a0eb-01ec806dad89	00000000-0000-0000-0000-0000000a5b71	\N	ADRIJAN TOM┼áE S.P.	company	SI	Gori┼íka ulica 002	3000	Celje	t	SI13627015	13627015	8183465	EUR	30	0.00	\N	f	\N	9216651	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b9ae4682-593b-41e4-a09d-33bf44860273	00000000-0000-0000-0000-0000000a5b71	\N	A-DUCO d.o.o.	company	SI	Grablovi─ìeva ulica 001	1000	Ljubljana	f	\N	67269362	6114083000	EUR	30	0.00	\N	f	\N	9347437	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1d529cd4-baf9-44a3-81ea-9d93da062670	00000000-0000-0000-0000-0000000a5b71	4001263	Advanced Mineral Processing, S	company	ES	C/. Puerto de Navacerrada 12	28935	M├│stoles ÔÇô Madrid	t	ESB86508124	\N	\N	EUR	0	0.00	\N	f	\N	4557535	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
012a2c48-31c1-44e5-9334-4d8378f54d9f	00000000-0000-0000-0000-0000000a5b71	4010541	ADW Logistic (PL-616)	company	PL	ul. Kopernika 95A	15	Bialystok	t	PL5423240702	\N	\N	EUR	0	0.00	\N	f	\N	8769487	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
81d13f7f-45c2-44cd-869c-7d469992f0a8	00000000-0000-0000-0000-0000000a5b71	2481460	AE KOGOV┼áEK d.o.o.	company	SI	Vodnikova cesta 276	1000	Ljubljana	t	SI44029942	44029942	5873851000	EUR	30	0.00	\N	f	\N	2481460	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c9144d31-7e84-48a1-94e9-7c66da5bb2db	00000000-0000-0000-0000-0000000a5b71	\N	AECOM Limited (GB-826)	company	GB	Sunley House 4 Bedford park	x	Croydon	t	GB009155	009155	\N	EUR	30	0.00	\N	f	\N	4951471	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c03fda86-0fc7-4be1-9dea-4b7815ef95fc	00000000-0000-0000-0000-0000000a5b71	\N	AER TRANSPORT d.o.o. (BIH)	company	BA	Begov han bb	72233	┼¢ep─ìe	t	BA218859080006	218859080006	\N	EUR	30	0.00	\N	f	\N	19652009	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
49e91e24-5e85-452e-a645-a886124244d2	00000000-0000-0000-0000-0000000a5b71	3546566	AFRICATRANS  BELF. ES  NEMZETKOZI  KFT (HU)	company	HU	Rakoczi F. u.37	2337	DELEGYHAZA	t	HU22686448	22686448	\N	EUR	60	0.00	\N	f	\N	3546566	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a2032e13-fb63-44af-8a99-425b99cddd65	00000000-0000-0000-0000-0000000a5b71	1606679	AFS - All Freight Systems Speditions GesmbH & Co KG	company	AT	Egger-Lienz-Strasse 1	6020	Innsbruck	t	ATU30978608	ATU30978608	\N	EUR	30	0.00	\N	f	\N	1606679	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0cf6856a-0ab7-4edc-bb8d-db2daf091aea	00000000-0000-0000-0000-0000000a5b71	\N	AG - MA d.o.o.	company	SI	Rozmanova ulica 015	8000	Novo mesto	t	SI98741861	98741861	2028301000	EUR	30	0.00	\N	f	\N	9018752	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
201393bd-9535-4541-a683-7b571c20f650	00000000-0000-0000-0000-0000000a5b71	2430576	AGADI Marek Rodzinski	company	PL	ul. Ciesielska 47	62-800	KALISZ	t	PL6181501268	6181501268	\N	EUR	30	0.00	\N	f	\N	2430576	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a76329b8-1c8e-4892-88b7-39bc69a38d9b	00000000-0000-0000-0000-0000000a5b71	430855	AGENCIJA M SERVIS D.O.O.	company	SI	SLOVENSKI TRG 8	4000	KRANJ	t	SI30197619	30197619	2160544000	EUR	0	0.00	\N	f	\N	430855	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9bf39f27-417b-4b58-995b-40cb54444f3c	00000000-0000-0000-0000-0000000a5b71	4013052	Agent Plus d.o.o. Zagreb	company	HR	Ore┼íkovi─ìeva 6c/1	10000	Zagreb	t	HR66340042778	\N	\N	EUR	0	0.00	\N	f	\N	11252396	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
73605dc4-62cd-43af-91fd-b81246c230bb	00000000-0000-0000-0000-0000000a5b71	\N	Agility Logistics AG	company	CH	Frachtgeb├ñude Postfach 226	4030	Basel Airport	t	CHE116286908	E116286908	\N	EUR	30	0.00	\N	f	\N	3876303	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d4ab0014-ffea-4843-b9fe-147087bab9ff	00000000-0000-0000-0000-0000000a5b71	2318874	Agility Logistics d.o.o.	company	SI	ZGORNJI BRNIK 130B	4210	BRNIK - AERODROM	t	SI19498349	19498349	2349680	EUR	30	0.00	\N	f	\N	2318874	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
860781a5-b9bc-44c9-a2da-c965538cf16c	00000000-0000-0000-0000-0000000a5b71	2860456	Agility Logistics GmbH	company	DE	Philipp-Reis-Str. 7	36093	K├╝nzell	t	DE118566635	118566635	\N	EUR	45	0.00	\N	f	\N	2860456	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fecd3fb3-9c53-4f64-abda-f7f296508e4e	00000000-0000-0000-0000-0000000a5b71	2745679	AGL TRANSPORT Kfl	company	HU	Rozalia park 11	2051	BIATORBAGY	t	HU12181083	12181083	\N	EUR	60	0.00	\N	f	\N	2745679	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
56c55bbc-91c8-41e7-aecb-6d42f39ee0a7	00000000-0000-0000-0000-0000000a5b71	\N	AGM M├£LLER d.o.o.	company	SI	Kolodvorska cesta 022	8340	─îrnomelj	t	SI78386802	78386802	7297475000	EUR	30	0.00	\N	f	\N	7061748	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
63755c87-d1be-478d-ab69-b2e8d79580bc	00000000-0000-0000-0000-0000000a5b71	\N	AGM Stare┼íini─ì, d.o.o.	company	SI	Hrast pri Vinici 026	8344	Vinica	t	SI72809566	72809566	6744940000	EUR	30	0.00	\N	f	\N	6681177	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
df887d94-3cff-4a59-9b3e-222e9d571246	00000000-0000-0000-0000-0000000a5b71	\N	AGP CARS d.o.o.	company	SI	Ljubljanska cesta 032	8000	Novo mesto	t	SI98649272	98649272	8539022000	EUR	30	0.00	\N	f	\N	10395687	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
256b0f97-06c9-4bac-933b-3820be03d773	00000000-0000-0000-0000-0000000a5b71	\N	AGRICAR S.p.A (IT)	company	IT	Via Volta, 1	25010	S.ZENO NAVIGLIO	t	IT04051510982	04051510982	\N	EUR	30	0.00	\N	f	\N	12096056	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
049f1585-f413-4773-8fd0-f8e785fe3f61	00000000-0000-0000-0000-0000000a5b71	4004056	AGRO AUER d.o.o.	company	SI	Tr┼¥a┼íka cesta 53	2000	MARIBOR	t	SI54670187	\N	\N	EUR	0	0.00	\N	f	\N	5692254	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
20642be9-e73f-4229-aaa5-e8bdc4cf5fa1	00000000-0000-0000-0000-0000000a5b71	3819472	AGRO Company Tachty, s.r.o. (sk)	company	SK	Letecka 22	83103	BRATISLAVA	t	SK2020075442	2020075442	\N	EUR	60	0.00	\N	f	\N	3819472	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9edb1b5d-f1ba-44e6-838d-64b1993adddc	00000000-0000-0000-0000-0000000a5b71	1437928	AGRO INVEST JO┼¢E KRI┼¢AN S.P.	company	SI	GRIBLJE 081	8332	GRADAC	t	SI63347369	63347369	3389235	EUR	30	0.00	\N	f	\N	1437928	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e5f31d0b-50f6-4d4d-b576-7e421f45f5be	00000000-0000-0000-0000-0000000a5b71	3566036	AGRO Mekotnjak d.o.o.	company	HR	┼átrukovec 131	40314	Selnica	t	HR45527580220	45527580220	\N	EUR	60	0.00	\N	f	\N	3566036	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cfe91a03-cc35-4f76-8815-56ab47245ff7	00000000-0000-0000-0000-0000000a5b71	595523	AGRO MOBIL, D.O.O.	company	SI	LETALI┼áKA 37	4208	┼áEN─îUR	t	SI68853432	68853432	5949238000	EUR	0	0.00	\N	f	\N	595523	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bfa8ebdd-ec8a-4d6b-a044-431f019912ee	00000000-0000-0000-0000-0000000a5b71	2431212	AGROCOM De─ìno selo d.o.o.	company	SI	DE─îNO SELO 019	8253	ARTI─îE	t	SI87266156	87266156	5747147000	EUR	30	0.00	\N	f	\N	2431212	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f6e68cf5-b4b9-40a5-be8b-0737837d9f1b	00000000-0000-0000-0000-0000000a5b71	\N	AGROCOMPLEX Sp.z o.o. (pl-616)	company	PL	Stolarska 3	07200	WYSZKOW	t	PL7620002149	7620002149	\N	EUR	60	0.00	\N	f	\N	6329249	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4e7b58b9-73ba-452c-a233-c52184906127	00000000-0000-0000-0000-0000000a5b71	\N	TEST	company	SI	t342	4234	\N	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	\N	\N	active	1	2026-06-09 19:18:47.911325+00	2026-06-09 19:18:47.911325+00	00000000-0000-0000-0000-0000000a5001	00000000-0000-0000-0000-0000000a5001	f	\N	\N	\N	\N	\N
b8681e1c-4fa3-48d7-88ec-39e66a28f944	00000000-0000-0000-0000-0000000a5b71	\N	AGROCORN d.o.o.	company	SI	Ulica ┼átefana Kova─ìa 002A	9224	Turni┼í─ìe	t	SI25242423	25242423	2135604000	EUR	60	0.00	\N	f	\N	6505574	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6d46883b-9a7f-49e1-b76c-c4de8470be6b	00000000-0000-0000-0000-0000000a5b71	4002876	Agroforest d.o.o.	company	SI	Fabianijeva ulica 015	1000	LJUBLJANA	t	SI69044813	\N	\N	EUR	0	0.00	\N	f	\N	5282908	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
924ad8b7-4830-45c4-9418-50979a46fa84	00000000-0000-0000-0000-0000000a5b71	4002926	Agroforest j.d.o.o.	company	HR	Magdaleni─çeva 24	49221	Bedekov─ìina	t	HR 44234715749	\N	\N	EUR	0	0.00	\N	f	\N	5362066	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
74c84dcc-672d-4fb0-b691-073d10c7013a	00000000-0000-0000-0000-0000000a5b71	2483400	AGROHOLDING d.o.o.	company	SI	Ravno 012	8274	Raka	t	SI73264601	73264601	2032066000	EUR	30	0.00	\N	f	\N	2483400	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ae0fe2ec-a721-4cef-b467-8cf84cc33329	00000000-0000-0000-0000-0000000a5b71	4002427	AGROPARTS MARTIN MIHEL─îI─î S.P.	company	SI	BREZOVA REBER 4	8333	SEMI─î	t	SI57281807	57281807	\N	EUR	0	0.00	\N	f	\N	5039330	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4d935c1c-c0ec-4414-b64b-880660ff732d	00000000-0000-0000-0000-0000000a5b71	4000038	Agroplan d.o.o.	company	SI	Murnova ulica 16	1234	MENGE┼á	t	SI89539346	\N	\N	EUR	0	0.00	\N	f	\N	4204217	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bc7360ee-96d6-430a-bf1a-abd99529c3d1	00000000-0000-0000-0000-0000000a5b71	1711385	AGRORIT d.o.o.	company	RS	Ul.Svetozara Markovi─ça 33-37	23270	MELENCI	t	RS100903407	100903407	\N	EUR	30	0.00	\N	f	\N	1711385	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
94210280-3c46-4fa9-a828-d07d104b65ea	00000000-0000-0000-0000-0000000a5b71	3613934	AGROSIM TRANS d.o.o. BIJELJINA	company	BA	Kara─æor─æeva 105	76316	JANJA	t	BA4402756730008	4402756730008	\N	EUR	60	0.00	\N	f	\N	3613934	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
139711d1-6c8d-424f-958a-9218a275b595	00000000-0000-0000-0000-0000000a5b71	\N	AGRO-SKLAD SP.Z O,O,(PL-616)	company	PL	Starowiejska 48	26414	POTWOROW	t	PL6010080104	6010080104	\N	EUR	60	0.00	\N	f	\N	7391713	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a1efb7db-77b3-4a47-995c-6b5b9205cadc	00000000-0000-0000-0000-0000000a5b71	\N	AgSam Finance&Consulting Agnieszka Kislak-Aidat (PL-616)	company	PL	ul.Ks.I.Wierobieja 4A	17200	Hajnowka	t	PL6030075454	6030075454	\N	EUR	30	0.00	\N	f	\N	11654390	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0c14fba9-8243-47af-aa69-d322811e7f17	00000000-0000-0000-0000-0000000a5b71	2876774	AHAC d.o.o.	company	SI	Stop─ìe 031	3231	Grobelno	t	SI69092958	69092958	5473080000	EUR	30	0.00	\N	f	\N	2876774	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f03d91e8-3cf8-44a8-8a55-2d111f63fcd3	00000000-0000-0000-0000-0000000a5b71	3341372	AI LOGISTIKA d.o.o.	company	HR	Jurja Haulika 25	43000	Bjelovar	t	HR02513929920	02513929920	\N	EUR	60	0.00	\N	f	\N	3341372	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9d84cb2d-ff67-4163-bf7a-5d18335ab473	00000000-0000-0000-0000-0000000a5b71	532868	AIMHIGH PLUS D.O.O.	company	SI	LITOSTROJSKA CESTA 0044F	1000	LJUBLJANA	t	SI97664634	97664634	1718975000	EUR	0	0.00	\N	f	\N	532868	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8ba1f6d1-dbdc-47b9-9d3e-58284263d0db	00000000-0000-0000-0000-0000000a5b71	2602873	Air-Land-Water Transport j.d.o.o. (HR-191)	company	HR	Zagreba─ìka 26	10297	Jakovlje	t	HR42186237040	42186237040	\N	EUR	60	0.00	\N	f	\N	2602873	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d06bfcd4-4953-4d23-9714-2ce654111deb	00000000-0000-0000-0000-0000000a5b71	4003448	Airmax Cargo Budapest Zrt.	company	HU	Lorinci u.154, Airport City Logistics Park	2220	VECSES	t	HU24085984	\N	\N	EUR	0	0.00	\N	f	\N	5454217	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b70730c7-485f-497c-9a36-a9c3d68087ce	00000000-0000-0000-0000-0000000a5b71	3017576	AIRPHARM S.A., Avenida Sur del Aeropuerto de Barajas, (ES-724)	company	ES	28 Nudo Eisenhower Edificio 1, Planta 2. Oficina 5	28042	Madrid-Barajas	t	ESB58652892	B58652892	\N	EUR	30	0.00	\N	f	\N	3017576	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fc3fcd27-b8c9-488c-ad90-64ccda7de0a7	00000000-0000-0000-0000-0000000a5b71	4003132	Airpharm SA (CH-756)	company	CH	Gueterstrasse 66	4133	PRATTELN	t	CHE115899103	\N	\N	EUR	0	0.00	\N	f	\N	5365018	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
79413642-00c1-4ebc-9f7d-8aa1e27eafdf	00000000-0000-0000-0000-0000000a5b71	4008224	AIRPHARM SA. (ES-724)	company	ES	111 7o PLANTA, TORRE AUDITORI	08038	Barcelona	t	ESA58652892	\N	\N	EUR	0	0.00	\N	f	\N	7794931	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3042c910-dea7-44bb-ad05-45f4f4b143d0	00000000-0000-0000-0000-0000000a5b71	\N	AJD TRAD TRANS BUSINESS SRL ( RO-642)	company	RO	Bd. Ramnicu Sarat 14	031913	Bukure┼ít	t	RO38079320	38079320	\N	EUR	30	0.00	\N	f	\N	8973662	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cb24fb1d-aa96-40f7-871b-c090ca50161a	00000000-0000-0000-0000-0000000a5b71	498138	AJPES	company	SI	TR┼¢A┼áKA CESTA 16	1000	LJUBLJANA	t	SI14717468	14717468	1732803000	EUR	0	0.00	\N	f	\N	498138	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
83925235-631b-4ebf-8b66-6f94aa83482c	00000000-0000-0000-0000-0000000a5b71	4016635	AK Cargo Sp. z o.o.	company	PL	ul. Aleksandra Waszkowskiego 3/27	02-913	Warszawa	t	PL9731072243	\N	\N	EUR	0	0.00	\N	f	\N	17732085	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
938b68a6-ba85-485e-98a1-0403e48e4497	00000000-0000-0000-0000-0000000a5b71	4003060	Akers Valji Ravne d.o.o.	company	SI	KORO┼áKA CESTA 14	2390	RAVNE NA KORO┼áKEM	t	SI16457811	\N	\N	EUR	0	0.00	\N	f	\N	5343391	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ed2e41e4-cfd7-4d29-9a10-3cf80dd3afed	00000000-0000-0000-0000-0000000a5b71	4001011	Akrapovi─ì d.d.	company	SI	Malo Hudo 8a	1295	IVAN─îNA GORICA	t	SI95023828	\N	\N	EUR	0	0.00	\N	f	\N	4649651	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
694f1694-968f-4c69-b636-75545a87ee4a	00000000-0000-0000-0000-0000000a5b71	4001941	Akrapovi─ì Kreativa d.o.o.	company	SI	Malo Hudo 8a	1295	IVAN─îNA GORICA	t	SI87127059	\N	\N	EUR	0	0.00	\N	f	\N	4819477	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ee7c5ffe-7f99-4e65-8364-166b02d9b934	00000000-0000-0000-0000-0000000a5b71	774960	AKRIPOL D.D.	company	SI	PRIJATELJEVA CESTA 011	8210	TREBNJE	t	SI22511822	22511822	5038677000	EUR	0	0.00	\N	f	\N	774960	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
11ef7b10-4fe0-4da8-ad33-339d6e192b34	00000000-0000-0000-0000-0000000a5b71	3742144	AKTUAL INTERNACIONAL D.O.O.	company	BA	Put Srbske Vojske 5a	78400	GRADI┼áKA	t	BA402874260008	402874260008	\N	EUR	60	0.00	\N	f	\N	3742144	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
61c959a8-04a8-4f21-9b01-60bc553aa42a	00000000-0000-0000-0000-0000000a5b71	3633511	AKU FER LOGISTIK d.o.o.	company	SI	Trg 008	3312	Prebold	t	SI45480699	45480699	6159672	EUR	60	0.00	\N	f	\N	3633511	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dc4c6d2d-b85a-4c72-a6cb-5e982ced512c	00000000-0000-0000-0000-0000000a5b71	2364037	AKVANT D.O.O.	company	HR	Bosanci 6b	47251	Bosiljevo	t	HR87140097534	87140097534	\N	EUR	30	0.00	\N	f	\N	2364037	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5083179b-8bc3-4f0f-8e37-293a40a78a33	00000000-0000-0000-0000-0000000a5b71	4011643	AL expres, s.r.o.	company	SK	Mlynsk├® Nivy 56	82105	BRATISLAVA	t	SK2022687689	\N	\N	EUR	0	0.00	\N	f	\N	9935293	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8175f440-899d-467f-9cdd-8488888b43e9	00000000-0000-0000-0000-0000000a5b71	4014711	AL TRANS-LOGISTICS Sp. z.o.o.	company	PL	ul. J─Ödrzychowska 20D	65-385	Zielona G├│ra	t	PL9731061570	\N	\N	EUR	0	0.00	\N	f	\N	13745183	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1b1fee5d-e6ab-4ed4-a765-5c76af0ddca0	00000000-0000-0000-0000-0000000a5b71	4010808	AL.MA s.r.l. (IT-380)	company	IT	Via Largo Orti 5	62024	Esanatoglia	t	IT01653300432	\N	\N	EUR	0	0.00	\N	f	\N	9113148	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dc885d61-a476-4621-ab03-7f4471359535	00000000-0000-0000-0000-0000000a5b71	4007029	Ala Trasporti sa (CH-756)	company	CH	Corso San Gottardo 30	6830	CHIASSO	t	CH105934666	\N	\N	EUR	0	0.00	\N	f	\N	6841846	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0b04f925-35e2-4222-a814-1a778040373c	00000000-0000-0000-0000-0000000a5b71	4012174	Alaine forwarding	company	FR	Rue de la grosne, B.P. 62039	71020	MACON Cedex 9	t	FR78418114351	\N	\N	EUR	0	0.00	\N	f	\N	10463556	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0e365efc-47ff-4b40-9721-bfbe2cd67c83	00000000-0000-0000-0000-0000000a5b71	\N	ALAN GALI─å	company	SI	┼ámarje 103 b	6274	┼ámarje	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	10326498	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
487fbba0-caa3-4f32-9247-d9f1baf1c937	00000000-0000-0000-0000-0000000a5b71	4011609	Alb Logistics Sp.z o.o.	company	PL	Jana Barona 30	43 100	TYCHY	t	PL6462944046	\N	\N	EUR	0	0.00	\N	f	\N	9888317	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
da596974-94d4-463f-bd15-700a5452e2c0	00000000-0000-0000-0000-0000000a5b71	4014686	Alba Pharmaceuticals S.L.U.	company	ES	Pol. Ind El Collet 416	12580	Benicarl├│ (Castell├│n)	t	ES12929618	\N	\N	EUR	0	0.00	\N	f	\N	15149880	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c8e566e8-75d7-4fac-8274-ffefdf2dd806	00000000-0000-0000-0000-0000000a5b71	1099017	ALBAK d.o.o.	company	SI	┼¢ABNICA 059A	1357	NOTRANJE GORICE	t	SI36187917	36187917	2292971	EUR	0	0.00	\N	f	\N	1099017	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3b198d07-b38b-420d-8411-0a3f248a0a04	00000000-0000-0000-0000-0000000a5b71	4003031	Albatros.si, d.o.o.	company	SI	┼áKOFJA VAS 14	3211	┼áKOFJA VAS	t	SI66420342	\N	\N	EUR	0	0.00	\N	f	\N	5282909	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1ff1baa4-1ecf-4207-b90f-7987506f519d	00000000-0000-0000-0000-0000000a5b71	\N	ALBEMA S.R.O.(SK)	company	SK	Pavla Dob┼íinskeho 1544/3	97901	RIMAVSKA SOBOTA	t	SK2020075750	2020075750	\N	EUR	60	0.00	\N	f	\N	4693155	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
55c19a7f-3c21-445f-ac3b-337202a6c089	00000000-0000-0000-0000-0000000a5b71	3725110	Albert Aigner Betriebsgesellschaft m.b.H. (AT-040)	company	AT	Geierau 1	4680	Haag a.H.	t	ATU56897512	U56897512	\N	EUR	45	0.00	\N	f	\N	3725110	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f9ab02d4-f628-4e5a-af86-fb67bca10a2e	00000000-0000-0000-0000-0000000a5b71	3169620	Albert Craiss GmbH & Co. KG Internationale Spedition	company	DE	Vetterstr. 35	75417	M├╝hlacker	t	DE813246194	813246194	\N	EUR	60	0.00	\N	f	\N	3169620	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1b0c84d2-4dcd-4d76-80f5-a8606f668ec6	00000000-0000-0000-0000-0000000a5b71	2389822	ALBIN LOVRIN S.P.	company	SI	Drenovec 006A	8344	Vinica	t	SI12891835	12891835	3649008000	EUR	30	0.00	\N	f	\N	2389822	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ec4ca2d5-1bb0-4c4f-bc69-8f5140db0abb	00000000-0000-0000-0000-0000000a5b71	4012062	Alblas Internationaal Transpor	company	NL	Mijlweg 86	3295	KH "s-Gravendeel	t	NL007577692B01	\N	\N	EUR	0	0.00	\N	f	\N	10350513	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3b22bb92-d940-40c6-84a2-6ec2dc7c189f	00000000-0000-0000-0000-0000000a5b71	2298649	ALBO LS, d.o.o.	company	SI	Zagreb┼íka cesta 022	2000	Maribor	t	SI76683664	76683664	3800814000	EUR	30	0.00	\N	f	\N	2298649	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
baaf131f-b650-4a62-8e18-98dcfb617ff3	00000000-0000-0000-0000-0000000a5b71	4014174	Alcion Holland BV	company	NL	Ettenseweg 60	4706 PB	Roosendaal	t	NL810617511B01	\N	\N	EUR	0	0.00	\N	f	\N	12810817	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a990dbc9-4e26-4ac6-9c7f-49c026a3bbbf	00000000-0000-0000-0000-0000000a5b71	4017055	ALDONA s.r.o.	company	SK	Agatova 2611/16	07501	Trebisov	t	SK2020506609	\N	\N	EUR	0	0.00	\N	f	\N	18514577	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
18ce269b-1ef0-4a4b-903d-8f4bcb34fb58	00000000-0000-0000-0000-0000000a5b71	561393	ALEJA PRO D.O.O	company	SI	GRADI┼á─îE NAD PIJAVO GORICO 0164A	1291	┼áKOFLJICA	t	SI15685578	15685578	2146371	EUR	0	0.00	\N	f	\N	561393	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3586bfb2-0c41-4ed9-b71e-599a348c978b	00000000-0000-0000-0000-0000000a5b71	4013902	Aleksander Ho─ìevar sp	company	SI	Trubarjeva cesta 33	1315	VELIKE LA┼á─îE	t	SI49396960	\N	\N	EUR	0	0.00	\N	f	\N	12364209	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d27d57a2-ee05-45cb-b5d3-4b466d0b5c71	00000000-0000-0000-0000-0000000a5b71	\N	Aleksander Mir s.p.	company	SI	┼¢eleznikova ulica 020	2000	Maribor	t	SI19379030	19379030	8492727000	EUR	30	0.00	\N	f	\N	11911865	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2bbf7fd5-535e-409e-9254-64be8370753c	00000000-0000-0000-0000-0000000a5b71	1183357	Aleksander Mulec s.p.	company	SI	HRA┼áENSKI VRH 010	9252	RADENCI	t	SI82365580	82365580	3449688	EUR	0	0.00	\N	f	\N	1183357	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e5dd63f1-32c4-40e8-b1d7-dc2fe5a196e3	00000000-0000-0000-0000-0000000a5b71	1837382	ALEKSANDER ROGEL s.p.	company	SI	Gaji 034	3000	Celje	t	SI32008678	32008678	5584888000	EUR	30	0.00	\N	f	\N	1837382	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
846122a5-abb7-4823-a271-015168d5278a	00000000-0000-0000-0000-0000000a5b71	2351544	ALEKSANDER SVETELJ d.o.o.	company	SI	Hrastje 052E	4000	Kranj	t	SI31597327	31597327	5704294000	EUR	30	0.00	\N	f	\N	2351544	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9972f863-5e43-49e9-aa4b-8368bb432061	00000000-0000-0000-0000-0000000a5b71	1678019	ALEN BUZINA s.p.	company	SI	Orehovica 035	1411	Izlake	t	SI44718187	44718187	3236498	EUR	30	0.00	\N	f	\N	1678019	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
01b1621b-f066-4804-83b8-a628a350e092	00000000-0000-0000-0000-0000000a5b71	685575	ALEN KAMBI─î	company	SI	┼¢ELEZNI─îARSKA CESTA 28	8340	─îrnomelj	f	\N	\N	\N	EUR	0	0.00	\N	f	\N	685575	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4224bfee-36c1-45e3-a0e6-93431a730d40	00000000-0000-0000-0000-0000000a5b71	\N	Alen Toma┼íinec (HR-191)	company	HR	Ti┼íina Erdedska 63	44000	Sisak	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	7365325	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b2f5ed13-78e7-49f6-8510-8d945688e99c	00000000-0000-0000-0000-0000000a5b71	4002777	Alen Trans d.o.o.(BA)	company	BA	Safet Bega Be┼íagi─ça br.1	76100	BR─îKO	t	BA600334800000	600334800000	\N	EUR	0	0.00	\N	f	\N	5242273	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e1dee193-9e5a-443e-85a8-8b6228e1bcfc	00000000-0000-0000-0000-0000000a5b71	1465914	ALENKA KRIVEC S.P.	company	SI	┼áENTJAN┼¢ PRI DRAVOGRADU 151	2373	┼áENTJAN┼¢ PRI DRAVOGRADU	t	SI63804107	63804107	1969820	EUR	30	0.00	\N	f	\N	1465914	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3956100e-058e-435e-8a04-105249d002d1	00000000-0000-0000-0000-0000000a5b71	\N	Ale┼í Baznik s.p.	company	SI	Hrastje pri Cerkljah 019	8263	Cerklje ob Krki	t	SI26473216	26473216	6716890000	EUR	30	0.00	\N	f	\N	9707725	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7a20a32a-f8f6-4891-ab17-a75e179f69a6	00000000-0000-0000-0000-0000000a5b71	\N	ALE┼á BRULC - NOSILEC DOPOLNILNE DEJAVNOSTI NA KMETIJI	company	SI	Moverna vas 008	8333	Semi─ì	t	SI40313638	40313638	2604736000	EUR	30	0.00	\N	f	\N	19291976	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cccc7a36-2e2c-4f5d-9edf-c47e4f659caa	00000000-0000-0000-0000-0000000a5b71	\N	ALE┼á BURAZER S.P.	company	SI	Zadru┼¥na cesta 009	8340	─îrnomelj	t	SI24410098	24410098	6294855000	EUR	30	0.00	\N	f	\N	4149601	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5fda4ffb-39a7-4cac-8788-56b5ee7a8a5e	00000000-0000-0000-0000-0000000a5b71	3807679	ALE┼á GOR┼áE	company	SI	BUTORJASKA CESTA 28	8340	─îrnomelj	f	\N	88983889	\N	EUR	30	0.00	\N	f	\N	3807679	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3ee824ca-f853-49dd-afbf-5d45c5512d71	00000000-0000-0000-0000-0000000a5b71	3742728	Ale┼í Kmetec s.p.	company	SI	Kovinarska ulica 007	3000	Celje	t	SI61826057	61826057	6714960000	EUR	30	0.00	\N	f	\N	3742728	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ebb60a6a-c690-4b7c-b917-26c19e26c3d7	00000000-0000-0000-0000-0000000a5b71	\N	ALE┼á MEDO┼á S.P.	company	SI	Kani┼¥arica 041	8340	─îrnomelj	t	SI32233221	32233221	6562612000	EUR	30	0.00	\N	f	\N	7247217	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
85566c56-afd1-432c-b4bb-b7cde0e55643	00000000-0000-0000-0000-0000000a5b71	\N	Ale┼í Mu┼íi─ì s.p.	company	SI	Ulica na Utrdbah 010	8340	─îrnomelj	t	SI27556719	27556719	9030263000	EUR	30	0.00	\N	f	\N	17319875	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6c417ee9-a55e-4858-bf94-e514beb3d393	00000000-0000-0000-0000-0000000a5b71	1500552	ALE┼á OSOLNIK, S.P.	company	SI	KRI┼¢ 055	1218	KOMENDA	t	SI91937698	91937698	3867862	EUR	30	0.00	\N	f	\N	1500552	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
386e1037-1dba-4c9a-a911-7c01b8091c30	00000000-0000-0000-0000-0000000a5b71	1388853	ALE┼á SEVER S.P.	company	SI	MALE ┼¢ABLJE 045A	5263	DOBRAVLJE	t	SI85603473	85603473	5382604	EUR	0	0.00	\N	f	\N	1388853	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fe4069cf-6401-436b-b1ea-632d43139302	00000000-0000-0000-0000-0000000a5b71	1742092	ALE┼á ┼áVAJGER S.P.	company	SI	ZADRU┼¢NA CESTA 008H	8340	─îRNOMELJ	f	SI14321637	14321637	3859576	EUR	30	0.00	\N	f	\N	1742092	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a7a9f5aa-cbb2-4bc6-a416-7591438bd484	00000000-0000-0000-0000-0000000a5b71	\N	Ale┼í ┼¢eleznik s.p.	company	SI	Sela 004B	2324	Lovrenc na Dravskem polju	t	SI74563149	74563149	6609066	EUR	60	0.00	\N	f	\N	5346886	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0be2fc58-63aa-46b5-b8c0-7bdc90582281	00000000-0000-0000-0000-0000000a5b71	643373	ALFA EXTRA D.O.O.KOZINA	company	SI	TUBLJE 10	6240	KOZINA	t	SI53347544	53347544	5838819000	EUR	0	0.00	\N	f	\N	643373	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0a871e56-91ad-42b4-ab40-82083a7618fb	00000000-0000-0000-0000-0000000a5b71	4013560	ALFA PLUTUS	company	SI	Ul. Roberta Hvalca 4	2000	MARIBOR	t	SI94444927	\N	\N	EUR	0	0.00	\N	f	\N	11873899	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2053983a-1ca5-4be7-95c5-a8c00e9cc9be	00000000-0000-0000-0000-0000000a5b71	548969	ALFA SP D.O.O. LJUBLJANA	company	SI	LETALI┼áKA CESTA 016	1000	LJUBLJANA	t	SI95392408	95392408	5288606000	EUR	0	0.00	\N	f	\N	548969	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a249d810-3f8b-4751-ac37-b5f6a1818701	00000000-0000-0000-0000-0000000a5b71	3644412	Alfalog d.o.o.	company	HR	Jankomir 25	10090	Zagreb-Susedgrad	t	HR42436085143	42436085143	\N	EUR	30	0.00	\N	f	\N	3644412	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c2df8a2e-a266-45a2-876a-62287c7b259b	00000000-0000-0000-0000-0000000a5b71	4004478	AlfaT s.r.o.	company	SK	M. R. ┼átef├ínika 191/41	075 01	Trebi┼íov	t	SK2024171193	\N	\N	EUR	0	0.00	\N	f	\N	5875336	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
78723d75-decd-41fc-beac-8f1b51a09444	00000000-0000-0000-0000-0000000a5b71	4010777	Alfio Sz├íll├¡tm├ínyoz├ísi Kft.(HU-348)	company	HU	T├íncsics u.9.	2011	Budakal├ísz	t	HU26206213	\N	\N	EUR	0	0.00	\N	f	\N	9073915	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c4e867c2-f5eb-4443-867a-639aada1efdb	00000000-0000-0000-0000-0000000a5b71	1148546	ALFOM d.o.o.	company	SI	PODGORJE 064D	2381	PODGORJE PRI SLOVENJ GRADCU	t	SI56414951	56414951	5754453000	EUR	0	0.00	\N	f	\N	1148546	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
59c38325-51f9-4f69-aa59-565d7321b12a	00000000-0000-0000-0000-0000000a5b71	4000540	Alfred Schuon GmbH Internation	company	DE	B├╝hlwiesenweg 15	72221	Haiterbach	t	DE144367669	\N	\N	EUR	0	0.00	\N	f	\N	4173991	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3192ebe9-ada5-4f54-9a2a-a9f152b5d492	00000000-0000-0000-0000-0000000a5b71	2074815	ALIDO d.o.o.	company	SI	BIZOVI┼áKA CESTA 043H	1261	LJUBLJANA - DOBRUNJE	t	SI90480805	90480805	1663003000	EUR	30	0.00	\N	f	\N	2074815	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
abe9cb25-1066-41d7-9c1b-3f91d1619007	00000000-0000-0000-0000-0000000a5b71	4004386	Alimpex Food a.s.	company	CZ	─îeskobrodsk├í 1174	19800	PRAHA 9 - Kyje	t	CZ47115807	\N	\N	EUR	0	0.00	\N	f	\N	5857424	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5b5716f6-3bf2-4764-83a2-2e975c5619f3	00000000-0000-0000-0000-0000000a5b71	1103996	ALINA, Jo┼¥ica Kolenc s.p.	company	SI	BUKOV┼¢LAK 095	3221	TEHARJE	t	SI44817070	44817070	3700755	EUR	0	0.00	\N	f	\N	1103996	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a166f0a0-6153-47f4-a061-5976fe5a2e75	00000000-0000-0000-0000-0000000a5b71	\N	ALJA┼¢ DEBEVEC S.P.	company	SI	Kamnik pod Krimom 075H	1352	Preserje	t	SI98957929	98957929	3060977	EUR	30	0.00	\N	f	\N	3913640	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f8d3ec5d-50f5-455e-9783-79a3e7b18940	00000000-0000-0000-0000-0000000a5b71	\N	ALK d.o.o. Olovo (ba)	company	BA	Tuzlanska bb	1111	OLOVO	t	BA218124120004	218124120004	\N	EUR	60	0.00	\N	f	\N	5119429	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dfc0ed28-5ff1-42b9-90fd-8ce751704b73	00000000-0000-0000-0000-0000000a5b71	\N	ALKATRANS, d.o.o.	company	SI	Gotovlje 083B	3310	┼¢alec	t	SI55843638	55843638	1994450000	EUR	60	0.00	\N	f	\N	6684366	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a21ae15e-c1b8-4967-8c2f-dee7ce2470fa	00000000-0000-0000-0000-0000000a5b71	2796509	ALKOM d.o.o.(RS)	company	RS	Vitezova Kara─æor─æeve Zvezde 130b	11060	BEOGRAD	t	RS101716124	101716124	\N	EUR	60	0.00	\N	f	\N	2796509	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
15d8019a-0f21-420e-8432-cd204ad54e9e	00000000-0000-0000-0000-0000000a5b71	3726909	ALL & ALL d.o.o.	company	SI	Slamnikarska cesta 004	1230	Dom┼¥ale	t	SI75635267	75635267	5326222000	EUR	30	0.00	\N	f	\N	3726909	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cd1f3785-6858-4f85-9ae2-b843fd5b8ee8	00000000-0000-0000-0000-0000000a5b71	600605	ALL CARGO EXPRES S.R.L. (RO-642)	company	RO	GIROC SAT CHISODA DN 59,	000000	00	f	\N	\N	\N	EUR	0	0.00	\N	f	\N	600605	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5f8162f7-e8be-489e-9e39-d46a4450e687	00000000-0000-0000-0000-0000000a5b71	2340282	All Fresh Logistics GmbH (AT-040)	company	AT	Nord 11 Stiege III	5412	Puch - Urstein	t	ATU58088447	U58088447	\N	EUR	45	0.00	\N	f	\N	2340282	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0c82d958-61e8-4767-8872-f9027a065b28	00000000-0000-0000-0000-0000000a5b71	\N	All Fresh Transport d.o.o.	company	SI	┼¢anova ulica 003	4000	Kranj	t	SI28193091	28193091	8438315000	EUR	30	0.00	\N	f	\N	14586327	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e9fb0cac-1a5a-4a91-bc17-9ad4e8c05dec	00000000-0000-0000-0000-0000000a5b71	\N	ALL TIME LOGISTICS (BA-070)	company	BA	Pilju┼¥i─çi bb	74260	TE┼áANJ	t	BA4219048720001	4219048720001	\N	EUR	30	0.00	\N	f	\N	10786366	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
60a2fc85-2387-4c3b-8361-d518cd4b6cc9	00000000-0000-0000-0000-0000000a5b71	3396265	AllerLogistic GmbH	company	DE	Auf dem Kessellande 10	30900	Wedemark OT Bissendorf	t	DE814548769	814548769	\N	EUR	60	0.00	\N	f	\N	3396265	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
541789f2-1a3d-4494-93fc-b5b66a51b324	00000000-0000-0000-0000-0000000a5b71	4004398	AllerLogistic GmbH	company	DE	Am S├ñgewerk 2a	29308	Winsen (Aller)	t	DE814548769	\N	\N	EUR	0	0.00	\N	f	\N	5846319	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
93a170a0-1cec-434a-bed5-f0f2e235be47	00000000-0000-0000-0000-0000000a5b71	2898994	Allgaier Translog GmbH & Co. KG	company	DE	Robert-Bunsen-Str. 36-40	64579	Gernsheim	t	DE814912796	814912796	\N	EUR	45	0.00	\N	f	\N	2898994	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
83535117-e41d-4722-a5eb-65955654aa8a	00000000-0000-0000-0000-0000000a5b71	4014894	Allg├ñuer Logistik GmbH	company	DE	Kaltererstra├ƒe 9	86165	AUGSBURG	t	DE359221049	\N	\N	EUR	0	0.00	\N	f	\N	14036787	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ab1b863a-740f-454d-ac1d-b2daec8aefb1	00000000-0000-0000-0000-0000000a5b71	2852821	Allround - Transport B.V.	company	NL	Kaasmakerstraat 10	3194	DJ HOOGVLIET Rt	t	NL800576342B01	800576342B01	\N	EUR	60	0.00	\N	f	\N	2852821	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
01482a99-426a-48f9-91d2-6d04304fba4d	00000000-0000-0000-0000-0000000a5b71	4015338	Almar Transport Spedycja sp z	company	PL	ul. Hipolita Niestrawskiego 1	63800	GOSTYN	t	PL6961806629	\N	\N	EUR	0	0.00	\N	f	\N	15155085	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b7d69b62-8272-4886-9c86-82b9da201e5e	00000000-0000-0000-0000-0000000a5b71	3836884	ALMIR Miroslav Lewandowski (PL)	company	PL	Szczecinska 57	76200	SLUPSK	t	PL8391071183	8391071183	\N	EUR	60	0.00	\N	f	\N	3836884	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8fae0c33-f72d-498b-8818-59f4927ac340	00000000-0000-0000-0000-0000000a5b71	3633504	ALMY-TRANSPORT d.o.o. ZENICA	company	BA	Vrandu─ìka b.b.	72000	ZENICA	t	BA4218398500008	4218398500008	\N	EUR	60	0.00	\N	f	\N	3633504	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
798dac3e-4e87-4b8a-9ca2-7796a9673b5e	00000000-0000-0000-0000-0000000a5b71	4016235	ALNOVA Logistik GmbH	company	AT	Andreas-Hofer Strasse 40	6020	Innsbruck	t	ATU80602778	\N	\N	EUR	0	0.00	\N	f	\N	16790035	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
359a1c13-5c98-408f-b2ad-385dfb342832	00000000-0000-0000-0000-0000000a5b71	4001926	A-Logistics Company sh.p.k	company	AL	D├½shmor├½t e 4 Shkurtit Str.	1000	Tirana	t	ALL41307075M	\N	\N	EUR	0	0.00	\N	f	\N	4816734	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5fbb4c87-6c9d-4f01-be39-38ce95908e00	00000000-0000-0000-0000-0000000a5b71	\N	ALOJZ BRDNIK - NOSILEC DOPOLNILNE DEJAVNOSTI NA KMETIJI	company	SI	RAJHENAV 1	1330	KO─îEVJE	t	SI46634851	46634851	2119013000	EUR	30	0.00	\N	f	\N	16491378	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
35a091ef-45f4-4dbe-81e7-22e709860291	00000000-0000-0000-0000-0000000a5b71	\N	ALOJZ ZAMERNIK S.P.	company	SI	Rore 023A	3333	Ljubno ob Savinji	t	SI31753795	31753795	7022433000	EUR	30	0.00	\N	f	\N	9437041	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8c7965e9-f898-442d-b61b-48b4ad3532c7	00000000-0000-0000-0000-0000000a5b71	504728	ALP - TRANSPORT ┼á.LOKA D.	company	SI	KIDRI─îEVA CESTA 45	4220	┼áKOFJA LOKA	t	SI18750168	18750168	5723035	EUR	0	0.00	\N	f	\N	504728	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
46b8ffa6-812d-430c-bdd4-d73f1f64a199	00000000-0000-0000-0000-0000000a5b71	\N	AL-PA Marko Mla─æenovi─ç s.p.	company	SI	Lobetova ulica 002	8000	Novo mesto	t	SI99274051	99274051	9623078000	EUR	30	0.00	\N	f	\N	19961784	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b5da8bc1-e0fd-4d8f-a6ee-6cee390b2aef	00000000-0000-0000-0000-0000000a5b71	2996793	ALPAL d.o.o.	company	SI	Podlubnik 155	4220	┼ákofja Loka	t	SI12153869	12153869	2254077	EUR	30	0.00	\N	f	\N	2996793	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
00a50ca4-4e49-453f-9f83-e6fd9728f0b4	00000000-0000-0000-0000-0000000a5b71	\N	ALPENHAG JERNEJ PE─îNIK S.P.	company	SI	Lepa Njiva 070	3325	┼áo┼ítanj	t	SI52001601	52001601	3695689000	EUR	60	0.00	\N	f	\N	4092873	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
37532fc4-0ac4-45b7-b3f1-344d5cb0937f	00000000-0000-0000-0000-0000000a5b71	2735691	Alpensped GmbH Internationale Logistik (DE-276)	company	DE	Postfach 24 01 65	68171	MANNHEIM	t	DE811269194	811269194	\N	EUR	45	0.00	\N	f	\N	2735691	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
348b4747-1f3c-42b7-a936-a94bd2df47d6	00000000-0000-0000-0000-0000000a5b71	1871317	ALPENTRANS Spedition und Transport GmbH ( AT-040)	company	AT	Gniglerstrasse 5	5020	Salzburg	t	ATU33814209	33814209	\N	EUR	30	0.00	\N	f	\N	1871317	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
866f2278-3a21-4a84-b8d8-c98d9f67da09	00000000-0000-0000-0000-0000000a5b71	4015187	Alperoad ─îerne, frigo transpor	company	SI	Zgornji Brnik 101	4207	CERKLJE NA GORENJ.	t	SI40088995	\N	\N	EUR	0	0.00	\N	f	\N	14755829	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4a854c3f-6c5f-4894-b8af-004465e025e9	00000000-0000-0000-0000-0000000a5b71	442538	ALPETOUR, D.D.	company	SI	KIDRI─îEVA CESTA 0056	4220	┼áKOFJA LOKA	t	SI22881930	22881930	5097061	EUR	0	0.00	\N	f	\N	442538	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b08a8405-69a5-43b7-9beb-2ee28bd8740e	00000000-0000-0000-0000-0000000a5b71	\N	ALPE-TRANS dooel (mk-807)	company	MK	Partizanska 57	1426	KAVADARCI	t	MK4011005123026	4011005123026	\N	EUR	60	0.00	\N	f	\N	7202210	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1345fd78-b39b-431c-817a-c7452656020e	00000000-0000-0000-0000-0000000a5b71	4002157	Alpetrans s.r.l.- Marostica (IT-380)	company	IT	Via S.S. 248, n. 6	36063	Marostica	t	IT01329320244	\N	\N	EUR	0	0.00	\N	f	\N	4911016	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4c1d7569-b486-4d81-9ed2-629330284693	00000000-0000-0000-0000-0000000a5b71	4006541	ALPHA Logistik GmbH	company	AT	Gewerbepark S├╝d 6	6330	Kufstein	t	ATU65967411	\N	\N	EUR	0	0.00	\N	f	\N	6505915	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f4d15e11-d9b8-4576-adfe-3cee6cd6439e	00000000-0000-0000-0000-0000000a5b71	\N	ALPHA TEHNIKA d.o.o.	company	HR	Rije─ìka 45	47000	Karlovac	t	HR12641034449	12641034449	\N	EUR	30	0.00	\N	f	\N	18707279	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1d2ed7a2-c28d-41b3-86de-85fcfcee08b6	00000000-0000-0000-0000-0000000a5b71	2045307	ALPIS d.o.o.	company	SI	GORENJESAVSKA CESTA 013A	4000	KRANJ	t	SI75467771	75467771	5509416000	EUR	30	0.00	\N	f	\N	2045307	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
291564ae-1a06-4815-b4c8-bdb9811b78f7	00000000-0000-0000-0000-0000000a5b71	1477699	ALPOD d.o.o.	company	SI	PODSKRAJNIK 112	1380	CERKNICA	t	SI34754008	34754008	1274112000	EUR	30	0.00	\N	f	\N	1477699	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bdf2d5c4-df6c-400c-a771-afc9b49cb855	00000000-0000-0000-0000-0000000a5b71	\N	ALPSKA INVESTICIJSKA DRU┼¢BA d.o.o.	company	SI	Grad 076	4207	Cerklje na Gorenjskem	t	SI52988252	52988252	7121709000	EUR	30	0.00	\N	f	\N	11177339	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a4ddc6ae-af51-41d3-a5a1-a16aca8d3041	00000000-0000-0000-0000-0000000a5b71	\N	ALSA d.o.o. (HR-191)	company	HR	Bolni─ìka cesta 34/J	10090	Zagreb-Susedgrad	t	HR31691882904	31691882904	\N	EUR	30	0.00	\N	f	\N	12286223	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b5b61b31-bdac-4437-a732-526f8b9e6c2b	00000000-0000-0000-0000-0000000a5b71	4014899	ALSALOGPHARMA - TRANSPORTS KES	company	FR	Zone Industrielle, 4 Rue Denis Papin	68190	ENSISHEIM	t	FR41339453094	\N	\N	EUR	0	0.00	\N	f	\N	14068143	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0e6cbb9d-3aaa-4805-9403-c84243ee4501	00000000-0000-0000-0000-0000000a5b71	4017340	ALSET, spol s.r.o.	company	CZ	Otradovick├í 3	142 00	Hlavn├¡ m─østo Praha	t	CZ00571083	\N	\N	EUR	0	0.00	\N	f	\N	19185266	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b850d30b-fac7-43af-a1e5-272088905611	00000000-0000-0000-0000-0000000a5b71	\N	ALSTAR d.o.o.	company	SI	┼ápruha 019	1236	Trzin	t	SI42807794	42807794	6008208	EUR	30	0.00	\N	f	\N	5257069	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
14ab0674-27f7-42fa-91a2-4a9d9249b24f	00000000-0000-0000-0000-0000000a5b71	2526766	AL-TA d.o.o.	company	SI	IVANJI GRAD 018	6223	KOMEN	t	SI58471464	58471464	3909697000	EUR	60	0.00	\N	f	\N	2526766	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
496c2643-1ff4-4fd7-a1b9-3a46348a3810	00000000-0000-0000-0000-0000000a5b71	2755712	ALTANA - PST d.o.o.	company	SI	Brilejeva ulica 020	1000	Ljubljana	t	SI16693604	16693604	2323117	EUR	60	0.00	\N	f	\N	2755712	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d1bac1b0-5cee-465a-abca-c24bd01220c2	00000000-0000-0000-0000-0000000a5b71	4009794	Altius S.A.	company	ES	Av. Drassanes, 6-8 - 9a	08001	Barcelona	t	ESA82303769	\N	\N	EUR	0	0.00	\N	f	\N	8149637	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f23f607c-50d4-42a8-a63d-7a02c52cedb8	00000000-0000-0000-0000-0000000a5b71	4003203	Altmann Spedition & Frachtenve	company	DE	Bleichstr. 16	77866	Rheinau	t	DE814895960	\N	\N	EUR	0	0.00	\N	f	\N	5368793	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
54ba2a72-bc26-4218-b172-f0da352c6645	00000000-0000-0000-0000-0000000a5b71	4015768	Altrans Alsace SARL	company	FR	Rue Benjamin Silliman 3	67116	REICHSTETT	t	FR67528903156	\N	\N	EUR	0	0.00	\N	f	\N	15811690	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e049937b-da66-4703-a6bc-c47b7dd61c81	00000000-0000-0000-0000-0000000a5b71	2376020	ALTRANS TRANSPORT, HENRYK HENZEL	company	PL	UL.PODGORNA 4	62007	BISKUPICE	t	PL7841010041	7841010041	\N	EUR	30	0.00	\N	f	\N	2376020	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
69602623-74d6-47a0-9c2e-8911d38e5843	00000000-0000-0000-0000-0000000a5b71	4009965	ALUTIREX s.r.o.	company	SK	Priemyselna 12	96563	┼¢IAR NAD HRONOM	t	SK2021911837	\N	\N	EUR	0	0.00	\N	f	\N	8253613	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d89735c6-76ae-4297-9915-5e60db2717c7	00000000-0000-0000-0000-0000000a5b71	2868987	Alvi Logistik GmbH	company	DE	Kufsteinerstr. 20	83088	Kiefersfelden	t	DE279201460	279201460	\N	EUR	60	0.00	\N	f	\N	2868987	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b47b4ae8-9819-4846-ab17-a79fbcbbd997	00000000-0000-0000-0000-0000000a5b71	4015405	ALWE LOGISTIK GMBH	company	AT	Andreas-Hofer-Stra├ƒe 40	6020	Innsbruck	t	ATU77518517	\N	\N	EUR	0	0.00	\N	f	\N	15240760	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c23abb96-ce11-47b1-beb7-1d50403ad963	00000000-0000-0000-0000-0000000a5b71	557149	AM GROUP D.O.O.	company	SI	DOBRI┼áA VAS 3	3301	PETROV─îE	t	SI23481404	23481404	5310342000	EUR	0	0.00	\N	f	\N	557149	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2e1a74a6-8843-4c08-8e5a-591ad05fa8ff	00000000-0000-0000-0000-0000000a5b71	\N	AMARIN 22 d.o.o.	company	SI	Gmajnice 031	1000	Ljubljana	t	SI76690393	76690393	6548822	EUR	60	0.00	\N	f	\N	4043727	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
317f5df9-dc82-45a6-846a-fc991c2383b7	00000000-0000-0000-0000-0000000a5b71	\N	AMB CARGO d.o.o. (HR-191)	company	HR	Lukave─ìka 47	10412	Donja Lomnica	t	HR95206344003	95206344003	\N	EUR	30	0.00	\N	f	\N	11249929	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2a8502b6-c881-4b5a-b1e9-9cb26144d0ff	00000000-0000-0000-0000-0000000a5b71	\N	A-MB d.o.o.	company	SI	Jadranska cesta 025	2000	Maribor	t	SI88445011	88445011	5044880000	EUR	30	0.00	\N	f	\N	4365523	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c521ca4d-6b79-4805-bd78-678e3c183670	00000000-0000-0000-0000-0000000a5b71	2375998	AMBACH Kft	company	HU	078/24 HRSZ	2465	RACKERESZTUR	t	HU13453109	13453109	\N	EUR	30	0.00	\N	f	\N	2375998	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8ffa20c5-4eb2-4a29-97e2-ef46791d590c	00000000-0000-0000-0000-0000000a5b71	2870535	AMBER TRANS Mariusz Ambroziak	company	PL	ul.Wilczynskiego 25c/18	10686	OLSZTYN	t	PL7393341284	7393341284	\N	EUR	60	0.00	\N	f	\N	2870535	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
363908f9-74cf-4cf4-98b8-e98a0217dd99	00000000-0000-0000-0000-0000000a5b71	\N	AMEVIS s.r.o.	company	SK	Mierova 29	82105	Bratislava	t	SKSK2120121685	SK2120121685	\N	EUR	30	0.00	\N	f	\N	9999048	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e2c71447-8a82-456e-9250-a3ececbd80de	00000000-0000-0000-0000-0000000a5b71	4008030	Amex Logistics(NL-528)	company	NL	Vanadiumweg 11e	3812 PX	AMERSFOORT	t	NL808426783	\N	\N	EUR	0	0.00	\N	f	\N	7585819	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
48bfff5b-c640-401b-ad44-efa85871a3d5	00000000-0000-0000-0000-0000000a5b71	4001739	AMICUS AG	company	SI	NEUHOFSTRASSE 5 A	6340	BAAR	t	SI20400764	20400764	\N	EUR	0	0.00	\N	f	\N	4700508	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5f7e2635-9d42-4f86-82f8-3bcbd76b156c	00000000-0000-0000-0000-0000000a5b71	4001683	AMICUS SI d.o.o.	company	SI	Pot k sejmi┼í─ìu 35	1231	LJUBLJANA	t	SI76258939	76258939	\N	EUR	0	0.00	\N	f	\N	4670845	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e21df182-a9f2-4628-9ace-1463287a047e	00000000-0000-0000-0000-0000000a5b71	512316	AMIGOS D.O.O.	company	SI	Dolenjska cesta 318	1291	┼ákofljica	t	SI56134592	56134592	1925008000	EUR	0	0.00	\N	f	\N	512316	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a85b7f1c-74d7-408c-9dfb-44c2f1132fce	00000000-0000-0000-0000-0000000a5b71	3846252	AMK SERVIS MARKO KRMAVNAR S.P.	company	SI	V RADNO 043	1351	BREZOVICA PRI LJUBLJANI	t	SI76338410	76338410	5558782	EUR	30	0.00	\N	f	\N	3846252	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e3317ad5-1a48-4e9f-9f22-442c9f3102d9	00000000-0000-0000-0000-0000000a5b71	4000993	A-MOBIL, Filip Gobec s.p.	company	SI	OSREDEK PRI ZRE─îAH 27	3214	ZRE─îE	t	SI37032984	37032984	\N	EUR	60	0.00	\N	f	\N	4369831	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
94374272-60c2-42b0-a72b-3161d8947fbc	00000000-0000-0000-0000-0000000a5b71	\N	AMORTIZER d.o.o.	company	SI	Videm 021B	1262	Dol pri Ljubljani	t	SI91122104	91122104	2156741000	EUR	30	0.00	\N	f	\N	9160940	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4792a52f-4521-40d0-aee0-7357006ce9d8	00000000-0000-0000-0000-0000000a5b71	\N	AMS AUTO un Motoren Service Ges.m.b.H (AT-040)	company	AT	Rudolf Diesel Strasse 3	8141	Premstatten	t	ATU65906077	U65906077	\N	EUR	30	0.00	\N	f	\N	15415507	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
35582aa6-5be7-45b2-b905-92ca89b340a1	00000000-0000-0000-0000-0000000a5b71	1363359	AMS STORITVE, d.o.o.	company	SI	SLIVNICA PRI CELJU 008	3263	GORICA PRI SLIVNICI	t	SI47857706	47857706	1810219000	EUR	0	0.00	\N	f	\N	1363359	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7fe08159-09cd-48a1-8400-d2a55400f2ed	00000000-0000-0000-0000-0000000a5b71	4016935	AM-SPED s.r.o.	company	SK	Seredsk├í 255C	917 05	Trnava	t	SK2022458790	\N	\N	EUR	0	0.00	\N	f	\N	18221963	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
47f351e4-64df-4a28-9aaf-710e91060a50	00000000-0000-0000-0000-0000000a5b71	567814	AMZS D.D.	company	SI	DUNAJSKA CESTA 0128A	1000	LJUBLJANA	t	SI56951442	56951442	5488338000	EUR	0	0.00	\N	f	\N	567814	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fe2e3566-56c5-48bd-91ca-fcd346979d56	00000000-0000-0000-0000-0000000a5b71	\N	ANADOLIJA LTD(tr)	company	TR	Manekse 2	3000	ISTANBUL	t	TR140866	140866	\N	EUR	30	0.00	\N	f	\N	5251348	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2f1e2123-edce-494b-b53c-9789c8dc5e25	00000000-0000-0000-0000-0000000a5b71	4015294	Anaszand Kft.	company	HU	F┼æ fasor 36   1	6726	SZEGED	t	HU24930097	\N	\N	EUR	0	0.00	\N	f	\N	14960543	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5d7a5a95-6ad0-4b4e-9516-64eb5f28343f	00000000-0000-0000-0000-0000000a5b71	2351048	ANDERS MEDIN I VINNINGA AB	company	SE	SOCKERBRUKSGATAN 5	53140	LIDK├ûPING	t	SE556568337101	556568337101	\N	EUR	30	0.00	\N	f	\N	2351048	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
64af0394-555e-4349-8b33-76500986d88c	00000000-0000-0000-0000-0000000a5b71	3648750	Andra┼¥ ┼ákorjanc s.p.	company	SI	Me┼¥a 156B	2370	Dravograd	t	SI81775261	81775261	6781551	EUR	60	0.00	\N	f	\N	3648750	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9f3e3350-9cba-4712-b606-f592e4676fe2	00000000-0000-0000-0000-0000000a5b71	\N	Andreas Ockenfuss Transportunterneh ???'	company	SI	x	1000	Ljubljana	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	16899227	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
23a3ca22-c5fb-4525-881a-baafa48d85fd	00000000-0000-0000-0000-0000000a5b71	4005134	Andreas Schmid Int. Spedition (DE-276)	company	DE	Andreas-Schmid-Stra├ƒe 1	86368	Gersthofen	t	DE127330673	127330673	\N	EUR	0	0.00	\N	f	\N	6245564	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3b94e912-00be-4ea4-a728-9c9da29ea807	00000000-0000-0000-0000-0000000a5b71	2922355	Andreas Schmid Int. Spedition GmbH & Co. KG	company	DE	Welserstr 6	86368	Gersthofen	t	DE127330673	127330673	\N	EUR	45	0.00	\N	f	\N	2922355	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a23e43fd-f14c-4d66-871a-577f82a75f58	00000000-0000-0000-0000-0000000a5b71	1064423	Andreas Schmid Int.Spedition GmbH&CO.KG	company	DE	Welser Strasse 6	86368	Gersthofen	t	DE127330673	DE127330673	\N	EUR	0	0.00	\N	f	\N	1064423	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c99753bb-4fb5-4770-8660-b2ed304aef68	00000000-0000-0000-0000-0000000a5b71	\N	ANDREJ KOBE S.P.	company	SI	Vinica 060	8344	Vinica	t	SI15131017	15131017	3409945000	EUR	30	0.00	\N	f	\N	18581895	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
55204819-8bb0-4ec6-92ad-d3b2dd158fd6	00000000-0000-0000-0000-0000000a5b71	\N	ANDREJ KO─îEVAR	company	SI	PETROVA VAS 3/A	8340	─îrnomelj	f	\N	15904024	\N	EUR	30	0.00	\N	f	\N	8541626	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
58c0a1e8-f664-406f-ab1a-f039cc2b523f	00000000-0000-0000-0000-0000000a5b71	4000100	Andrej Kova─ìek s.p.	company	SI	Star┼íe 68	2205	STAR┼áE	t	SI57769435	\N	\N	EUR	0	0.00	\N	f	\N	4069624	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3a03c266-8258-4a30-9507-8b580d06bc5a	00000000-0000-0000-0000-0000000a5b71	3846246	ANDREJ KRMC S.P.	company	SI	SLEP┼áEK 008	8230	MOKRONOG	t	SI33939519	33939519	1315463000	EUR	30	0.00	\N	f	\N	3846246	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e7c8b574-12a3-4fb2-b45a-f20a22a26e09	00000000-0000-0000-0000-0000000a5b71	\N	ANDREJ MANTELJ S.P.	company	SI	Stopi─ìe 055	8322	Stopi─ìe	t	SI18656501	18656501	5075296000	EUR	30	0.00	\N	f	\N	17911571	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dcd335cd-a1f2-4f29-8cef-326350cfddee	00000000-0000-0000-0000-0000000a5b71	\N	ANDREJ MI┼áICA	company	SI	─îudno delo 9	8340	─îrnomelj	f	\N	88043061	\N	EUR	30	0.00	\N	f	\N	12931944	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
37b58cea-6e59-4a79-bbc3-f15675db2f7e	00000000-0000-0000-0000-0000000a5b71	\N	ANDREJ ┼áTEFANI─î S.P.	company	SI	Zapudje 023	8343	Dragatu┼í	t	SI52717178	52717178	7294018000	EUR	20	0.00	\N	f	\N	17203244	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
69584c52-aa7d-4e57-b110-922b6c09238a	00000000-0000-0000-0000-0000000a5b71	\N	ANDREJ ┼áVAJGER S.P.	company	SI	Vranovi─ìi 023	8340	─îrnomelj	t	SI76065456	76065456	5027507000	EUR	30	0.00	\N	f	\N	19880142	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1a23fff0-11f7-4bda-8b70-e2368ca29b15	00000000-0000-0000-0000-0000000a5b71	\N	ANDREJ ┼¢ELJKO S.P.	company	SI	Tribu─ìe 001A	8340	─îrnomelj	t	SI92082068	92082068	6440347	EUR	30	0.00	\N	f	\N	5977101	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4b9b675d-cab2-4772-b99c-071ee0cf16d9	00000000-0000-0000-0000-0000000a5b71	4014211	Andreja Bogataj s.p.	company	SI	Brebovnica 8B	4224	GORENJA VAS	t	SI70946795	\N	\N	EUR	0	0.00	\N	f	\N	12924514	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9b1e08bf-bada-4d5a-8f1e-f51cf5508037	00000000-0000-0000-0000-0000000a5b71	4016439	Andreja logistika d.o.o.	company	SI	Podlani┼í─ìe 22	5282	CERKNO	t	SI41889061	\N	\N	EUR	0	0.00	\N	f	\N	17341703	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ceaed3b9-9c8c-4914-ae56-356dfe405c24	00000000-0000-0000-0000-0000000a5b71	\N	ANEL TRANSPORT, d.o.o.	company	SI	Ulica Anice ─îernejeve 038	2310	Slovenska Bistrica	t	SI71471359	71471359	7280521	EUR	30	0.00	\N	f	\N	7740720	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c8d056f4-a1a9-4f3f-b00c-e6695deb1b14	00000000-0000-0000-0000-0000000a5b71	4008265	ANEL TRANSPORT, STORITVE TRAN	company	SI	ULICA ANICE ─îERNEJEVE 38	2310	SLOVENSKA BISTRICA	t	SI71471359	\N	\N	EUR	0	0.00	\N	f	\N	10105114	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9274ec3c-63ce-428c-ba86-b4fbb0c6c2f7	00000000-0000-0000-0000-0000000a5b71	\N	ANEMONA NATURA d.o.o.	company	HR	Matije Jurja ┼áporera 20	47000	Karlovac	t	HR40678754626	40678754626	\N	EUR	30	0.00	\N	f	\N	19705382	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d8a79e82-00aa-4fd8-9dda-0797ad8b0744	00000000-0000-0000-0000-0000000a5b71	1723831	ANER-TRANS d.o.o. (BA-070)	company	BA	UL.─îEHAJE BB	75350	SREBRENIK	t	BA209906190002	209906190002	\N	EUR	30	0.00	\N	f	\N	1723831	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
edb03a4f-fe6c-455e-9c89-610ed7665673	00000000-0000-0000-0000-0000000a5b71	3723895	ANIKA TRANS Krzysztof Strzala Anna Strzala s.p. Javna	company	PL	Spokojna 14	08300	Sokolow Podlaski	t	PL823139908	823139908	\N	EUR	60	0.00	\N	f	\N	3723895	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
06ed76d7-6736-4b37-951a-8362909ff1cd	00000000-0000-0000-0000-0000000a5b71	\N	ANIMAGO d.o.o.(HR)	company	HR	Miroslava Krle┼¥e 56	44320	Kutina	t	HR43502440645	43502440645	\N	EUR	60	0.00	\N	f	\N	6721259	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
45cf2109-1b05-4ebe-81f2-80ba9fc74089	00000000-0000-0000-0000-0000000a5b71	4001648	ANIMALIS, PREHRANA IN ZDRAVJE	company	SI	TR┼¢A┼áKA CESTA 135	1000	LJUBLJANA	t	SI92390722	\N	\N	EUR	0	0.00	\N	f	\N	4708583	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2fd7029d-0020-4b83-ace3-a3deb6795afc	00000000-0000-0000-0000-0000000a5b71	3734175	ANIMO D.O.O.	company	HR	Brajda 2	51000	Rijeka	t	HR75767375764	75767375764	\N	EUR	60	0.00	\N	f	\N	3734175	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3ceeba96-394e-4ae7-a5fc-9a1778cb40e4	00000000-0000-0000-0000-0000000a5b71	\N	ANJA BOLA s.p.	company	SI	Drofenikova ulica 015	3230	┼áentjur	t	SI12227129	12227129	8075522000	EUR	30	0.00	\N	f	\N	9101808	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1d9fcfad-f92c-4d06-aa33-da81b88c6fea	00000000-0000-0000-0000-0000000a5b71	\N	ANNI d.o.o.	company	SI	Motnica 007A	1236	Trzin	t	SI10456317	10456317	5330319000	EUR	30	0.00	\N	f	\N	9812998	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bb6f78f9-1a03-40eb-829f-d43022aac403	00000000-0000-0000-0000-0000000a5b71	1764604	ANO TRANS HELENA KOLAR S.P.	company	SI	Miklav┼íka ulica 012	2000	Maribor	t	SI54442877	54442877	3370089000	EUR	30	0.00	\N	f	\N	1764604	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2d6a413a-ed7c-4ed3-adf8-2a2f50c89b5b	00000000-0000-0000-0000-0000000a5b71	4016434	ANORA	company	DE	Bahnhofstr. 21	21629	NEU WULMSTORF	t	DE812995629	\N	\N	EUR	0	0.00	\N	f	\N	17309855	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b1b9bce8-2fa2-48af-a5f4-2e2a67c04321	00000000-0000-0000-0000-0000000a5b71	4016969	Ansali Italiana S.r.l.	company	IT	Via Varese, 1	20121	MILANO	t	IT01677300137	\N	\N	EUR	0	0.00	\N	f	\N	18281191	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8597e815-e1f5-45f4-a523-39fef40c2141	00000000-0000-0000-0000-0000000a5b71	3523681	ANSI TRANSPORT d.o.o.	company	SI	Na Plav┼¥u 049	4228	┼¢elezniki	t	SI11144076	11144076	6538495000	EUR	60	0.00	\N	f	\N	3523681	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
400733fd-c416-4d12-85ba-31203783e0f6	00000000-0000-0000-0000-0000000a5b71	\N	Test Prevoz d.o.o.	company	SI	\N	\N	\N	t	SI12345678	\N	\N	EUR	30	0.00	\N	f	\N	\N	\N	active	1	2026-06-09 20:53:44.378447+00	2026-06-09 20:53:44.378447+00	00000000-0000-0000-0000-0000000a5001	00000000-0000-0000-0000-0000000a5001	f	\N	\N	\N	\N	\N
8f62637f-432a-41b8-b397-6a82f8e93f45	00000000-0000-0000-0000-0000000a5b71	\N	ANSI TRANSPORT d.o.o.	company	SI	Na Plav┼¥u 049	4228	┼¢elezniki	t	SI11144076	11144076	6538495000	EUR	15	0.00	\N	f	\N	19315892	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
060d1ef8-a32e-48b8-92eb-755884423968	00000000-0000-0000-0000-0000000a5b71	4008533	Antares, s.r.o. (CZ-203)	company	CZ	Jakubske Namesti 109	60200	Brno	t	CZ49972456	\N	\N	EUR	0	0.00	\N	f	\N	7950292	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6697b609-bee7-4113-89a5-a0ef80911448	00000000-0000-0000-0000-0000000a5b71	4010745	Ante transporti d.o.o. (HR-191)	company	HR	Stjepana Sori─ça 46	23223	┼ákabrnja	t	HR59951260316	\N	\N	EUR	0	0.00	\N	f	\N	9037023	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
058de293-6624-4e1e-b980-cdc73292d375	00000000-0000-0000-0000-0000000a5b71	4000306	Anteya Consult LTD	company	BG	3 Kap. D.Spisarevski Blvd, fl.4 Office 406	1592	SOFIA	t	BG200340300	\N	\N	EUR	0	0.00	\N	f	\N	4148927	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ad3fc7df-715b-44c8-9c36-9cbd1864dbe0	00000000-0000-0000-0000-0000000a5b71	2639866	Anthentic Logistik G.m.b.H	company	AT	Mitterweg 13a	6336	Langkampfen	t	ATU57446213	U57446213	\N	EUR	45	0.00	\N	f	\N	2639866	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
82820b18-2504-4a07-b7a5-2f83f3401806	00000000-0000-0000-0000-0000000a5b71	4002363	ANTON BUTALA S.P.	company	SI	DRAGOVANJA VAS 30	8343	DRAGATU┼á	t	SI33723524	\N	\N	EUR	0	0.00	\N	f	\N	5005660	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
49d50523-d667-4838-8008-e1ca5c552573	00000000-0000-0000-0000-0000000a5b71	3673593	ANTON BUTALA s.p.	company	SI	Prilozje 010	8332	Gradac	t	SI33723524	33723524	3931366000	EUR	60	0.00	\N	f	\N	3673593	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2983a74c-5337-4d5d-a2f6-02493e0b499b	00000000-0000-0000-0000-0000000a5b71	3804874	ANTON GOR┼áE S.P.	company	SI	GORENJE GRADI┼á─îE 015	8350	DOLENJSKE TOPLICE	t	SI83715240	83715240	5829782	EUR	60	0.00	\N	f	\N	3804874	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
76eb6cbe-8ceb-46ed-99cf-b82c0bf7efa8	00000000-0000-0000-0000-0000000a5b71	2139332	ANTON GRA┼áI─î, Naklo, d.o.o.	company	SI	Polica 011	4202	Naklo	t	SI48864595	48864595	5642086000	EUR	30	0.00	\N	f	\N	2139332	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1ce80832-91ea-4114-8999-baabd6c18fc4	00000000-0000-0000-0000-0000000a5b71	871919	ANTON GRM S.P.	company	SI	SPODNJI HOTI─î 0040	1270	LITIJA	t	SI18962963	18962963	3080188	EUR	0	0.00	\N	f	\N	871919	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
585a44a1-3e29-4ada-87e4-8c3c823cafc6	00000000-0000-0000-0000-0000000a5b71	2369501	ANTON HRIBER┼áEK s.p.	company	SI	Gotovlje 071A	3310	┼¢alec	t	SI55105343	55105343	6198414000	EUR	30	0.00	\N	f	\N	2369501	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d49c7993-09d5-45d9-8154-3e8fa7cadfd9	00000000-0000-0000-0000-0000000a5b71	\N	ANTON HUTAR	company	SI	Lokve 63	8340	─îrnomelj	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	15772216	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8b68ba45-2455-4f56-be9f-a8702fcb2e93	00000000-0000-0000-0000-0000000a5b71	673164	ANTON KIRBI┼á S.P.	company	SI	PREPOLJE 40D	2206	MARJETA NA DRAVSKEM POLJU	f	\N	13025783	3619974	EUR	0	0.00	\N	f	\N	673164	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d93421b2-bf33-4b31-99dd-99b4afbe0829	00000000-0000-0000-0000-0000000a5b71	\N	ANTON KRAMARI─î	company	SI	Gradac 16	8330	Metlika	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	17117329	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8d633e6c-aeb8-4f9a-a715-a33711025ff4	00000000-0000-0000-0000-0000000a5b71	\N	ANTON MERLAK S.P.	company	SI	Rovtarske ┼¢ibr┼íe 003	1373	Rovte	t	SI64668118	64668118	1029380000	EUR	60	0.00	\N	f	\N	4899503	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ab5e3c36-ea0b-485f-bf67-9fcc3941137a	00000000-0000-0000-0000-0000000a5b71	2700450	ANTON MIHAEL ILC S.P.	company	SI	Bukov┼íka ulica 004	1310	Ribnica	t	SI55918379	55918379	1830589000	EUR	60	0.00	\N	f	\N	2700450	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cfc5d577-95ad-4583-bf76-5a1d92b7d591	00000000-0000-0000-0000-0000000a5b71	\N	ANTON PA┼á─îINSKI S.P.	company	SI	PO┼¢ARNICE 078B	1351	BREZOVICA PRI LJUBLJANI	t	SI71070052	71070052	5558540000	EUR	30	0.00	\N	f	\N	5691228	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6ccb8733-035e-4afa-b330-d27eb09b6cc9	00000000-0000-0000-0000-0000000a5b71	1022551	ANTON PUSTOTNIK S.P. RADOMLJE	company	SI	PELECHOVA CESTA 085	1235	RADOMLJE	t	SI22604685	22604685	1556355000	EUR	0	0.00	\N	f	\N	1022551	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4861d907-b2a5-47ef-8b81-020c6afb56cd	00000000-0000-0000-0000-0000000a5b71	1916993	ANTON ROMIH S.P.	company	SI	LOVSKA ULICA 003	3250	ROGA┼áKA SLATINA	t	SI55252559	55252559	5138492	EUR	30	0.00	\N	f	\N	1916993	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
34e62a2c-6870-41b2-949f-36469802de0c	00000000-0000-0000-0000-0000000a5b71	1229615	ANTON ZELENIK s.p.	company	SI	SVETINCI 040A	2253	DESTRNIK	t	SI35481218	35481218	5575264	EUR	0	0.00	\N	f	\N	1229615	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
25adf4bb-4e07-4fdc-b9a1-37b8f832daa6	00000000-0000-0000-0000-0000000a5b71	442541	ANTONI D.O.O.  AJDOV┼á─îINA	company	SI	VIPAVSKA CESTA 006 A	5270	AJDOV┼á─îINA	t	SI59492864	59492864	5852862	EUR	0	0.00	\N	f	\N	442541	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b37505a0-88d3-419a-9e02-768b4e29f90d	00000000-0000-0000-0000-0000000a5b71	3819093	ANTONIO M├£LLER S.P.	company	SI	Ulica 21. oktobra 017A	8340	─îrnomelj	f	\N	86829378	6499562000	EUR	15	0.00	\N	f	\N	3819093	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ad26425a-9a23-4a83-9fbc-1e2a782312b1	00000000-0000-0000-0000-0000000a5b71	2440129	AN-TOR Transport i Spedycja(PL)	company	PL	Ul.Kolonia Nieszawa 3	87-730	NIESZAWA	t	PL8911005029	8911005029	\N	EUR	45	0.00	\N	f	\N	2440129	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2c767c7e-c6d6-4e4f-a236-2cd77a3d92ef	00000000-0000-0000-0000-0000000a5b71	\N	ANVINA, d.o.o., Vrhnika	company	SI	Cankarjev trg 006	1360	Vrhnika	t	SI21546177	21546177	5830141000	EUR	30	0.00	\N	f	\N	8387779	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5abf19ad-e22c-4025-9a7a-8e9ddf9a6f19	00000000-0000-0000-0000-0000000a5b71	3723646	ANZELJ TRANSPORT d.o.o.	company	SI	Rep─ìe 023	8210	Trebnje	t	SI57557926	57557926	6861873000	EUR	30	0.00	\N	f	\N	3723646	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e09d76e2-cc05-4aa0-8a61-5940a703e064	00000000-0000-0000-0000-0000000a5b71	\N	An┼¥e Junc s.p.	company	SI	Daljni Vrh 018	8000	Novo mesto	t	SI43627668	43627668	9254455000	EUR	30	0.00	\N	f	\N	15048299	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bb1f1b5c-0f89-4fa7-a665-c6321a08318b	00000000-0000-0000-0000-0000000a5b71	\N	AN┼¢E ┼áETINA S.P.	company	SI	Drulovka 043A	4000	Kranj	t	SI76205827	76205827	5565630000	EUR	30	0.00	\N	f	\N	6070798	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dbcc9b15-22f3-4e5c-8ff1-fdcf2502d28a	00000000-0000-0000-0000-0000000a5b71	4004101	AP Freight, s.r.o.	company	CZ	V rohu 434/3	142 00	Praha 4 - Libu┼í	t	CZ28819748	\N	\N	EUR	0	0.00	\N	f	\N	5692255	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fecd06dc-e452-4e2b-a5b2-bb8f9dbfcd64	00000000-0000-0000-0000-0000000a5b71	\N	AP GOST d.o.o.	company	SI	Stegne 011A	1000	Ljubljana	t	SI66599784	66599784	2312140000	EUR	30	0.00	\N	f	\N	7437740	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6b23c272-b5c7-40f3-b3a5-eab9dbcde5d6	00000000-0000-0000-0000-0000000a5b71	\N	AP LOGISTIKA, d.o.o.	company	SI	Humekova ulica 032	8270	Kr┼íko	t	SI57164118	57164118	3726541000	EUR	30	0.00	\N	f	\N	4513705	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
90064372-90d7-4f91-80d5-75a8b3db8357	00000000-0000-0000-0000-0000000a5b71	3434418	APEN d.o.o.	company	SI	Vodovodna cesta 097	1000	Ljubljana	t	SI17332192	17332192	5777038000	EUR	30	0.00	\N	f	\N	3434418	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
777b5397-1b7e-4a19-a978-63cd3b62b407	00000000-0000-0000-0000-0000000a5b71	3530642	Apex GmbH Intern. Spedition	company	DE	Hansator 5	28217	Bremen	t	DE811906920	811906920	\N	EUR	60	0.00	\N	f	\N	3530642	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fd43c220-57d5-42d0-8f8f-00776c771be2	00000000-0000-0000-0000-0000000a5b71	\N	APHX d.o.o.	company	SI	Pol┼ínik 034	1272	Pol┼ínik	t	SI45608237	45608237	5759439000	EUR	30	0.00	\N	f	\N	18001407	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
528a8dfe-4126-4119-8956-6a802a3610ab	00000000-0000-0000-0000-0000000a5b71	\N	APP PAVO PERVAN Autoprijevoznik (hr)	company	HR	Nova─ìka 216	10040	Zagreb-Dubrava	t	HR97327941767	97327941767	\N	EUR	60	0.00	\N	f	\N	4212801	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7f47333a-6c27-4946-a8e7-96f3993386d8	00000000-0000-0000-0000-0000000a5b71	\N	APPLE FARM Sp. z o.o. (PL-616)	company	PL	┼¢olnierzy i Armil Wojska Polskiego 13	81383	GDYNIA	t	PL5862285606	5862285606	\N	EUR	60	0.00	\N	f	\N	7573776	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
34ed179b-59d2-4186-80fc-582e657a51f1	00000000-0000-0000-0000-0000000a5b71	3460320	1A AVTO d.o.o.	company	SI	┼¢IGONOVA ULICA 004	1000	LJUBLJANA	t	SI38219522	38219522	2124831000	EUR	30	0.00	\N	f	\N	3460320	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-13 16:36:25.269346+00	\N	00000000-0000-0000-0000-0000000a5001	f	\N	\N	\N	\N	041 555 123
d366b3fa-4cfa-4795-92e7-5e8c7adc5d5d	00000000-0000-0000-0000-0000000a5b71	1943903	APR BALKAN CARGO (RS-688)	company	RS	LJUBI─å 552	32000	─îA─îAK	t	RS107723483	107723483	\N	EUR	30	0.00	\N	f	\N	1943903	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f7997af9-9e3a-4e2a-a87f-2ac921b3ee6b	00000000-0000-0000-0000-0000000a5b71	4009774	apriori transport (DE-276)	company	DE	Lochm├╝hle 5	88239	Wangen im Allg├ñu	t	DE815475035	\N	\N	EUR	0	0.00	\N	f	\N	8112723	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dfef5bc5-c89b-49e5-a9d4-866a0660a9c3	00000000-0000-0000-0000-0000000a5b71	\N	apSedlar-LOG  j.d.o.o. (hr)	company	HR	G. Horvat 8	42000	Vara┼¥din	t	HR01658048339	01658048339	\N	EUR	60	0.00	\N	f	\N	5371818	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
eb4bd4b7-34ef-4479-b757-39d9f0902982	00000000-0000-0000-0000-0000000a5b71	4004441	Apta Medica	company	SI	Likozarjeva ulica 6	1000	LJUBLJANA	t	SI98346962	98346962	\N	EUR	0	0.00	\N	f	\N	5875124	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ad2e3fd4-e3e0-4407-a706-a1e17e65fdb8	00000000-0000-0000-0000-0000000a5b71	1773227	AQUILA PART PROD COM S.R.L.	company	RO	PLOIESTI, STR.MALU ROSU 105A	105600	PRAHOVA	t	RO6484554	6484554	\N	EUR	30	0.00	\N	f	\N	1773227	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3b970519-1093-4819-b837-1dc313b92787	00000000-0000-0000-0000-0000000a5b71	4011140	Aramis System Sp. z o.o. (PL-616)	company	PL	ul. Krzywda 17E	30-720	Krak├│w	t	PL6793020175	\N	\N	EUR	0	0.00	\N	f	\N	9437552	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a69507ff-7492-46c9-b26e-c674c6216acb	00000000-0000-0000-0000-0000000a5b71	4016613	Arcese Deutschland GmbH	company	DE	Bernhard-G├╝nther-Stra├ƒe 6	50735	K├Âln	t	DE142772666	\N	\N	EUR	0	0.00	\N	f	\N	17689706	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
955421ff-1085-460b-85f6-30028d500740	00000000-0000-0000-0000-0000000a5b71	4002123	Arcese Deutschland GmbH	company	DE	Robert-Bosch-Stra├ƒe 5	78224	SINGEN	t	DE142772666	\N	\N	EUR	0	0.00	\N	f	\N	4893984	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
29d6bc04-3384-4b8d-aee7-56e531d0feff	00000000-0000-0000-0000-0000000a5b71	4001713	Arcese Deutschland GmbH (DE)	company	DE	Edsel-Ford-Stra├ƒe 2-14	50769	K├Âln	t	DE142772666	\N	\N	EUR	0	0.00	\N	f	\N	4700510	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
64adff5f-a577-443a-b2be-7c7d04376c44	00000000-0000-0000-0000-0000000a5b71	1002675	ARCESE TRASPORTI S.P.A.	company	IT	Via Aldo Moro 95	38062	Arco (TN)	t	IT00122680226	00122680226	\N	EUR	60	0.00	\N	f	\N	1002675	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d738f56e-6ae6-47f4-8bf8-8b56cef81277	00000000-0000-0000-0000-0000000a5b71	4008022	ARCO Transport&Logistics B.V.(NL-528)	company	NL	Hazeldonk 6284	4836 LG	Breda	t	NL802907581B01	\N	\N	EUR	0	0.00	\N	f	\N	7575559	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
34c8b697-832e-452d-8aa6-b29462377aa6	00000000-0000-0000-0000-0000000a5b71	2911263	ARENA┼áPED d.o.o.	company	SI	Tr┼¥a┼íka cesta 053	2000	Maribor	t	SI67733638	67733638	5518806000	EUR	60	0.00	\N	f	\N	2911263	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e023cc25-3cc9-471c-b1b8-742f12ad88cf	00000000-0000-0000-0000-0000000a5b71	4006543	ARFA SERVICES d.o.o.	company	HR	Vrtni put 5	10000	ZAGREB	t	HR34030497273	\N	\N	EUR	0	0.00	\N	f	\N	6549494	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ba79d729-ccfb-4661-b7f8-c0786b4bb738	00000000-0000-0000-0000-0000000a5b71	\N	ARGENTINO d.o.o.	company	SI	┼ámartinska cesta 152	1000	Ljubljana	t	SI50378635	50378635	2349337000	EUR	30	0.00	\N	f	\N	6720526	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cab5f6a0-a2ac-42ff-b586-538f7ae4b065	00000000-0000-0000-0000-0000000a5b71	4013214	ARIESSA d.o.o.	company	SI	Ljubljanska cesta 6,	3000	CELJE	t	SI85257397	\N	\N	EUR	0	0.00	\N	f	\N	11479857	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
11fd9542-4b7e-4148-bb82-3c44c6da3737	00000000-0000-0000-0000-0000000a5b71	4001337	Arijela d.o.o.	company	SI	Celjska cesta 8a	3310	┼¢ALEC	t	SI84051892	\N	\N	EUR	0	0.00	\N	f	\N	4557533	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9a2ad4aa-fb04-4f6f-af60-1bffad85e9b5	00000000-0000-0000-0000-0000000a5b71	2378594	ARKIT USLUGI TRANSPORTOWE	company	PL	UL.TENCZYNSKA 41	32566	ALWERNIA	t	PL6761006924	6761006924	\N	EUR	30	0.00	\N	f	\N	2378594	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
409e0f69-21e9-4735-b4ba-706dca044d74	00000000-0000-0000-0000-0000000a5b71	\N	ARKO d.o.o.	company	SI	Pre┼íernova ulica 025	9240	Ljutomer	t	SI20809875	20809875	5407354000	EUR	30	0.00	\N	f	\N	6930455	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4c504442-95a4-402e-b5ab-ce1692fd1cd0	00000000-0000-0000-0000-0000000a5b71	4011241	ARKO SHIPPING d.o.o.	company	SI	Ankaranska cesta 5	6000	KOPER	t	SI92987664	\N	\N	EUR	0	0.00	\N	f	\N	9557212	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
aeb93c5e-a9ca-49da-9636-1690eb9377e3	00000000-0000-0000-0000-0000000a5b71	\N	ARKON sp z.o.o.	company	PL	Jagodowa 7	86005	Zielonka	t	PL8883065509	8883065509	\N	PLN	30	0.00	\N	f	\N	18576046	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0a0a3bd8-6a6b-4607-97f9-695e89b45771	00000000-0000-0000-0000-0000000a5b71	\N	ARKUS &ROMET Group Sp.zo.o.(pl)	company	PL	Podgrodzie 32c	39200	DEBICA	t	PL8722235254	8722235254	\N	EUR	60	0.00	\N	f	\N	6184239	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
54bdfb95-bf0a-4823-9c7a-fcab27cd64f7	00000000-0000-0000-0000-0000000a5b71	4001822	Arla Foods Deutschland Gmbh, Andrea  Fassmers	company	DE	Wahlerstarsse 2	40472	D├╝sseldorf	t	DE813704041	\N	\N	EUR	0	0.00	\N	f	\N	4748991	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
68ee5ba7-f1fd-4190-9f3e-4be5bb2e8c5c	00000000-0000-0000-0000-0000000a5b71	2163290	ARMED d.o.o. ─îrnomelj	company	SI	Vodnikova ulica 004	8340	─îrnomelj	t	SI19185537	19185537	5579309000	EUR	30	0.00	\N	f	\N	2163290	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
af6939ff-e0e0-4c6d-bca0-0c466b593b3d	00000000-0000-0000-0000-0000000a5b71	2708148	ARMENSA TEAM d.o.o.	company	BA	ul.┼áabana Zahirovi─ìa	75000	TUZLA	t	BA4209093740000	4209093740000	\N	EUR	60	0.00	\N	f	\N	2708148	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9a52636a-4a0d-4b44-b49f-5070fd81dd57	00000000-0000-0000-0000-0000000a5b71	2085223	AROUND RUXSO s.r.l.	company	RO	CART.MICALACA	310025	ARAD	t	RO21086919	21086919	\N	EUR	30	0.00	\N	f	\N	2085223	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f71ab965-0cb7-444d-8909-31d0c33764f6	00000000-0000-0000-0000-0000000a5b71	2392196	ARPAD JUHOS-JUHOS-FRIGOTRANSPORT	company	SK	CINTORINSKA 263/9	93021	JAHODNA	t	SK1020252761	1020252761	\N	EUR	30	0.00	\N	f	\N	2392196	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4d8c8607-e925-4f99-b0ee-0d7ef9d46062	00000000-0000-0000-0000-0000000a5b71	\N	ARRA Group Spolka (pl)	company	PL	Piastzowska 5	67200	GLOGOW	t	PL6932176226	6932176226	\N	EUR	60	0.00	\N	f	\N	5554358	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6f88eec3-f4b9-4b3f-8a95-8c8ebb302be1	00000000-0000-0000-0000-0000000a5b71	2243920	Arredamenti Falegnameria Stopar di Robert Stopar	company	IT	38/b V.San Cilino	34128	Trieste	t	IT01223590322	01223590322	\N	EUR	30	0.00	\N	f	\N	2243920	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3f952114-81f7-451a-a7a0-eb9046acd0f6	00000000-0000-0000-0000-0000000a5b71	4015787	Arrslog d.o.o.	company	HR	Ulica bra─çe Radi─ça 27 Kunovec	48314	Koprivni─ìki Ivanec	t	HR20246776105	\N	\N	EUR	0	0.00	\N	f	\N	15832633	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6549c94a-cc88-4f0e-9900-d392f526c717	00000000-0000-0000-0000-0000000a5b71	\N	ARSA, FADIL SULJAKOVI─å S.P.	company	SI	Ulica bratov U─ìakar 024	1000	Ljubljana	t	SI81022468	81022468	1083830000	EUR	60	0.00	\N	f	\N	4043709	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
932b3965-4bdf-4321-8388-6b8c86735f51	00000000-0000-0000-0000-0000000a5b71	689002	Arsen Bari─ì s.p.	company	SI	┼¢elezni─ìarska cesta 8	8340	─îrnomelj	f	\N	\N	\N	EUR	0	0.00	\N	f	\N	689002	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3a7d3a21-0438-4d92-b907-be3cd6203d87	00000000-0000-0000-0000-0000000a5b71	547967	ART D.O.O. METLIKA	company	SI	─îRNOMALJSKA CESTA 0001	8330	METLIKA	t	SI65148070	65148070	5430950000	EUR	0	0.00	\N	f	\N	547967	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
268e6744-3a62-46df-8ba0-29db029b2fd3	00000000-0000-0000-0000-0000000a5b71	1117226	ARTCOM ARTUR FORNAZARI─î S.P.	company	SI	ULICA 9. MAJA 015	5000	NOVA GORICA	t	SI49785451	49785451	5336219	EUR	0	0.00	\N	f	\N	1117226	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
480b0099-563e-491d-95c9-8caf6eafccbd	00000000-0000-0000-0000-0000000a5b71	1117177	ARTCOM TRANS d.o.o.	company	SI	ULICA 9. MAJA 015	5000	NOVA GORICA	t	SI51931893	51931893	3293483000	EUR	30	0.00	\N	f	\N	1117177	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
50cd957b-3b0a-482f-86ed-04095ae21fe8	00000000-0000-0000-0000-0000000a5b71	2985126	ARTEJ GLOJEK S.P.	company	SI	┼ámartno ob Paki 038A	3327	┼ámartno ob Paki	t	SI35889659	35889659	1473662000	EUR	60	0.00	\N	f	\N	2985126	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
af87c882-a83d-4798-ae10-92c180410b7d	00000000-0000-0000-0000-0000000a5b71	2454033	ARTEUS Sp.z.o.o.	company	PL	Robotnicza 1b	53607	WROCLAW	t	021918233	021918233	\N	EUR	30	0.00	\N	f	\N	2454033	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
21c28e3d-130f-4176-892a-05688af797b6	00000000-0000-0000-0000-0000000a5b71	4002351	ARTMED s.r.o.	company	SK	Lazovna 60	97405	BANSKA BYSTRICA	t	SK2021302657	\N	\N	EUR	0	0.00	\N	f	\N	4974758	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a37ac737-6bca-430e-9150-05443a667a07	00000000-0000-0000-0000-0000000a5b71	4010624	ART-SPEED s.r.o. ( CZ-203)	company	CZ	Krepice 76	691 65	K┼Öepice	t	CZ26919940	\N	\N	EUR	0	0.00	\N	f	\N	8967682	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ee3899f8-49a1-46db-b264-b15acd419605	00000000-0000-0000-0000-0000000a5b71	1473404	AS DOM┼¢ALE NADGRADNJE d.o.o.	company	SI	LJUBLJANSKA CESTA 001	1230	DOM┼¢ALE	t	SI85097799	85097799	2345056000	EUR	30	0.00	\N	f	\N	1473404	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c0c02b55-5f09-47b6-b515-669c5800ab1f	00000000-0000-0000-0000-0000000a5b71	4010309	AS Internationale Spedition Gm (DE-276)	company	DE	Industriestr. 60	49565	Bramsche	t	DE317179311	\N	\N	EUR	0	0.00	\N	f	\N	8641292	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9c2859e2-fb03-474f-9be2-14dc099a4633	00000000-0000-0000-0000-0000000a5b71	4015911	AS Logistik GmbH	company	AT	Rosa Jochmann-Gasse 15	2512	Traiskirchen	t	ATU58118245	\N	\N	EUR	0	0.00	\N	f	\N	16050754	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a0b7a04d-d24f-4721-b764-b189e1140f66	00000000-0000-0000-0000-0000000a5b71	3419633	ASATRANS d.o.o.	company	SI	Savska cesta 022	4000	Kranj	t	SI76358909	76358909	1864882000	EUR	30	0.00	\N	f	\N	3419633	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
eeda83b9-9443-4326-bbda-1f3a3772f487	00000000-0000-0000-0000-0000000a5b71	4002058	Ascherl-Noerpel GmbH & Co. KG	company	DE	Baubergerstra├ƒe 34	80992	M├╝nchen	t	DE295626634	295626634	\N	EUR	0	0.00	\N	f	\N	5360259	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6e7c1b3b-de98-4418-b5ab-e73476481af2	00000000-0000-0000-0000-0000000a5b71	2369479	ASERVIS d.o.o.	company	SI	Jenkova ulica 020	6230	Postojna	t	SI12885304	12885304	5402832000	EUR	30	0.00	\N	f	\N	2369479	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dbb19040-2125-493f-9d29-819d3119f4b6	00000000-0000-0000-0000-0000000a5b71	4004649	ASG export-import spol. s r.o.	company	CZ	Na Chmelnicich 1691/67	32300	Plze┼ê	t	CZ26382041	26382041	\N	EUR	0	0.00	\N	f	\N	5985527	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b304d147-3f71-4bfa-95c6-6d3a438de32b	00000000-0000-0000-0000-0000000a5b71	1599806	ASK LOGISTIK LTD (BG-100)	company	BG	214 VASIL LEVSKI STR.	4003	PLOVDIV	t	BG115921591	115921591	\N	EUR	30	0.00	\N	f	\N	1599806	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cf92e708-cb68-4901-a4df-79d0ddd88cc9	00000000-0000-0000-0000-0000000a5b71	3483317	ASK TRANSPORT LTD (BG)	company	BG	214,Vasil Levski str.	4003	PLOVDIV	t	BG202357355	202357355	\N	EUR	60	0.00	\N	f	\N	3483317	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4de605aa-c221-4e10-b9af-65e9edeb2d9d	00000000-0000-0000-0000-0000000a5b71	\N	ASKO Assekuranzmakler Gmbg (at-040)	company	AT	Egerbach 58a	6334	SCHWOICH	t	ATU65436744	U65436744	\N	EUR	30	0.00	\N	f	\N	5517319	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6554141a-68aa-4c04-93aa-7805065169ff	00000000-0000-0000-0000-0000000a5b71	2154585	ASPA-TRANS NEMZETKOZI	company	HU	LOCSEI U.21-25	2143	KISTARCSA	t	HU24432472213	24432472213	\N	EUR	30	0.00	\N	f	\N	2154585	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fe2d86b8-89ad-40ae-9712-c3929c97ca0c	00000000-0000-0000-0000-0000000a5b71	3291631	ASPED d.o.o.	company	SI	Ajba 003A	5213	Kanal	t	SI21685495	21685495	3309622000	EUR	60	0.00	\N	f	\N	3291631	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3e6c2444-2333-4986-b162-4bdb17932cdf	00000000-0000-0000-0000-0000000a5b71	108	A-SPRINT d.o.o.	company	SI	┼¢elezni─ìarska cesta 28	SI-8340	─îrnomelj	t	SI45598711	45598711	\N	EUR	0	0.00	\N	f	\N	2846219	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5efb2bb3-20d5-4989-a887-0b29647f6a0a	00000000-0000-0000-0000-0000000a5b71	4003836	A-SPRINT d.o.o. (hr-191)	company	HR	Novo naselje 100, Bogovi─çi	51511	MALINSKA	t	HR66212302873	66212302873	\N	EUR	0	0.00	\N	f	\N	5589877	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9fb6b05b-9140-4f4c-a49c-fca16aa25776	00000000-0000-0000-0000-0000000a5b71	480330	A-SPRINT D.O.O.-PLA─îILA Z KARTICO-NI FAKTURE	company	SI	┼¢ELEZNI─îARSKA CESTA 28	8340	─îRNOMELJ	t	SI45598711	45598711	2113996000	EUR	0	0.00	\N	f	\N	480330	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0ac41792-a41d-44bd-a43c-95bef6448b1b	00000000-0000-0000-0000-0000000a5b71	4008201	A-SPRINT TEHNIKA, trgovsko in	company	SI	┼¢elezni─ìarska cesta 28	8340	─îRNOMELJ	t	SI60165847	60165847	\N	EUR	0	0.00	\N	f	\N	12199173	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
10addbb0-42e1-487d-b248-28b1695257d0	00000000-0000-0000-0000-0000000a5b71	\N	ASSA ABLOY SLOVENIJA d.o.o.	company	SI	Poslovna cona A 018	4208	┼áen─ìur	t	SI61339504	61339504	5529069000	EUR	30	0.00	\N	f	\N	15170046	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7db20f3b-2043-4e16-8135-76c0760da3d0	00000000-0000-0000-0000-0000000a5b71	2370629	ASSISTANCE CORIS d.o.o., Ljubljana	company	SI	Ulica bratov Babnik 010	1000	Ljubljana	t	SI67556639	67556639	5775582000	EUR	30	0.00	\N	f	\N	2370629	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3ffb980b-4bfc-4727-8057-7aa13d7c73ff	00000000-0000-0000-0000-0000000a5b71	2596316	ASSTRA DEUTSCHLAND GmbH	company	DE	Ihleburger Str. 4	39126	MAGDEBURG	t	DE814072390	814072390	\N	EUR	30	0.00	\N	f	\N	2596316	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
784ad4e6-da65-43bb-a51f-9bd17f3a7970	00000000-0000-0000-0000-0000000a5b71	4000003	Asstra Forwarding AG (CH-756)	company	CH	Bahnhofstrasse 37	8001	Z├╝rich	t	CH424794	424794	\N	EUR	0	0.00	\N	f	\N	4006244	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
59cdf38d-52d6-48fd-ae38-538da11a09ff	00000000-0000-0000-0000-0000000a5b71	4011673	Asstra Forwarding s.r.o.	company	CZ	Peka┼Ösk├í 695/10	15500	PRAHA 5	t	CZ24285641	\N	\N	EUR	0	0.00	\N	f	\N	9935517	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0664f2c7-90cd-41fc-85ce-fc67d458df5f	00000000-0000-0000-0000-0000000a5b71	4015450	Asstra Italia srl	company	IT	Via Alessandro Volta, 24	24069	TRESCORE BALNEARIO	t	IT02826120160	\N	\N	EUR	0	0.00	\N	f	\N	15296328	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
575e1b79-3939-40aa-b54d-4a25232cf9ab	00000000-0000-0000-0000-0000000a5b71	4007549	ASSTRA POLSKA SP.Z O.O. (PL-616)	company	PL	ul. Krakowiakow 34	02-256	WARSZAWA	t	PL8512740201	\N	\N	EUR	0	0.00	\N	f	\N	7199635	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c110a8fe-f946-4e11-b27e-57c7d7e93ef8	00000000-0000-0000-0000-0000000a5b71	4008399	AST Anna Gudzowska (PL-616)	company	PL	ul.Gwiazdowskiego 92	80-526	Gda┼äsk	t	PL5832522154	\N	\N	EUR	0	0.00	\N	f	\N	7888032	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a28c4871-f636-44e0-9dee-25d4ddf123ec	00000000-0000-0000-0000-0000000a5b71	\N	ASTA TREJD dooel ( MK-807)	company	MK	Oslo 22b	1000	Skopje	t	MK4030994219260	4030994219260	\N	EUR	30	0.00	\N	f	\N	9022713	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bb2d3328-41a4-49fe-ba0b-853a5dbb3198	00000000-0000-0000-0000-0000000a5b71	\N	ASTECH d.o.o.	company	SI	Obrtna cona Logatec 006A	1370	Logatec	t	SI95892621	95892621	1661078000	EUR	30	0.00	\N	f	\N	11614958	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
350f3177-8e81-4545-b04c-ae68803315e5	00000000-0000-0000-0000-0000000a5b71	\N	ASTILBA d.o.o.	company	SI	Kresnice 123	1281	Kresnice	t	SI71340769	71340769	5454468000	EUR	30	0.00	\N	f	\N	3847858	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0335e676-08b9-4b80-817f-1b26b056cd7f	00000000-0000-0000-0000-0000000a5b71	2231271	ASTRA SB d.o.o. (RS-688)	company	RS	PALIH BORACA 10	11271	SUR─îIN-BEOGRAD	t	RS100093386	100093386	\N	EUR	30	0.00	\N	f	\N	2231271	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3b722be9-7f82-4ca1-91a6-e5b5616a6595	00000000-0000-0000-0000-0000000a5b71	\N	AT TRUCK HALINA SUKIENNIK(PL)	company	PL	Brzeznicka 454-458	97500	RADOMSKO	t	PL7721344578	7721344578	\N	EUR	30	0.00	\N	f	\N	6911328	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d817300f-abe2-448e-8ea0-7b4e520c46fe	00000000-0000-0000-0000-0000000a5b71	\N	ATBCAR Joanna OTKA (PL-616)	company	PL	Marszalka Pilsudskiego 41 lokal104	43100	TYCHY	t	PL6462353948	6462353948	\N	EUR	60	0.00	\N	f	\N	6930433	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e960aafc-d50f-41c5-9dab-4b0ca4342f5b	00000000-0000-0000-0000-0000000a5b71	\N	A-TEE Trans Kft (HU-348)	company	HU	Hosok utca 64	2083	Solymar	t	HU24827751	24827751	\N	EUR	30	0.00	\N	f	\N	9565741	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3acca189-37f9-470f-b636-1425ddf4a6ca	00000000-0000-0000-0000-0000000a5b71	4000883	ATEGE Allgemeine Transportgese	company	DE	Carl-Benz Str. 11	60314	FRANKFURT	t	DE129290489	\N	\N	EUR	0	0.00	\N	f	\N	4290386	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
335ec4d6-0d10-418f-b452-ff08165323c1	00000000-0000-0000-0000-0000000a5b71	\N	ATG SALVI d.o.o.	company	SI	Hrenova ulica 024	1000	Ljubljana	t	SI66295955	66295955	1714635000	EUR	30	0.00	\N	f	\N	5644292	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3da7a962-d801-4f2d-9ce1-d399a721d9ea	00000000-0000-0000-0000-0000000a5b71	3301456	ATG ZUPAN d.o.o. Krmelj	company	SI	Krmelj 002B	8296	Krmelj	t	SI90924134	90924134	5785260000	EUR	30	0.00	\N	f	\N	3301456	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9d6cba5b-a5d5-4cab-a4cd-b3e54df8bb7d	00000000-0000-0000-0000-0000000a5b71	3012418	Atienza & G├│mez Logistics, S.L.	company	ES	C/Burgos, 14	03440	Ibi	t	ESB54334503	B54334503	\N	EUR	45	0.00	\N	f	\N	3012418	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e481723e-e4b2-4522-8574-d17e5fa11d93	00000000-0000-0000-0000-0000000a5b71	4010563	ATL Europe s.r.o (CZ-203)	company	CZ	Horicka 283/22	50002	HRADEC KRALOVE	t	CZ25925865	\N	\N	EUR	0	0.00	\N	f	\N	8835830	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cb77eeb7-582e-46d9-bd23-6c5d890399e8	00000000-0000-0000-0000-0000000a5b71	1425516	ATL Transport & Logistics e.U.	company	AT	Mauthausnerstrasse 11/4	4222	St. Georgen / Gusen	t	ATU64780801	ATU64780801	\N	EUR	30	0.00	\N	f	\N	1425516	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
068f6ace-e441-4ac6-81b7-73e27bae110b	00000000-0000-0000-0000-0000000a5b71	\N	ATLANTIS Sp.z o.o. (pl)	company	PL	Ledochowskiego 34	63400	Ostrow wielkopolski	t	PL6080103744	6080103744	\N	EUR	60	0.00	\N	f	\N	6590217	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b914b9ad-0384-4917-b2c1-0e76c9cf01fa	00000000-0000-0000-0000-0000000a5b71	4016939	ATLAS LOGISTIKA d.o.o.	company	HR	Gospodarska 2a	10431	Sveta Nedelja	t	HR86053855969	\N	\N	EUR	0	0.00	\N	f	\N	18257254	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
044db2b7-7310-4218-a268-6572af2127be	00000000-0000-0000-0000-0000000a5b71	3266858	ATM AG	company	SI	─îRNOMELJ	8340	─îrnomelj	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	3266858	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f20c73e0-b2e1-40d4-b2b1-4c7d33fdaf8c	00000000-0000-0000-0000-0000000a5b71	\N	ATM PLEVAN─î d.o.o.	company	SI	Gmajna 018	8274	Raka	t	SI27964060	27964060	6274749000	EUR	60	0.00	\N	f	\N	6230600	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
77dd044d-a9b4-474f-ab03-7ab95c1ddb06	00000000-0000-0000-0000-0000000a5b71	663937	ATMAN D.O.O.	company	SI	CESTA DVEH CESARJEV 40 C	1000	LJUBLJANA	t	SI33778019	33778019	5325811	EUR	0	0.00	\N	f	\N	663937	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4d58d999-3a6b-4494-8a9e-9a16ec9c8d02	00000000-0000-0000-0000-0000000a5b71	2336403	AT-MG TRANSPORT d.o.o.	company	RS	LJUBOMIRA NEDELJKOVI─åA 31A	18116	NI┼á	t	RS105713733	105713733	\N	EUR	30	0.00	\N	f	\N	2336403	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2603a580-6bc2-4aff-991c-e81b09288d11	00000000-0000-0000-0000-0000000a5b71	3047416	ATO Internationale Spedition GmbH Transport und Logistik	company	DE	Mangfallstra├ƒe 55	83026	Rosenheim	t	DE131167142	131167142	\N	EUR	60	0.00	\N	f	\N	3047416	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
302ba567-4c7d-48bd-80da-b2feed072dc9	00000000-0000-0000-0000-0000000a5b71	\N	ATOMIC SPED e.U. (AT-040)	company	AT	Floridusgasse 2/10/1/1	1210	Wien	t	ATU75968623	U75968623	\N	EUR	30	0.00	\N	f	\N	10532926	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3d7d1c74-2cf5-4377-b216-5bb83edbc415	00000000-0000-0000-0000-0000000a5b71	\N	ATOMIC-SPED d.o.o. (RS-688)	company	RS	Prvomajska 52	15000	┼áabac	t	RS111040511	111040511	\N	EUR	30	0.00	\N	f	\N	9812591	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bb57a71b-f0e4-414e-b125-ddbbf4aeb7a2	00000000-0000-0000-0000-0000000a5b71	\N	ATP Bogataj in partner d.n.o.	company	SI	Gr─ìarevec 011	1370	Logatec	t	SI74393596	74393596	3638227000	EUR	30	0.00	\N	f	\N	13693873	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e5732ad3-991f-4453-9d8e-0ddf5d9498b6	00000000-0000-0000-0000-0000000a5b71	4010748	ATR TRANS TADEJ ADAMI─î S.P.	company	SI	Urbanova ulica 18	1310	RIBNICA	t	SI36598798	\N	\N	EUR	0	0.00	\N	f	\N	11771593	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
06c32b23-92c2-45c4-b7b9-7c22d191539f	00000000-0000-0000-0000-0000000a5b71	\N	ATRADE Aleksander Jev┼íenak s.p.	company	SI	Bezina 096	3210	Slovenske Konjice	t	SI40862216	40862216	3546853000	EUR	30	0.00	\N	f	\N	5785396	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f62ddaf6-e356-4544-9a02-f59ca1b04698	00000000-0000-0000-0000-0000000a5b71	\N	ATV MOTO SHOP SRL	company	RO	Nr.Parcela 3/4/14, lot 34	1000	VIDRA	t	RO30875598	30875598	\N	EUR	30	0.00	\N	f	\N	19374610	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
936518bb-e08c-4aef-8426-aeb72a3ca920	00000000-0000-0000-0000-0000000a5b71	2326272	ATZ ANH├äNGER Ges.m.b.H.	company	AT	ST.JAKOBERSTRA├ƒE 40	9020	KLAGENFURT	t	ATU67832018	U67832018	\N	EUR	30	0.00	\N	f	\N	2326272	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7da3e0cb-fe55-416a-8c75-5ed4738f2b93	00000000-0000-0000-0000-0000000a5b71	651001	ATZLINGER TRANSPORT GMBH	company	AT	Bergsleithenstrasse 15	4643	Pettenbach	t	ATU51121600	ATU51121600	\N	EUR	0	0.00	\N	f	\N	651001	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d8010c8f-3798-4365-89c3-6916632cc0c7	00000000-0000-0000-0000-0000000a5b71	1486401	Augustin Freight GmbH	company	AT	Rettenbach 10a	6240	Radfeld	t	ATU64998015	U64998015	\N	EUR	30	0.00	\N	f	\N	1486401	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
67e19493-865d-4880-9202-ae8b4fcdbe19	00000000-0000-0000-0000-0000000a5b71	2173904	AUSTROCHEM d.o.o.	company	SI	Puchova ulica 005	1235	Radomlje	t	SI79826075	79826075	5405530000	EUR	30	0.00	\N	f	\N	2173904	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
81de2676-c7a9-456d-ad3d-e284e422b919	00000000-0000-0000-0000-0000000a5b71	1498642	AUTAMAROCCHI S.P.A.	company	IT	Riva Cadamosto 8/1	34147	Trieste	t	IT00686490327	00686490327	\N	EUR	30	0.00	\N	f	\N	1498642	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d713c2e1-665c-40b7-bca1-d0a76c6a1507	00000000-0000-0000-0000-0000000a5b71	\N	AUTO BAUMANN KG	company	DE	Meiertshofer str.11	93192	WALD	t	DE281274849	281274849	\N	EUR	30	0.00	\N	f	\N	15574313	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c833c8ec-a205-4369-96de-4f98c975380d	00000000-0000-0000-0000-0000000a5b71	\N	AUTO CITY 2015 LTD	company	BG	ULICA IVAN DIMITROV 14	6140	KRAN	f	BG203498063	BG203498063	\N	EUR	30	0.00	\N	f	\N	12808206	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
51eae53c-ba3b-471b-bb06-f3a4f20aef74	00000000-0000-0000-0000-0000000a5b71	\N	AUTO EUROPE d.o.o.	company	SI	Gerbi─ìeva ulica 110	1000	Ljubljana	t	SI47945044	47945044	8109826	EUR	30	0.00	\N	f	\N	6738842	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6e470ef2-1ffa-4808-9edc-9dc614d4bb8f	00000000-0000-0000-0000-0000000a5b71	\N	AUTO HRVATSKA prodajno servisni centri d.o.o.	company	HR	Mavra Schlengera 13	42204	Tur─ìin	t	HR87682591133	87682591133	\N	EUR	30	0.00	\N	f	\N	14839846	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7a0b417e-4a00-4afd-b31b-40b970899f30	00000000-0000-0000-0000-0000000a5b71	\N	AUTO MATI─å d.o.o.	company	HR	Gmajna 34	10291	Prigorje Brdove─ìko	t	HR28927378018	28927378018	\N	EUR	30	0.00	\N	f	\N	13599768	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
af748c19-43dd-4d25-b010-c5b135b935ce	00000000-0000-0000-0000-0000000a5b71	3416207	AUTO ORKA d.o.o.	company	HR	Savska cesta 15	10340	Vrbovec	t	HR83809469767	83809469767	\N	EUR	60	0.00	\N	f	\N	3416207	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
58616734-d500-4f59-8ce8-dfff404a24cd	00000000-0000-0000-0000-0000000a5b71	4012093	AUTO Pharma s.r.o.	company	SK	Vini─ìna 24	90027	BERNOLAKOVO	t	SK2024178167	\N	\N	EUR	0	0.00	\N	f	\N	10375481	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
31bd7e7a-b5f2-43ac-9102-7c08470f1eaf	00000000-0000-0000-0000-0000000a5b71	1413107	AUTO ROYAL	company	RS	AUTO PUT BR. 2	11070	NOVI BEOGRAD	t	RS133987006	133987006	\N	EUR	30	0.00	\N	f	\N	1413107	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dae1ca50-f9f3-42f1-bfa1-344b822889a2	00000000-0000-0000-0000-0000000a5b71	\N	AUTO SCHUNN s.r.l.	company	RO	Str.Santuhalm DN7	330004	Deva	t	RO6336590	6336590	\N	EUR	30	0.00	\N	f	\N	13883283	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8579bcd4-fe9a-42e0-b306-63e02c4956f4	00000000-0000-0000-0000-0000000a5b71	\N	AUTO SECURIT  (HU-348)	company	HU	Szentendrei ut 407	1039	Budimpe┼íta	t	HU12498750	12498750	\N	EUR	30	0.00	\N	f	\N	11308355	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
607fa94c-000b-4962-931b-a6cdff360d79	00000000-0000-0000-0000-0000000a5b71	3538148	AUTO TA─åI d.o.o. (hr)	company	HR	P. Mi┼íkine 70	42000	Vara┼¥din	t	HR96377177093	96377177093	\N	EUR	60	0.00	\N	f	\N	3538148	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c138de2d-0d4b-41d9-b36e-8e782c8e94f5	00000000-0000-0000-0000-0000000a5b71	2843830	Auto taxi prijevoz DOBRA VILA FRANI─å Josip	company	HR	Stjepana Radi─ça 174a	10000	SLAVONSKI BROD	t	HR71621059308	71621059308	\N	EUR	30	0.00	\N	f	\N	2843830	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d0aaa06f-4a05-4451-b1f0-dd7411397eed	00000000-0000-0000-0000-0000000a5b71	\N	AUTOCENTAR PROTULIPAC d.o.o. (HR-191)	company	HR	Naselje Roganac 2	47250	Duga Resa	t	HR18884411293	18884411293	\N	EUR	30	0.00	\N	f	\N	14243128	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a3c1c1cf-fc7c-44e3-b726-d9007e8086a1	00000000-0000-0000-0000-0000000a5b71	\N	AUTOCESTA RIJEKA-ZAGREB, d.d.	company	HR	Jadranska avenija 6	10250	Lu─ìko	t	HR96330310281	96330310281	\N	EUR	30	0.00	\N	f	\N	5860745	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6949c738-dc8f-4f19-8cde-e3ad8525c680	00000000-0000-0000-0000-0000000a5b71	3836888	AUTOCESTA ZAGREB-MACELJ d.o.o.	company	HR	Cari─çgradska 18	10000	Zagreb	t	HR82667270868	82667270868	\N	EUR	20	0.00	\N	f	\N	3836888	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7fa775ae-dc5f-4546-86ea-879d36f95788	00000000-0000-0000-0000-0000000a5b71	783803	AUTOCOMMERCE, D.O.O.	company	SI	BARAGOVA ULICA 005	1000	LJUBLJANA	t	SI75253992	75253992	1857282	EUR	0	0.00	\N	f	\N	783803	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
189cde51-4236-4030-8d24-198a3d410c91	00000000-0000-0000-0000-0000000a5b71	\N	AUTODOPRAVA  Rudolf JANO┼á Bratislava	company	SK	Estonska 2	82106	BRATISLAVA	t	SK1020149218	1020149218	\N	EUR	60	0.00	\N	f	\N	4486959	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
64c1f68d-df1e-489b-9fa7-71ff56989ed9	00000000-0000-0000-0000-0000000a5b71	\N	AUTOGRILL d.o.o.	company	SI	Turnerjeva ulica 035	2313	Fram	t	SI17036623	17036623	1934651000	EUR	30	0.00	\N	f	\N	4306761	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
16b36572-ace9-4036-88fa-a285698511a6	00000000-0000-0000-0000-0000000a5b71	\N	AUTOHAUS AHLSBERG GMBH	company	DE	Gonningerstr.66	72793	Pfullingen	t	DE263804604	263804604	\N	EUR	30	0.00	\N	f	\N	15827637	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cea4631f-8c2e-4540-9af3-4b3517c65e55	00000000-0000-0000-0000-0000000a5b71	\N	AUTOHAUS AUGUST HAHN Betr. GmbH	company	DE	Postfach 569	95205	Munchberg	t	DE132948243	132948243	\N	EUR	30	0.00	\N	f	\N	11018131	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3299e86d-ce7c-43a5-a57c-715501b9342e	00000000-0000-0000-0000-0000000a5b71	\N	AUTOHAUS PETER GMBH	company	DE	G├Âttinger Strasse 67	37154	Northeim	t	DE150368420	150368420	\N	EUR	30	0.00	\N	f	\N	13980725	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a684fbe6-2111-40ee-ab2f-c460df55572d	00000000-0000-0000-0000-0000000a5b71	\N	AUTOHAUS ROSIER GmbH	company	DE	Bornhardtstr.1	38644	Goslar	t	DE303695264	303695264	\N	EUR	30	0.00	\N	f	\N	13994762	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
438a815c-eae5-4e17-9f7f-003ae4757ae4	00000000-0000-0000-0000-0000000a5b71	\N	Autohaus Siebeihoff GmbH & Co. KG (DE-276)	company	AT	Postfach 211169	86171	Augsburg	t	DE254489339	254489339	\N	EUR	30	0.00	\N	f	\N	7776828	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1fdd4a5d-c061-444e-8b70-c56818154df7	00000000-0000-0000-0000-0000000a5b71	2052528	AUTO-MIX	company	PL	UL3 MAJA 70A	34-240	JORDANOW	t	PL7350017602	7350017602	\N	EUR	30	0.00	\N	f	\N	2052528	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
87963f29-050b-497f-866d-ea94aed371c5	00000000-0000-0000-0000-0000000a5b71	\N	AUTONET IMPORT d.o.o.	company	SI	Letali┼íka cesta 033F	1000	Ljubljana	t	SI67186807	67186807	6745784000	EUR	30	0.00	\N	f	\N	9188297	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ec0ea2a2-d82d-4cae-9bf6-5c28dbaf84d8	00000000-0000-0000-0000-0000000a5b71	\N	AUTOPREVOZ TERETNI PROMET d.o.o.(HR)	company	HR	P.KRE┼áIMIRA IV 1	20350	Metkovi─ç	t	HR50726700786	50726700786	\N	EUR	60	0.00	\N	f	\N	6458769	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2268d4f6-7837-4e7d-9044-1b4bea5550d1	00000000-0000-0000-0000-0000000a5b71	\N	Autoprevoz Terzi─ç ( RS-688)	company	RS	Karadjordjeva 51	36000	Kraljevo	t	\N	\N	\N	EUR	30	0.00	\N	f	\N	8383004	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ba915bf3-82aa-4536-8cbc-b020da709602	00000000-0000-0000-0000-0000000a5b71	1465673	AUTOPREVOZNIK  GRUJI─å NENAD	company	RS	KUZMINSKA 39	22000	SREMSKA MITROVICA	t	RS107221651	107221651	\N	EUR	30	0.00	\N	f	\N	1465673	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4d466c9f-82ea-431e-b96c-6062f3231e43	00000000-0000-0000-0000-0000000a5b71	\N	Autoprevoznik DIN SEV Sevojno (RS-688)	company	RS	Vi┼íeslava Bugarinovi─ìa 18/6/23	31205	Sevojno	t	RS110134831	110134831	\N	EUR	30	0.00	\N	f	\N	11573043	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e79eea57-5dc1-4728-bee7-6a960bd9c533	00000000-0000-0000-0000-0000000a5b71	\N	Autoprevoznik PAZOLA, vl.Pajo Lap─ìevi─ç	company	RS	Miroslava Anti─ça 180	22300	Stara Pazova	t	RS108366742	108366742	\N	EUR	30	0.00	\N	f	\N	10445445	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
90561c58-0740-415e-92f0-29fe6b35caae	00000000-0000-0000-0000-0000000a5b71	2002766	AUTOPREVOZNIK POPOVI─å GORAN	company	RS	MATIJE GUPCA 87	22240	┼áID	t	RS102531714	102531714	\N	EUR	30	0.00	\N	f	\N	2002766	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fec59106-05c5-48a1-94f3-79d2f25122df	00000000-0000-0000-0000-0000000a5b71	1298399	AUTOPREVOZNIK VINKO MILI─îEVI─å	company	BA	KOMARI 2	71260	KRE┼áEVO	t	BA19560641	19560641	\N	EUR	0	0.00	\N	f	\N	1298399	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c066bf9f-e9e3-460d-9f95-fa958b4800f8	00000000-0000-0000-0000-0000000a5b71	3407010	Autoprijevoz Kaji─ç	company	HR	Gornjostupni─ìka 5b	10255	Gornji Stupnik	t	HR00694421696	00694421696	\N	EUR	30	0.00	\N	f	\N	3407010	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6952e2d4-60ba-49c0-949e-29ce22e3791f	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoz MILI─å vl.ANTO MILI─å (HR)	company	HR	Nova─ìka cesta 57, Novaki	10431	Sveta Nedelja	t	HR84088468268	84088468268	\N	EUR	60	0.00	\N	f	\N	5371931	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fb86c1dd-d3bf-4de2-8801-d21cb3f10947	00000000-0000-0000-0000-0000000a5b71	503569	AUTOPRIJEVOZ MIRKO PREMU┼¢I─å I IRENA ZEBEC (BA-070)	company	BA	SV.LOVRE 2	42208	CESTICA	f	0508942320012	050894232001	\N	EUR	0	0.00	\N	f	\N	503569	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
48ff2a02-2173-4be3-8a3d-9e690526b8cf	00000000-0000-0000-0000-0000000a5b71	2602745	AUTOPRIJEVOZ PRINCIP (hr-191) Mijo Princip	company	HR	Vrbove─ìka 7	10360	SESVETE	t	HR88481864392	88481864392	\N	EUR	60	0.00	\N	f	\N	2602745	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e2fb369f-875c-42f4-acf5-65a20dea3493	00000000-0000-0000-0000-0000000a5b71	\N	AUTOPRIJEVOZ RISEK vl. Dario Risek (HR-191)	company	HR	D.┼áemnica 284	49000	Krapina	t	HR68823049213	68823049213	\N	EUR	60	0.00	\N	f	\N	12323387	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
30778191-4d2c-4bd0-85af-b3451678dce7	00000000-0000-0000-0000-0000000a5b71	1643559	AUTOPRIJEVOZNI─îKI OBRT KONTREC (hr)	company	HR	A.KOVA─îI─åA 29	43000	BJELOVAR	t	HR36559498404	36559498404	\N	EUR	30	0.00	\N	f	\N	1643559	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4c63cea7-29cb-43b7-8127-8a3d9c9fde46	00000000-0000-0000-0000-0000000a5b71	2632196	Autoprijevozni─ìki obrt ┼áIMUNOVI─î Mladen	company	HR	Donji Marinkovac 30	10342	DUBRAVA	t	HR39032269902	39032269902	\N	EUR	60	0.00	\N	f	\N	2632196	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f422374b-ee3f-4fc3-a371-88a5e7997825	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevozni─ìki obrt vl. Drago Erjavec (hr)	company	HR	Gornji Miklou┼í 19	43240	─îazma	t	HR38809085361	38809085361	\N	EUR	60	0.00	\N	f	\N	4734001	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
39efe269-ffe8-4659-9684-748e29d26120	00000000-0000-0000-0000-0000000a5b71	2376707	AUTOPRIJEVOZNI─îKI OBRT,vl. ┼¢ELJKO PALIJAN	company	HR	A.HEBRANGA 49	43000	BJELOVAR	t	HR61045739425	61045739425	\N	EUR	30	0.00	\N	f	\N	2376707	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1e6e1df0-cbaa-4b83-b4f3-f8b8647d1c2e	00000000-0000-0000-0000-0000000a5b71	4014068	Autoprijevoznik Dubravko ┼árajb	company	HR	Hallerova aleja 36	42000	VARA┼¢DIN	t	HR18678935300	\N	\N	EUR	0	0.00	\N	f	\N	12632720	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5571d5fb-ac0f-4a55-a547-9f75f9ff28c3	00000000-0000-0000-0000-0000000a5b71	4002860	AUTOPRIJEVOZNIK DUBRAVKO ┼áVALE	company	HR	Vinogradska bb	44319	REPU┼áNICA	t	HR80318536616	\N	\N	EUR	0	0.00	\N	f	\N	5223772	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ebe09c9c-0492-4708-a9eb-2cce6093d8dc	00000000-0000-0000-0000-0000000a5b71	\N	AUTOPRIJEVOZNIK ─ÉURO PAVELI─å (HR-191)	company	HR	M.Gupca 80	35250	Oriovac	t	HR85689581458	85689581458	\N	EUR	30	0.00	\N	f	\N	9264117	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3e71a817-ef5d-4000-b9e7-a54c9bf8eb7a	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoznik GORAN BEVANDA (hr)	company	HR	Dunavska 2	10040	Zagreb-Dubrava	t	HR20471128754	20471128754	\N	EUR	60	0.00	\N	f	\N	4748505	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
73faf213-d1d4-4fb7-978a-4bc6c9193b2f	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoznik Goran ─îuljak (HR-191)	company	HR	Ja─ìkovina 19	10000	Zagreb	t	HR17962844425	17962844425	\N	EUR	30	0.00	\N	f	\N	12739858	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
95d96b6a-354f-441b-9d32-fa714c8fd5f9	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoznik Ivan MILO┼á (hr)	company	HR	Petrovac 8	31512	Feri─ìanci	t	HR05380330833	05380330833	\N	EUR	60	0.00	\N	f	\N	4769655	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1a0f48dc-d696-43bf-bb5a-eed3a7cfcb92	00000000-0000-0000-0000-0000000a5b71	3211491	AUTOPRIJEVOZNIK IVAN VIDOVI─å (HR-191)	company	HR	Ante Kova─ìi─ça 1	49250	ZLATAR	t	HR67427165302	67427165302	\N	EUR	60	0.00	\N	f	\N	3211491	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
612b1de9-5340-4b89-9902-e5358a917bf3	00000000-0000-0000-0000-0000000a5b71	4016683	Autoprijevoznik Mario Jakoti─ç	company	HR	Dobre─ç 33	51415	LOVRAN	t	HR43441404306	\N	\N	EUR	0	0.00	\N	f	\N	17851525	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1b880f60-bb5d-4754-a945-9a9afcbe7097	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoznik Martinjak Milan (hr)	company	HR	Tuhelj 93	49215	Tuhelj	t	HR59017867722	59017867722	\N	EUR	60	0.00	\N	f	\N	6505531	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5aa9280d-348a-4aea-bb3d-e80072089f00	00000000-0000-0000-0000-0000000a5b71	2701836	Autoprijevoznik Matija Martincevic	company	HR	Dravska 23a	42202	Trnovec	t	HR23784565198	23784565198	\N	EUR	60	0.00	\N	f	\N	2701836	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
83e82232-e5f0-4800-91a8-17dd78373090	00000000-0000-0000-0000-0000000a5b71	3836894	AUTOPRIJEVOZNIK Mladen MAJSTOROVI─å (hr)	company	HR	Petra Perice 38	21300	Makarska	t	HR83454198823	83454198823	\N	EUR	60	0.00	\N	f	\N	3836894	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3e837c09-3355-43b9-9008-5d262873e03c	00000000-0000-0000-0000-0000000a5b71	1150238	AUTOPRIJEVOZNIK NINE GAVRANOVI─î	company	HR	M.GUPCA 51	10290	ZAPRE┼áI─î	f	\N	\N	\N	EUR	0	0.00	\N	f	\N	1150238	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a09657d0-5caa-414b-ba04-3fa2facc4453	00000000-0000-0000-0000-0000000a5b71	\N	AUTOPRIJEVOZNIK obrt vl.Dario Kova─ìevi─ç	company	HR	Galovac 225	43000	Bjelovar	t	HR94578264893	94578264893	\N	EUR	30	0.00	\N	f	\N	17396316	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b7578f28-f175-4fc0-93e6-454c4742d746	00000000-0000-0000-0000-0000000a5b71	\N	AUTOPRIJEVOZNIK SAMIR POSAVEC	company	HR	J.┼á.SLAVENSKOG 16C	40305	Nedeli┼í─çe	t	HR96122357516	96122357516	\N	EUR	30	0.00	\N	f	\N	15739385	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0420bb96-a616-4019-99fe-5eee3e4ff756	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoznik Sini┼ía VINCEKOVI─å (HR-191)	company	HR	Bra─ìe Radi─ça 138	42000	Vara┼¥din	t	HR89314901708	89314901708	\N	EUR	60	0.00	\N	f	\N	7327503	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2f0be95a-c286-4c05-bfcd-04521cfaf37d	00000000-0000-0000-0000-0000000a5b71	3044604	AUTOPRIJEVOZNIK SLAVKO KLINEC	company	HR	I.GUNDULI─îA 4	40000	─îAKOVEC	t	HR87229572641	87229572641	\N	EUR	60	0.00	\N	f	\N	3044604	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
927bf042-f5c6-4f94-8214-7fc05d044184	00000000-0000-0000-0000-0000000a5b71	4016463	AUTOPRIJEVOZNIK SLAVKO LOVRI─å	company	HR	Grebengradska ulica 10	42220	NOVI MAROF	t	HR75454525840	\N	\N	EUR	0	0.00	\N	f	\N	17395876	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5a0ada3c-bbb1-4afb-85a7-3493170d06e4	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoznik ┼áPIRO UVODI─å (HR-191)	company	HR	Kosa-Uvodi─çi 4	21231	Klis	t	HR61875215807	61875215807	\N	EUR	30	0.00	\N	f	\N	11130754	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dff53f94-9e72-4f57-a0bd-ca8bd25663c3	00000000-0000-0000-0000-0000000a5b71	3356141	Autoprijevoznik Tomislav BALA┼¢INEC	company	HR	Gornja Poljana 82	42223	Vara┼¥dinske Toplice	t	HR78131970792	78131970792	\N	EUR	60	0.00	\N	f	\N	3356141	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
18794874-e9a5-4c34-8818-4838e621fa8e	00000000-0000-0000-0000-0000000a5b71	\N	Autoprijevoznik vl. Tomislav UDOV─îI─å (HR-191)	company	HR	Hrvatskih branitelja 46	10434	Strmec	t	HR99813276287	99813276287	\N	EUR	60	0.00	\N	f	\N	7363533	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
64d0b7fe-9a81-4e06-b112-b3846b4cd697	00000000-0000-0000-0000-0000000a5b71	2271614	AUTOPRIJEVOZNIK ZVONIMIR JU┼áINSKI (HR-191)	company	HR	LISTOPADSKA 13	10000	ZAGREB	t	HR95797784471	95797784471	\N	EUR	30	0.00	\N	f	\N	2271614	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
39ea0c7f-028a-46b4-8f70-dd9eaa3ecc4e	00000000-0000-0000-0000-0000000a5b71	1828482	AUTOPRIJEVOZNIK,vl.Velid Merzi─ç	company	BA	SREBRENI─îKA 17	74260	TE┼áANJ	t	BA431941679000	431941679000	\N	EUR	45	0.00	\N	f	\N	1828482	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
487b9a97-0511-45a6-ad6e-9cf3ef8b3dad	00000000-0000-0000-0000-0000000a5b71	4007564	Auto┼íkola Faca d.o.o. (HR-191)	company	HR	Alojzija Stepinca 198	32100	VINKOVCI	t	HR57577669302	\N	\N	EUR	0	0.00	\N	f	\N	7183254	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2b620f72-207d-4301-970b-b46884b1a91e	00000000-0000-0000-0000-0000000a5b71	2999523	Autotrans ─îU─îEK d.o.o.	company	HR	Polje Krapinsko 96	49000	KRAPINA	t	HR63324866990	63324866990	\N	EUR	60	0.00	\N	f	\N	2999523	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
337b4eac-f334-476d-96d8-503b551653d1	00000000-0000-0000-0000-0000000a5b71	2644707	AUTOTRANS DI CANTARUTTI GIULIANO & C.S.A.S.	company	IT	Via VITTORIO VENETO 75 CP 96	34170	GORIZIA	t	IT00408750313	00408750313	\N	EUR	60	0.00	\N	f	\N	2644707	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7c0bebfb-54f0-42c4-815f-3819dd38011f	00000000-0000-0000-0000-0000000a5b71	4010187	AUTOTRANS GP SP. Z O.O.	company	PL	Klodzka 10	62800	KALISZ	t	PL6182150440	\N	\N	EUR	0	0.00	\N	f	\N	8410622	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
177ff7b1-fa9b-4276-a103-a60e9d2a0680	00000000-0000-0000-0000-0000000a5b71	\N	AUTO-TRANSPORT D.M.D.(hr) VL. Davor Hajtud	company	HR	Zagreba─ìka 51	49253	Lobor	t	HR54320067192	54320067192	\N	EUR	60	0.00	\N	f	\N	5633480	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1792bb20-1d57-4d51-87b5-9c5bf22548f7	00000000-0000-0000-0000-0000000a5b71	\N	Autotransporti MAJNI─å-VL. Marijan Majni─ç (hr)	company	HR	Zavrtna 10	40317	Podturen	t	HR37302641394	37302641394	\N	EUR	60	0.00	\N	f	\N	4231143	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a8c8f413-e589-4ee7-8ee0-f9c3ecb80c5e	00000000-0000-0000-0000-0000000a5b71	2115487	Autotransporti Vrhovac d.o.o.	company	BA	┼átrbe bb	78240	─îelinac	f	BA403518170009	403518170009	\N	EUR	30	0.00	\N	f	\N	2115487	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a099d9e8-f783-465b-b815-090f113cc53a	00000000-0000-0000-0000-0000000a5b71	\N	AUTRE CARGO d.O.O. (HR-191)	company	HR	bRANIMIROVA 32	42202	Trnovec Bartolove─ìki	t	HR91932062841	91932062841	\N	EUR	30	0.00	\N	f	\N	8095062	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
96e87bd8-e5ca-4432-85f5-91a2a8eb38be	00000000-0000-0000-0000-0000000a5b71	\N	AV Production, Alja┼¥ Vidmar s.p.	company	SI	Nova loka 008	8340	─îrnomelj	f	\N	25515683	7012535000	EUR	30	0.00	\N	f	\N	10196559	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7eef1a4d-7178-463e-9d39-4be7eed6f4a4	00000000-0000-0000-0000-0000000a5b71	758550	AV STUDIO D.O.O.	company	SI	KORO┼áKA CESTA 0055	3320	Velenje	t	SI41565070	41565070	1469134000	EUR	0	0.00	\N	f	\N	758550	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
68f75294-20a3-445e-a064-05488fafef57	00000000-0000-0000-0000-0000000a5b71	758559	AV STUDIO D.O.O.	company	SI	KORO┼áKA CESTA 55	3320	VELENJE	t	SI41565070	41565070	1469134000	EUR	0	0.00	\N	f	\N	758559	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b5522ec9-2480-4381-9d60-ef60b3ca6f75	00000000-0000-0000-0000-0000000a5b71	2755169	AVANT.SI d.o.o.	company	SI	Poslovna cona A 049	4208	┼áen─ìur	t	SI50709429	50709429	5655048000	EUR	30	0.00	\N	f	\N	2755169	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ecaafff7-2548-46e8-80dc-2db5b89542e8	00000000-0000-0000-0000-0000000a5b71	4016468	AVB Group d.o.o.	company	HR	Trg dr. Franje Tu─æmana 2A	42204	TUR─îIN	t	HR68790841279	\N	\N	EUR	0	0.00	\N	f	\N	17395877	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d0ed3a14-56b8-494c-aff0-2f1f0cc69f63	00000000-0000-0000-0000-0000000a5b71	4014465	Avento Logistics	company	DE	Schelmenhofstr.1a	87600	KAUFBEUREN	t	DE813999654	\N	\N	EUR	0	0.00	\N	f	\N	13289466	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f091b3b5-29cf-45ab-bb3e-bcda2ed3a94d	00000000-0000-0000-0000-0000000a5b71	420190	AVIKO D.O.O.	company	SI	DOBLI─îE 53	8340	─îRNOMELJ	t	SI90530098	90530098	2144689000	EUR	30	0.00	\N	f	\N	420190	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
88a94dd0-3218-475c-b560-9f66f2416a42	00000000-0000-0000-0000-0000000a5b71	1208357	AVIO PARTNER MARIJANA RADOJEVI─å S.P	company	SI	ZGORNJI BRNIK 130E	4210	BRNIK - AERODROM	t	SI41477553	41477553	3270327000	EUR	0	0.00	\N	f	\N	1208357	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
86b1fe8f-dd4e-4e7d-843c-0b3742c6dcf0	00000000-0000-0000-0000-0000000a5b71	1071683	AVIOR d.o.o.	company	SI	TEHNOLO┼áKI PARK 021	1000	Ljubljana	t	SI28773586	28773586	2084457000	EUR	0	0.00	\N	f	\N	1071683	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bee8e09f-1fc2-4484-98f4-b4830e7ec170	00000000-0000-0000-0000-0000000a5b71	\N	AvioZvoh d.o.o.	company	SI	Cesta komandanta Staneta 004A	1215	Medvode	t	SI97184802	97184802	8221855000	EUR	30	0.00	\N	f	\N	19826045	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
772c58bc-f680-4ccb-b8c1-931a17ea850a	00000000-0000-0000-0000-0000000a5b71	1795375	AVOKADO d.o.o. MOSTAR	company	BA	KO─îINE 146C	88000	MOSTAR	t	BA227519990007	227519990007	\N	EUR	30	0.00	\N	f	\N	1795375	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c1d6d699-5577-454e-9846-ed831a45b575	00000000-0000-0000-0000-0000000a5b71	1648703	AVSEC BO┼áTJAN S.P.	company	SI	GORI─îANE 023D	1215	MEDVODE	t	SI85021598	85021598	3255417000	EUR	30	0.00	\N	f	\N	1648703	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
580ac628-77a0-4a15-9bc0-57131f8eb3b7	00000000-0000-0000-0000-0000000a5b71	4010494	AVTERA, DISTRIBUCIJA RA─îUNALN	company	SI	Litijska cesta 259	1261	LJUBLJANA - DOBRUNJE	t	SI30776937	\N	\N	EUR	0	0.00	\N	f	\N	8762343	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e02692a1-e4c9-43d6-aea5-1bc427c47394	00000000-0000-0000-0000-0000000a5b71	4012908	AVTO - KO─îEVJE TUZEMSKI IN ME	company	SI	OTI┼áKI VRH 25 B	2373	┼áENTJAN┼¢ PRI DRAVOGRADU	t	SI10656022	\N	\N	EUR	0	0.00	\N	f	\N	11139933	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3d0999dc-970d-4232-9079-ecf96ff61f35	00000000-0000-0000-0000-0000000a5b71	\N	AVTO - SHOP FORMULA d.o.o.	company	SI	Miklav┼íka cesta 082	2311	Ho─ìe	t	SI32455879	32455879	8296669000	EUR	30	0.00	\N	f	\N	16212128	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c1160007-1635-41aa-bd96-fb3f80884c2d	00000000-0000-0000-0000-0000000a5b71	\N	AVTO BEZLAJ TURBINE d.o.o.	company	SI	Zgornje Pirni─ìe 124A	1215	Medvode	t	SI60396008	60396008	6413048000	EUR	30	0.00	\N	f	\N	4139321	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
52f4cb60-9c6d-46b2-bbb6-ceffced65eb7	00000000-0000-0000-0000-0000000a5b71	504670	AVTO BRANKO D.O.O.	company	SI	PLETERJE 014	2324	LOVRENC NA DRAVSKEM POLJ	t	SI29399149	29399149	5804159000	EUR	0	0.00	\N	f	\N	504670	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
449056de-5938-47f1-84bf-d8d116ac7192	00000000-0000-0000-0000-0000000a5b71	2015197	AVTO BUKOVEC d.o.o.	company	SI	VAVP─îA VAS 048	8333	SEMI─î	t	SI93636237	93636237	2286343000	EUR	30	0.00	\N	f	\N	2015197	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
203e6876-dcfb-4e03-8ee3-5b5ba3aa3ab0	00000000-0000-0000-0000-0000000a5b71	\N	AVTO CENTER JEROV┼áEK d.o.o.	company	SI	Cesta na Krko 004	1290	Grosuplje	t	SI17951330	17951330	5363357000	EUR	30	0.00	\N	f	\N	12169928	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e04fa7c2-5bc3-4351-99c6-e634eced2a4e	00000000-0000-0000-0000-0000000a5b71	\N	AVTO CENTER OBALA d.o.o.	company	SI	Sermin 007C	6000	Koper - Capodistria	t	SI67605214	67605214	7051395000	EUR	30	0.00	\N	f	\N	9731511	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a4e2ec2b-6677-473b-9e60-d133837c3838	00000000-0000-0000-0000-0000000a5b71	\N	AVTO CENTER ┼áUBELJ d.o.o.	company	SI	Preserska cesta 011	1235	Radomlje	t	SI56063750	56063750	5344522000	EUR	30	0.00	\N	f	\N	17325858	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c8a9b6bb-6313-4c15-b34b-2d6cea5b33ad	00000000-0000-0000-0000-0000000a5b71	\N	AVTO CLASSIC d. o .o.	company	SI	Borovci 038B	2281	Markovci	t	SI68978227	68978227	8173273	EUR	30	0.00	\N	f	\N	8975533	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a2a019f2-a391-47dc-a5e8-bbdef45891e1	00000000-0000-0000-0000-0000000a5b71	481352	AVTO DU┼áAN-DU┼áAN KOVA─îI─î S.P.	company	SI	RAKA 0051	8274	RAKA	t	SI50762311	50762311	1749595000	EUR	0	0.00	\N	f	\N	481352	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b2e55d92-00b2-4fdf-b113-ac38d366a4e2	00000000-0000-0000-0000-0000000a5b71	1712523	AVTO IGLA d.o.o.	company	SI	Belokranjska cesta 020A	8340	─îrnomelj	t	SI65112067	65112067	6152457000	EUR	30	0.00	\N	f	\N	1712523	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1ba1e933-3063-4f1d-abfa-84e0d478227d	00000000-0000-0000-0000-0000000a5b71	\N	AVTO KLUB VRBOVSKO RACING	company	HR	Bakarska draga 9	51326	Vrbovsko	f	\N	29549809004	\N	EUR	30	0.00	\N	f	\N	16218368	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a3322955-51b5-42c0-a9e2-ea72b1f5b3a7	00000000-0000-0000-0000-0000000a5b71	1576965	AVTO KRKA ISO d.o.o.	company	SI	CANKARJEVA CESTA 016	1000	LJUBLJANA	t	SI85652890	85652890	3561216000	EUR	30	0.00	\N	f	\N	1576965	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
438b1c81-e5e7-4f61-ae3f-b899292743c9	00000000-0000-0000-0000-0000000a5b71	\N	AVTO KRKA KK d.o.o.	company	SI	Cankarjeva cesta 016	1000	Ljubljana	t	SI26105969	26105969	3510344000	EUR	30	0.00	\N	f	\N	5826536	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ece310bb-6966-45cc-8a58-c4fc38a82d4b	00000000-0000-0000-0000-0000000a5b71	\N	AVTO KRKA NG d.o.o.	company	SI	Cankarjeva cesta 016	1000	Ljubljana	t	SI96450258	96450258	3511537000	EUR	30	0.00	\N	f	\N	13855537	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1e0fecf3-4087-4788-99fc-13b985bd95e4	00000000-0000-0000-0000-0000000a5b71	3772347	AVTO KRKA NM d.o.o.	company	SI	CANKARJEVA CESTA 016	1000	LJUBLJANA	t	SI97875376	97875376	3510310000	EUR	30	0.00	\N	f	\N	3772347	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e68e0520-0142-4624-92a7-332824fb1c94	00000000-0000-0000-0000-0000000a5b71	\N	AVTO KRKA SA d.o.o.	company	SI	Cankarjeva cesta 016	1000	Ljubljana	t	SI11077280	11077280	3721043000	EUR	30	0.00	\N	f	\N	15061190	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b896ba25-47e2-4dc4-ac36-8ed32ef85d65	00000000-0000-0000-0000-0000000a5b71	\N	AVTO KRKA VI d.o.o.	company	SI	Cankarjeva cesta 016	1000	Ljubljana	t	SI48549860	48549860	3560155000	EUR	30	0.00	\N	f	\N	15865163	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
35302ca4-9872-4cbb-ae41-31949c821cd9	00000000-0000-0000-0000-0000000a5b71	1579864	AVTO M.B. d.o.o., Ljubljana	company	SI	BEBLERJEV TRG 003	1000	LJUBLJANA	t	SI47451513	47451513	5698120000	EUR	30	0.00	\N	f	\N	1579864	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ab113f84-4651-4369-ba30-c11f11f79efd	00000000-0000-0000-0000-0000000a5b71	442598	AVTO MALI D.O.O.	company	SI	BELOKRANJSKA CESTA 0022	8340	─îRNOMELJ	t	SI38812053	38812053	1960032000	EUR	30	0.00	\N	f	\N	442598	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dfdf5742-637e-4001-907b-1415f10d0760	00000000-0000-0000-0000-0000000a5b71	\N	Avto moto dru┼ítvo Kolpa MXS	company	SI	Krupa 030	8333	Semi─ì	f	\N	79230849	5937132000	EUR	30	0.00	\N	f	\N	9188399	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7ce84971-7571-435d-8a17-b3f68495fbcb	00000000-0000-0000-0000-0000000a5b71	2796480	AVTO NEVEN d.o.o.	company	HR	Samoborska cesta 52	1000	RAKOV POTOK	t	HR37049719486	37049719486	\N	EUR	60	0.00	\N	f	\N	2796480	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
41df9952-3b60-4129-bce4-2cd3ac27be2c	00000000-0000-0000-0000-0000000a5b71	\N	AVTO NEVEN SAMOBOR d.o.o.(hr)	company	HR	Tina Ujevi─ça 15	10430	Samobor	t	HR35852466821	35852466821	\N	EUR	60	0.00	\N	f	\N	6470286	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a43694ed-f78f-4f1f-a980-76e0e3c0fdec	00000000-0000-0000-0000-0000000a5b71	821316	AVTO RUS D.O.O. GRADAC	company	SI	GRADAC 0132	8332	GRADAC	t	SI89573978	89573978	5710154000	EUR	0	0.00	\N	f	\N	821316	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
64843759-8836-43df-b965-22cd26d8b2fe	00000000-0000-0000-0000-0000000a5b71	636414	AVTO ┼áOBAR ROLAND ┼áOBAR S.P.	company	SI	┼¢ELEZNI─îARSKA CESTA 0011	8340	─îRNOMELJ	t	SI66005884	66005884	5295860000	EUR	0	0.00	\N	f	\N	636414	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0639b459-8316-4bc9-bfd5-90f7be39d699	00000000-0000-0000-0000-0000000a5b71	\N	AVTO TRIGLAV d.o.o., Ljubljana	company	SI	Dunajska cesta 122	1000	Ljubljana	t	SI34791809	34791809	5825482000	EUR	20	0.00	\N	f	\N	4212743	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3a9339ea-f6a9-4f14-96f2-c7fe8e8384de	00000000-0000-0000-0000-0000000a5b71	3402916	AVTO TROBEC d.o.o.	company	SI	CERKNI┼áKA ULICA 016	1000	LJUBLJANA	t	SI34325662	34325662	1934805000	EUR	30	0.00	\N	f	\N	3402916	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3564e3a3-7106-4223-bc3b-0fd572c67d68	00000000-0000-0000-0000-0000000a5b71	3756245	AVTOCENTER A┼á d.o.o.	company	SI	Zagreb┼íka cesta 085	2000	Maribor	t	SI19285221	19285221	6616607000	EUR	30	0.00	\N	f	\N	3756245	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1978b955-47bd-448f-894e-b4e908a12654	00000000-0000-0000-0000-0000000a5b71	\N	AVTOCENTER ┼¢GAJNAR d.o.o.	company	SI	Obrtna cesta 022	1291	┼ákofljica	t	SI59238518	59238518	3651606000	EUR	30	0.00	\N	f	\N	3847867	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9af63674-c9d3-4a16-862a-a88260f70766	00000000-0000-0000-0000-0000000a5b71	\N	AVTO-─îAVELJ, Ivan Puljek (hr)	company	HR	Tr┼íki vrh 29a	49000	Krapina	t	HR03228965485	03228965485	\N	EUR	60	0.00	\N	f	\N	5414703	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
11f6a874-3313-46df-8269-d9c107acaee2	00000000-0000-0000-0000-0000000a5b71	1147414	AVTODIAG d.o.o.	company	SI	DUNAJSKA CESTA 067	1000	LJUBLJANA	t	SI83382305	83382305	2148617000	EUR	0	0.00	\N	f	\N	1147414	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8a756938-e410-43b3-9bce-f3bfead80c3d	00000000-0000-0000-0000-0000000a5b71	\N	AVTOELEKTRIKA - POPRAVILO ELEKTRO SKLOPOV NA VOZILIH JANEZ FIRM, S.P.	company	SI	Pod bregom 024	1231	Ljubljana - ─îrnu─ìe	t	SI95337300	95337300	5397407000	EUR	30	0.00	\N	f	\N	4021657	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
02066469-da68-4d48-bee5-553ad4d5dc47	00000000-0000-0000-0000-0000000a5b71	\N	AVTOELEKTRIKA ZDRAVKO KLEVI┼áAR S.P.	company	SI	Stra┼íka cesta 030	8000	Novo mesto	t	SI83329633	83329633	5301899000	EUR	30	0.00	\N	f	\N	4028233	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
141a263c-306b-4613-8747-d3fbaa796c93	00000000-0000-0000-0000-0000000a5b71	479488	AVTOELEKTRONIKA D.O.O.	company	SI	CESTA CENETA ┼áTUPARJA 48	1000	LJUBLJANA	t	SI18819346	18819346	1714643	EUR	0	0.00	\N	f	\N	479488	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f5407b5b-108c-4f84-adb8-1d28d7fdbf3d	00000000-0000-0000-0000-0000000a5b71	\N	AVTOHANDEL RISTIC (DE)	company	DE	Brunsbutteler Damm 358	13591	BERLIN	t	DE242304226	242304226	\N	EUR	30	0.00	\N	f	\N	4906963	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ee73dce0-99b0-433c-952b-e217dd3b4dfb	00000000-0000-0000-0000-0000000a5b71	4015697	AVTOHI┼áA KRI┼¢MAN d.o.o.	company	SI	Stra┼¥nji Vrh 24F	8340	─îRNOMELJ	t	SI25079808	\N	\N	EUR	0	0.00	\N	f	\N	15811691	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d9b265b7-6d31-4dd3-a569-b3f8d7b5ae38	00000000-0000-0000-0000-0000000a5b71	802622	AVTOHI┼áA MALGAJ, d.o.o.	company	SI	GABRSKO 30	1420	TRBOVLJE	t	SI29797578	29797578	5373298000	EUR	0	0.00	\N	f	\N	802622	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cd6f08ad-fbbb-4b32-b23e-2a9685d4ded0	00000000-0000-0000-0000-0000000a5b71	\N	AVTOHI┼áA REAL, d.o.o.	company	SI	Vodovodna cesta 093	1000	Ljubljana	t	SI43292224	43292224	1663810000	EUR	30	0.00	\N	f	\N	6239040	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
342aa5a3-4dab-4850-a014-fec03f81d8da	00000000-0000-0000-0000-0000000a5b71	\N	Avtohi┼ía Stepan─ìi─ì, Vesna Stepan─ìi─ì s.p.	company	SI	Arclin 100	3211	┼ákofja vas	t	SI12276413	12276413	6964150000	EUR	30	0.00	\N	f	\N	4230680	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ae34b9aa-ce40-4456-b5df-fb7bc7f8cbfd	00000000-0000-0000-0000-0000000a5b71	4016233	AVTOHI┼áA ┼áKORJANEC d.o.o.	company	SI	Levec 56E	3301	PETROV─îE	t	SI73027448	\N	\N	EUR	0	0.00	\N	f	\N	16826859	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
22ca4100-6c2d-433d-a749-1171205d7f71	00000000-0000-0000-0000-0000000a5b71	688769	AVTOHI┼áA VRTIN D.O.O.	company	SI	KO─îEVJE 0021	8340	─îRNOMELJ	t	SI22117482	22117482	5831377000	EUR	0	0.00	\N	f	\N	688769	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
31597913-5ffa-4fc2-93fd-c1f91f1a19fe	00000000-0000-0000-0000-0000000a5b71	\N	AVTOKLEPARSTVO ROBERT PAN─îUR S.P.	company	SI	Jem─ìeva cesta 043	1236	Trzin	t	SI39353044	39353044	5030352	EUR	30	0.00	\N	f	\N	5155362	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f5546224-ea7d-4914-9fdd-b5193db87498	00000000-0000-0000-0000-0000000a5b71	\N	AVTOKLEPARSTVO VINKO BANOVEC S.P.	company	SI	Butorajska cesta 036	8340	─îrnomelj	t	SI45791406	45791406	5167945000	EUR	30	0.00	\N	f	\N	5056829	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
669f50fc-800a-44cd-aaee-f19d6d63ad39	00000000-0000-0000-0000-0000000a5b71	532899	AVTO-KO─îEVJE D.O.O.	company	SI	OTI┼áKI VRH 0025B	2373	┼áENTJAN┼¢ PRI DRAVOGRADU	t	SI10656022	10656022	5143756000	EUR	0	0.00	\N	f	\N	532899	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6f5a7c83-86da-4369-b318-fdf899e72724	00000000-0000-0000-0000-0000000a5b71	\N	AVTOKOZMETIKA BP, ─îI┼á─îENJE VOZIL, PRIMO┼¢ BRKOPEC S.P.	company	SI	VELIKE BRUSNICE 76	8321	BRUSNICE	f	\N	75000598	8088586000	EUR	30	0.00	\N	f	\N	12380888	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6b02bd0d-006b-4639-aff7-50971cddcdfa	00000000-0000-0000-0000-0000000a5b71	1659129	AVTOLES d.o.o.	company	SI	PODGORSKA CESTA 114	2380	SLOVENJ GRADEC	t	SI13653652	13653652	5617332000	EUR	30	0.00	\N	f	\N	1659129	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
306f97d4-6f43-4be6-8203-581d1b53f623	00000000-0000-0000-0000-0000000a5b71	1500567	AVTOLOG LJUBLJANA d.o.o.	company	SI	Cesta na Brinovec 016	1260	Ljubljana - Polje	t	SI96065168	96065168	3968383	EUR	30	0.00	\N	f	\N	1500567	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d615e84e-9dce-482c-af7d-a5f2035d64fe	00000000-0000-0000-0000-0000000a5b71	\N	AVTO-MAT d.o.o.	company	SI	Obrtna cesta 022	1291	┼ákofljica	t	SI65458265	65458265	5639417000	EUR	30	0.00	\N	f	\N	3892192	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c9c61cf2-f11a-41c2-8470-c10bff8ba5f4	00000000-0000-0000-0000-0000000a5b71	\N	Avtomati ┼átefan─ìi─ì d.o.o.	company	SI	Vilharjeva cesta 048	6250	Ilirska Bistrica	t	SI47457473	47457473	3925935000	EUR	30	0.00	\N	f	\N	5514682	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b58281ca-2f72-4f90-953e-227772b9ac0c	00000000-0000-0000-0000-0000000a5b71	2182962	AVTOMATSKI MENJALNIKI, ROK POGA─îNIK S.P.	company	SI	Zgornja Dobrava 036	4246	Kamna Gorica	t	SI47705965	47705965	6066925000	EUR	30	0.00	\N	f	\N	2182962	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1de8b28c-07f5-4f74-8e86-236328853230	00000000-0000-0000-0000-0000000a5b71	828840	AVTOMEHANIKA IN POPRAVILO KMETIJSKI	company	SI	ZAJ─îJI VRH 0001	8340	─îRNOMELJ	t	SI66413206	66413206	5334754	EUR	0	0.00	\N	f	\N	828840	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1f64b823-0253-47be-9823-d4c72167bec0	00000000-0000-0000-0000-0000000a5b71	\N	AVTOMEHANIKA KAV┼áEK ROBERT S.P.	company	SI	GOTNA VAS 043	8000	NOVO MESTO	t	SI56799900	56799900	1027921000	EUR	30	0.00	\N	f	\N	9191710	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f426bab9-8bcd-41d7-90b1-dd2cc4ab7aa1	00000000-0000-0000-0000-0000000a5b71	\N	AVTO-MOTO SAVEZ SRBIJE	company	RS	KNEGINJE Z0RKE 58	11000	Beograd	t	\N	\N	\N	EUR	0	0.00	\N	f	\N	4132975	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2fe1eb70-2a35-41ff-99dc-3ca417ad5319	00000000-0000-0000-0000-0000000a5b71	2336446	AVTONET, d.o.o.	company	SI	Obala 077	6320	Portoro┼¥ - Portorose	t	SI31429602	31429602	5491797000	EUR	30	0.00	\N	f	\N	2336446	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2efee7c1-260c-46f8-a58c-8387e6396dbc	00000000-0000-0000-0000-0000000a5b71	1753443	AVTOPARK d.o.o.	company	SI	PODPE─î OB DRAVINJI 017	3215	LO─îE	t	SI15237478	15237478	2171660000	EUR	30	0.00	\N	f	\N	1753443	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b9506e11-8cf6-4104-bc28-239b574ab9e9	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZ BORUT FIJAV┼¢ d.o.o.	company	SI	Liptovska ulica 034F	3210	Slovenske Konjice	t	SI66790093	66790093	5568331000	EUR	60	0.00	\N	f	\N	5605324	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4163da37-89ad-497b-bd88-a8c7c40ec241	00000000-0000-0000-0000-0000000a5b71	972079	AVTOPREVOZ DEJAN HROVAT S.P.	company	SI	KRAJNO BRDO 0006	1225	LUKOVICA	t	SI14558360	14558360	3458113000	EUR	0	0.00	\N	f	\N	972079	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f1e91a69-d7a3-44f9-bce9-649807cafaa9	00000000-0000-0000-0000-0000000a5b71	663935	AVTOPREVOZ TOLMIN  D.O.O.	company	SI	POLJUBINJ 089F	5220	TOLMIN	t	SI34841865	34841865	5499895000	EUR	0	0.00	\N	f	\N	663935	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
049a3f6a-d304-4fb0-9a68-45bb035f8368	00000000-0000-0000-0000-0000000a5b71	2392473	AVTOPREVOZ, MARIJA ERZAR S.P.	company	SI	Visoko 133	4212	Visoko	t	SI39005364	39005364	3859126000	EUR	30	0.00	\N	f	\N	2392473	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3fd186da-8581-4c58-b766-b11f694f0d90	00000000-0000-0000-0000-0000000a5b71	2567988	AVTOPREVOZ.NIK - ZVONKO PAVLI─î S.P.	company	SI	Kladje nad Blanco 001	8283	Blanca	t	SI22022325	22022325	5670899000	EUR	60	0.00	\N	f	\N	2567988	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
909977f8-ce83-4830-82d0-cc54c4c1e925	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNIK JO┼¢EF BELAK S.P.	company	SI	Cesta v ┼¢eleznik 003	3215	LO─îE	t	SI37875981	37875981	5860761000	EUR	60	0.00	\N	f	\N	4040341	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
51747301-22e7-4f9c-afc5-fc1b11b602e9	00000000-0000-0000-0000-0000000a5b71	776344	AVTOPREVOZNIK JO┼¢EF BRATO┼¢ S.P.	company	SI	OREHOVICA 35	5272	PODNANOS	t	SI24349569	24349569	5050810000	EUR	0	0.00	\N	f	\N	776344	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d7ba313d-67fc-4ee2-9812-fd977c92ece7	00000000-0000-0000-0000-0000000a5b71	\N	Avtoprevoznik KNE┼¢EVI─å  JOCA (RS)	company	RS	Dragobra─ça bb	34000	Kragujevac	t	RS105172816	105172816	\N	EUR	60	0.00	\N	f	\N	4839175	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
899b5d41-853d-4d97-a13b-2b9630289d54	00000000-0000-0000-0000-0000000a5b71	547695	AVTOPREVOZNIK SAKSIDA ALE┼á S.P.	company	SI	┼áMARJE 49	5295	BRANIK	t	SI29230250	29230250	5049413000	EUR	0	0.00	\N	f	\N	547695	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
821f27b2-f229-41a9-aee6-01829b90c96e	00000000-0000-0000-0000-0000000a5b71	1575334	AVTOPREVOZNIK ┼áINKAR MARJAN S.P.	company	SI	Spodnja Re─ìica 070	3332	Re─ìica ob Savinji	t	SI10936521	10936521	5569182000	EUR	30	0.00	\N	f	\N	1575334	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a76d297f-86f5-4ed0-a00c-7278aad7f502	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNIK UL─îNIK MIRAN S.P.	company	SI	SEJMI┼áKA ULICA 013	8273	LESKOVEC PRI KR┼áKEM	t	SI53132866	53132866	5151195000	EUR	30	0.00	\N	f	\N	9428903	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1fc7af9f-7e2d-4e0d-91de-56622f375b24	00000000-0000-0000-0000-0000000a5b71	1526599	AVTOPREVOZNIK VIKTOR KRAJNC S.P.	company	SI	TEKA─îEVO 033	3250	ROGA┼áKA SLATINA	t	SI21433283	21433283	5633370	EUR	30	0.00	\N	f	\N	1526599	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9ba925db-d27f-4a26-ba60-522124f92b15	00000000-0000-0000-0000-0000000a5b71	490825	AVTOPREVOZNIK VRHOVAC	company	BA	┼áTRBE B.B.	78240	─îELINAC	f	\N	\N	\N	EUR	0	0.00	\N	f	\N	490825	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fa7115e3-be30-4495-90ed-9062bcf969db	00000000-0000-0000-0000-0000000a5b71	1083763	AVTOPREVOZNI┼áTVO - JANKO STRAHINI─å S.P.	company	SI	ULICA XIV. DIVIZIJE 011	8330	METLIKA	t	SI19303084	19303084	5238117	EUR	0	0.00	\N	f	\N	1083763	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
af3fca20-6009-4860-8547-1a4b1ee815d5	00000000-0000-0000-0000-0000000a5b71	1837213	AVTOPREVOZNI┼áTVO - MARJAN OBER─î, S.P.	company	SI	GMAJNA 020	8274	RAKA	t	SI93133839	93133839	5604615000	EUR	30	0.00	\N	f	\N	1837213	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a906a82a-c8e1-42b4-a613-3c0d603cdb3c	00000000-0000-0000-0000-0000000a5b71	1777201	AVTOPREVOZNI┼áTVO - PLUT ANTON, S.P.	company	SI	RADOVICA 088	8330	METLIKA	t	SI29124662	29124662	5184551	EUR	30	0.00	\N	f	\N	1777201	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7ae3dbbc-c6e1-4e51-a9c1-083a351031f4	00000000-0000-0000-0000-0000000a5b71	1465861	AVTOPREVOZNI┼áTVO - RE┼¢EK MIRKO, S.P.	company	SI	RADOVICA 055	8330	METLIKA	t	SI67702708	67702708	5194425	EUR	30	0.00	\N	f	\N	1465861	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
beb52777-8739-4221-a440-7986b4d74cb0	00000000-0000-0000-0000-0000000a5b71	1059170	AVTOPREVOZNI┼áTVO - VINKO MALERI─î S.	company	SI	VOJNA VAS 016	8340	─îRNOMELJ	t	SI83979743	83979743	5521392	EUR	0	0.00	\N	f	\N	1059170	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
360f652e-8ed5-4885-9fb7-f52f43ee7ef3	00000000-0000-0000-0000-0000000a5b71	1117291	AVTOPREVOZNI┼áTVO ALEKSANDER FER┼á S.	company	SI	STRMA POT 019	2230	LENART V SLOV. GORICAH	t	SI36559172	36559172	5353235000	EUR	0	0.00	\N	f	\N	1117291	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2db018c9-a3ce-4aae-affb-75e5476fe52c	00000000-0000-0000-0000-0000000a5b71	1477701	AVTOPREVOZNI┼áTVO ALOJZ ANZELJ S.P.	company	SI	REP─îE 023	8210	TREBNJE	t	SI93587538	93587538	5372018	EUR	30	0.00	\N	f	\N	1477701	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2a6a4dc6-ab3c-4c9e-9550-91631b65f634	00000000-0000-0000-0000-0000000a5b71	1464799	AVTOPREVOZNI┼áTVO ALOJZIJ KAV─îNIK S.P.	company	SI	STARA CESTA 023	1351	BREZOVICA PRI LJUBLJANI	t	SI62467000	62467000	5001990	EUR	30	0.00	\N	f	\N	1464799	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
656c2ee6-f9b9-460b-9605-c3cb998e704f	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO AVGU┼áTIN FINEC S.P.	company	SI	Vir pri Sti─ìni 104	1295	Ivan─ìna Gorica	t	SI16100107	16100107	1441582000	EUR	60	0.00	\N	f	\N	6738847	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
67abb2af-d8c4-44da-9035-edf41730e550	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO BO┼áTJAN BRUNEC S.P.	company	SI	Ko─ìevska cesta 125	1330	Ko─ìevje	t	SI22072543	22072543	1017551000	EUR	30	0.00	\N	f	\N	9706261	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d7a12965-6df6-4b14-a78c-9c22349f2d3d	00000000-0000-0000-0000-0000000a5b71	4011402	AVTOPREVOZNI┼áTVO BTS, MIRAN B	company	SI	SPODNJA NOVA VAS 43	2310	SLOVENSKA BISTRICA	t	SI40553922	\N	\N	EUR	0	0.00	\N	f	\N	9668003	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
79d0db7f-5dcb-4a69-a9a3-c04a45fe7ba6	00000000-0000-0000-0000-0000000a5b71	3165102	AVTOPREVOZNI┼áTVO CIMERMAN IGOR S.P.	company	SI	Zadru┼¥na cesta 002	8340	─îrnomelj	t	SI76886450	76886450	5519800	EUR	60	0.00	\N	f	\N	3165102	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b33e6b81-90f7-4923-8972-26ecf1fdcff2	00000000-0000-0000-0000-0000000a5b71	1819287	AVTOPREVOZNI┼áTVO ─îE┼áNOVAR FRANC S.P.	company	SI	Spodnja Re─ìica 068	3332	Re─ìica ob Savinji	t	SI17864160	17864160	5186399	EUR	30	0.00	\N	f	\N	1819287	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
429b8b0b-f3b9-45b8-a791-2c6be288e7dd	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO DACAR d.o.o.	company	SI	Breg ob Savi 028	4211	Mav─ìi─ìe	t	SI86674919	86674919	7049781	EUR	30	0.00	\N	f	\N	6750488	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
81f9dbe0-45d2-49c2-8433-dae1f352f3f6	00000000-0000-0000-0000-0000000a5b71	442629	AVTOPREVOZNI┼áTVO DARIJ GRUDEN S.P.	company	SI	KOSOVELOVA ULICA 007 A	5220	TOLMIN	t	SI65549732	65549732	5635995	EUR	0	0.00	\N	f	\N	442629	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d525820d-e517-4d94-8a27-56ed804af536	00000000-0000-0000-0000-0000000a5b71	442606	AVTOPREVOZNI┼áTVO FRANC CEKUTA S.P.	company	SI	─îRNOMALJSKA CESTA 0010	8333	SEMI─î	t	SI48621781	48621781	5091282	EUR	0	0.00	\N	f	\N	442606	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e21d664a-7c4b-435d-80ce-5b58595dfefd	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO FRANC KASTELIC S.P.	company	SI	BABNA GORA 011	8213	VELIKI GABER	t	SI79932355	79932355	5371634	EUR	60	0.00	\N	f	\N	5326597	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dbdeb031-ae2d-4a18-8568-f482e2cc5eda	00000000-0000-0000-0000-0000000a5b71	1070124	Avtoprevozni┼ítvo Franc Lu┼íina s.p.	company	SI	BELA CERKEV 013	8220	┼ámarje┼íke Toplice	t	SI15739651	15739651	5074536	EUR	60	0.00	\N	f	\N	1070124	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4ba62f31-577f-4f3f-95e0-a6a11ff54930	00000000-0000-0000-0000-0000000a5b71	1606680	AVTOPREVOZNI┼áTVO GOR┼áE MATJA┼¢ S.P.	company	SI	AN┼¢URJEVA ULICA 014A	1260	LJUBLJANA - POLJE	t	SI24577278	24577278	5673336000	EUR	30	0.00	\N	f	\N	1606680	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bbbc9847-a233-4dee-b597-13793f219b2f	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO IN KARTONSKI IZDELKI ANTON BABI─î S.P.	company	SI	Ob ribniku 099	2000	Maribor	t	SI95391126	95391126	5452618000	EUR	60	0.00	\N	f	\N	4839195	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c5aec7a2-db22-4bfc-9814-1441a9b78d75	00000000-0000-0000-0000-0000000a5b71	4006868	AVTOPREVOZNI┼áTVO IN POSREDNI┼áT	company	SI	Blagovica 23	1223	Blagovica	t	SI93759517	\N	\N	EUR	0	0.00	\N	f	\N	6720732	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cad86b10-2508-4b40-b5f2-6d19ceeb563b	00000000-0000-0000-0000-0000000a5b71	598286	AVTOPREVOZNI┼áTVO JANEZ RO┼¢MAN S.P.	company	SI	PURGA 0003A	8341	ADLE┼áI─îI	t	SI83432566	83432566	5545181	EUR	0	0.00	\N	f	\N	598286	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
01e4d6d4-6960-46ab-bba6-1708191f94c5	00000000-0000-0000-0000-0000000a5b71	2052685	AVTOPREVOZNI┼áTVO JELOV┼áEK ZDRAVKO S.P.	company	SI	Cerovec 029	3230	┼áentjur	t	SI91189284	91189284	5052747	EUR	30	0.00	\N	f	\N	2052685	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1cbca121-f144-4493-af92-b1bfcb0d3193	00000000-0000-0000-0000-0000000a5b71	1086212	AVTOPREVOZNI┼áTVO JO┼¢E ┼¢UGELJ S.P.	company	SI	JEL┼áEVNIK 007A	8340	─îRNOMELJ	t	SI87549468	87549468	5167794000	EUR	0	0.00	\N	f	\N	1086212	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9757b248-e000-4928-8a91-32172fb4caa0	00000000-0000-0000-0000-0000000a5b71	2156033	AVTOPREVOZNI┼áTVO JO┼¢EF NOVAK S.P.	company	SI	┼áinkova ulica 005	2277	Sredi┼í─ìe ob Dravi	t	SI29760470	29760470	6320490000	EUR	30	0.00	\N	f	\N	2156033	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
39732280-bbe1-49f9-90d0-d40bdb3fd8dc	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO JO┼¢EF TAU┼¢I─î S.P.	company	SI	Spodnja Voli─ìina 052	2232	Voli─ìina	t	SI43204007	43204007	5213734000	EUR	60	0.00	\N	f	\N	4178668	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f265d3e6-d2db-4d8b-932d-016143619928	00000000-0000-0000-0000-0000000a5b71	479503	AVTOPREVOZNI┼áTVO KLAUT EGON S.P.	company	SI	CVETLI─îNA ULICA 38	5290	┼áEMPETER PRI GORICI	t	SI56406592	56406592	5373814	EUR	0	0.00	\N	f	\N	479503	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fa2a3c55-f83b-4c60-be76-b81a86ffceaa	00000000-0000-0000-0000-0000000a5b71	1924031	AVTOPREVOZNI┼áTVO KOVA─îI─î DU┼áAN S.P.	company	SI	NA LEDINAH 006	1230	DOM┼¢ALE	t	SI59117214	59117214	1063715000	EUR	60	0.00	\N	f	\N	1924031	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
044d2141-0710-4d89-9282-b84d1ec97e9d	00000000-0000-0000-0000-0000000a5b71	1731172	AVTOPREVOZNI┼áTVO KOZEL BRANIMIR S.P.	company	SI	┼áTAJERSKA CESTA 065	1231	LJUBLJANA - ─îRNU─îE	t	SI15181448	15181448	5682422	EUR	30	0.00	\N	f	\N	1731172	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
434b088e-3c4a-4ca2-aff1-4422a17e7082	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO LUKA PI┼áKUR s.p	company	SI	┼átihova ulica 013	1000	Ljubljana	t	SI33517355	33517355	5562884000	EUR	30	0.00	\N	f	\N	19374063	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
327ee00d-49f3-4624-aef6-ee3bc5b4d1c5	00000000-0000-0000-0000-0000000a5b71	547970	Avtoprevozni┼ítvo Malnar, JO┼¢E MALNAR S.P.	company	SI	┼¢LEBEJ 0011	8000	NOVO MESTO	t	SI46106057	46106057	5622114000	EUR	60	0.00	\N	f	\N	547970	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8664844f-1a97-49bb-bcc2-3529fba5a46e	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO MARU┼áI─î DRAGAN S.P.	company	SI	Kostanjevica na Krasu 064A	5296	Kostanjevica na Krasu	t	SI29849373	29849373	5228327000	EUR	30	0.00	\N	f	\N	9934525	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
855484d7-3bfc-460b-b1ea-15cd1db297af	00000000-0000-0000-0000-0000000a5b71	1013221	AVTOPREVOZNI┼áTVO NENAD D┼¢OMBA S.P.	company	SI	ULICA ZA SPOMENIKOM 11	5250	SOLKAN	t	SI22868712	22868712	5373402	EUR	0	0.00	\N	f	\N	1013221	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4e1c7e45-3f46-4353-bb81-f6ce3e88cfd0	00000000-0000-0000-0000-0000000a5b71	1120007	AVTOPREVOZNI┼áTVO PETER MARIN─îI─î S.P	company	SI	GRMOVLJE 030	8275	┼áKOCJAN	t	SI58271775	58271775	1316141000	EUR	0	0.00	\N	f	\N	1120007	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ba71e455-dfe8-41ee-a4a8-8165b4a6b1db	00000000-0000-0000-0000-0000000a5b71	1565618	AVTOPREVOZNI┼áTVO ROGA─î OTO S.P.	company	SI	SERDICA 046	9262	ROGA┼áOVCI	t	SI65228596	65228596	5661198000	EUR	30	0.00	\N	f	\N	1565618	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a51bed41-eecd-402a-ae8e-be576373f106	00000000-0000-0000-0000-0000000a5b71	2986605	AVTOPREVOZNI┼áTVO ROMAN KUMP S.P.	company	SI	Krpanova ulica 002	8340	─îrnomelj	t	SI38466473	38466473	5028150000	EUR	30	0.00	\N	f	\N	2986605	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8e95e14e-71e3-4aed-b512-9e5ab35c3baa	00000000-0000-0000-0000-0000000a5b71	4012420	AVTOPREVOZNI┼áTVO SANDI GJERGJ	company	SI	BU┼áINJA VAS 44	8331	SUHOR	t	SI17964113	\N	\N	EUR	0	0.00	\N	f	\N	10648723	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
467b440e-980a-4b23-9f0b-5c2db11deaee	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO SRE─îKO FRANGE┼¢ S.P.	company	SI	Zgornje Jablane 011	2326	Cirkovce	t	SI76886417	76886417	5197636000	EUR	30	0.00	\N	f	\N	17396426	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
16d023ac-0a1f-4cf9-be07-b3772347d6a1	00000000-0000-0000-0000-0000000a5b71	3274355	AVTOPREVOZNI┼áTVO STARE ┼áTEFAN d.o.o.	company	SI	Lu┼¥e 060	4212	Visoko	t	SI25052713	25052713	6662218	EUR	60	0.00	\N	f	\N	3274355	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
040c2fd2-269e-4bf1-85d7-90d66a2c2557	00000000-0000-0000-0000-0000000a5b71	3602255	AVTOPREVOZNI┼áTVO ┼áALEHAR ALOJZ S.P.	company	SI	Mala Cikava 001	8000	Novo mesto	t	SI53022009	53022009	5073653	EUR	60	0.00	\N	f	\N	3602255	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c34dfbc2-ee95-41cf-91df-77d95a2bed1c	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO ┼áAUPERL d.o.o.	company	SI	Strma ulica 018	2234	Benedikt	t	SI35507233	35507233	6809545000	EUR	30	0.00	\N	f	\N	10521765	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f873e711-e89e-460c-baab-3d390a6f3fd4	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO ┼áINKOVEC FRANCI, d.o.o.	company	SI	┼ámihel pri ┼¢u┼¥emberku 004	8360	┼¢u┼¥emberk	t	SI16296907	16296907	7090714000	EUR	60	0.00	\N	f	\N	5184655	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2063c69a-039f-47b0-a668-220566782988	00000000-0000-0000-0000-0000000a5b71	2298055	AVTOPREVOZNI┼áTVO TKAL─îI─î BRANKO S.P.	company	SI	Duple┼íka cesta 262	2000	Maribor	t	SI46746480	46746480	5390515	EUR	30	0.00	\N	f	\N	2298055	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0ddf62e7-581d-4a7c-a4aa-f7462c601d1d	00000000-0000-0000-0000-0000000a5b71	1481809	AVTOPREVOZNI┼áTVO TRAMTE BORIS S.P.	company	SI	LJUBLJANSKA CESTA 078	8000	NOVO MESTO	t	SI42789354	42789354	1028561	EUR	30	0.00	\N	f	\N	1481809	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3fb5a26d-5dee-4816-94f9-1ee2cb259aad	00000000-0000-0000-0000-0000000a5b71	1099007	AVTOPREVOZNI┼áTVO TURK ANTON S.P.	company	SI	LORMANJE 017	2230	LENART V SLOV. GORICAH	t	SI45611980	45611980	5602519000	EUR	0	0.00	\N	f	\N	1099007	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
386c5c11-69ea-4f6d-98ba-78d0a4c29b6b	00000000-0000-0000-0000-0000000a5b71	4004958	AVTOPREVOZNI┼áTVO VODOVNIK SAM	company	SI	─îE┼áMINOVA ULICA 18 A	1230	DOM┼¢ALE	t	SI94704236	\N	\N	EUR	0	0.00	\N	f	\N	9188795	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d12e2f54-0852-4ca8-9eae-09b515b6c73b	00000000-0000-0000-0000-0000000a5b71	2235951	AVTOPREVOZNI┼áTVO VODOVNIK SAMO S.P.	company	SI	─îe┼íminova ulica 018A	1230	Dom┼¥ale	t	SI94704236	94704236	1557157000	EUR	30	0.00	\N	f	\N	2235951	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5ba0ce6a-61be-4e6a-937c-08e3833af85f	00000000-0000-0000-0000-0000000a5b71	547696	AVTOPREVOZNI┼áTVO VOJKO ┼á─îEK S.P.	company	SI	MAN─îE 4A	5271	VIPAVA	t	SI41923626	41923626	5000367	EUR	0	0.00	\N	f	\N	547696	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c4f2a8b8-ffa0-41c2-bcbd-b4b5cf9688a8	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO VRENJAK LADO S.P.	company	SI	Trata 023	1235	Radomlje	t	SI96494808	96494808	5355251000	EUR	30	0.00	\N	f	\N	15374779	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8d9a984d-0695-4af0-9185-7fe5e5ed1b60	00000000-0000-0000-0000-0000000a5b71	2216546	AVTOPREVOZNI┼áTVO ZUPAN JURIJ S.P.	company	SI	┼¢IGANJA VAS 070C	4294	KRI┼¢E	t	SI22154817	22154817	1109855	EUR	30	0.00	\N	f	\N	2216546	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f951c655-4b46-46f4-9a41-ddb786523183	00000000-0000-0000-0000-0000000a5b71	1837380	AVTOPREVOZNI┼áTVO ┼¢AGAR DU┼áAN S.P.	company	SI	Va┼íka cesta 121	8323	Ur┼ína sela	t	SI68382677	68382677	5202844	EUR	30	0.00	\N	f	\N	1837380	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a14b88c0-1c9b-4272-8515-6fed6b00e422	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO, ANTON ZADRAVEC S.P.	company	SI	┼¢epovci 036	9253	Apa─ìe	t	SI27940322	27940322	1607286000	EUR	60	0.00	\N	f	\N	4178618	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fb0347fc-e424-47d3-8846-364f8ac97d33	00000000-0000-0000-0000-0000000a5b71	1702451	AVTOPREVOZNI┼áTVO, BRANKO KOSI S.P.	company	SI	Ulica Metoda Miku┼¥a 008	1000	LJUBLJANA	t	SI17600146	17600146	5599140	EUR	30	0.00	\N	f	\N	1702451	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
270b1242-275d-4198-80ba-082279887489	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO, HO─îEVAR BORIS - S.P.	company	SI	Velike Lese 006	1301	Krka	t	SI55877192	55877192	5208269000	EUR	30	0.00	\N	f	\N	19816281	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0ae41f63-59de-4669-8a44-e8dbd8921fdb	00000000-0000-0000-0000-0000000a5b71	3523973	AVTOPREVOZNI┼áTVO, PETER KOVA─î S.P.	company	SI	Kajuhova ulica 001	2319	Polj─ìane	t	SI74728954	74728954	1223976	EUR	60	0.00	\N	f	\N	3523973	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2554e6bf-db25-4f1c-b8e5-722ba0ce492c	00000000-0000-0000-0000-0000000a5b71	1208397	AVTOPREVOZNI┼áTVO, RIBI─î VOJKO S.P.	company	SI	PODVRH 027	3314	BRASLOV─îE	t	SI83383875	83383875	5654316	EUR	0	0.00	\N	f	\N	1208397	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3fb855e2-67b9-4309-94eb-6d178644c59c	00000000-0000-0000-0000-0000000a5b71	1887781	AVTOPREVOZNI┼áTVO, STANKO FERME S.P.	company	SI	LIMOVCE 007	1222	TROJANE	t	SI89582578	89582578	5088521000	EUR	30	0.00	\N	f	\N	1887781	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c7974ea7-d929-4231-ab58-dbd4fd68082c	00000000-0000-0000-0000-0000000a5b71	1866561	AVTOPREVOZNI┼áTVO, ┼áOK─îEVI─å MIRKO S.P.	company	SI	ULICA BRATOV PRAPROTNIK 021	4202	NAKLO	t	SI13402064	13402064	5176497	EUR	30	0.00	\N	f	\N	1866561	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b3f3c369-2500-4dea-9214-4dc9b4513a0d	00000000-0000-0000-0000-0000000a5b71	627436	AVTOPREVOZNI┼áTVO, UNUK FRANC SP	company	SI	PODOVA 63	2327	RA─îE	t	SI23446935	23446935	5312517	EUR	0	0.00	\N	f	\N	627436	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5b71434a-eb30-4e8f-932f-57f7973ff4ee	00000000-0000-0000-0000-0000000a5b71	2511352	AVTOPREVOZNI┼áTVO, ┼¢AGARSTVO IN TRGOVINA MARIJAN ┼¢UPAN─îI─î S.P.	company	SI	Lokve 074	8340	─îrnomelj	f	SI34223959	34223959	5027963	EUR	30	0.00	\N	f	\N	2511352	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f2e41ace-2737-4a16-95e2-bf9b457069fa	00000000-0000-0000-0000-0000000a5b71	\N	AVTOPREVOZNI┼áTVO-IS d.o.o.	company	SI	Ljubljanska cesta 054	8000	Novo mesto	t	SI14349108	14349108	6809774000	EUR	60	0.00	\N	f	\N	6417456	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
62759849-0f41-47ab-8591-c62e20a0d7d8	00000000-0000-0000-0000-0000000a5b71	\N	Avtoprijevoznik HALILOVI─å Mihret (ba)	company	BA	┼áije b.b.	x	TE┼áANJ	t	BA319274980002	319274980002	\N	EUR	60	0.00	\N	f	\N	4162336	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7828ffb0-0c6c-4379-b306-0ed89b22f35a	00000000-0000-0000-0000-0000000a5b71	\N	Avtoprijevoznik Mirsad I─îANOVI─å (HR)	company	HR	┼ákolska 4i	44000	Sisak	t	HR56653552475	56653552475	\N	EUR	60	0.00	\N	f	\N	4100975	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
53380a91-e27f-4484-a82b-32262cfc9150	00000000-0000-0000-0000-0000000a5b71	669449	AVTOPRODAJA D.O.O.	company	SI	CESTA 25. JUNIJA 1 N	5000	NOVA GORICA	t	SI38265702	38265702	5143411000	EUR	0	0.00	\N	f	\N	669449	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
48014328-fcae-40fc-a1b4-1312c054d9bc	00000000-0000-0000-0000-0000000a5b71	1731406	AVTOS d.o.o.	company	SI	STARA CESTA 010	1360	VRHNIKA	t	SI56617925	56617925	1279114000	EUR	30	0.00	\N	f	\N	1731406	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
21caaf0b-2017-4dfc-a5fb-798936aefd1b	00000000-0000-0000-0000-0000000a5b71	\N	AVTOSERVIS d.o.o.	company	SI	Kidri─ìeva ulica 004	2380	Slovenj Gradec	t	SI72906022	72906022	5069971000	EUR	30	0.00	\N	f	\N	5630619	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b0d53243-fe84-47c2-9e34-9821c76940d6	00000000-0000-0000-0000-0000000a5b71	\N	AVTOSERVIS KOMEL BLA┼¢ KOMEL S.P.	company	SI	Vipavska cesta 122	5000	Nova Gorica	t	SI23584793	23584793	5227079000	EUR	30	0.00	\N	f	\N	5802741	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8e2f72b0-0932-459f-a60e-fe5e71d9ae40	00000000-0000-0000-0000-0000000a5b71	\N	AVTOSERVIS ┼áPAN D.O.O.	company	SI	Galjevica 011A	1000	Ljubljana	t	SI42249830	42249830	6314490	EUR	30	0.00	\N	f	\N	6246755	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0ba83d5f-dd31-43a0-bbfd-7c43ea0bdc81	00000000-0000-0000-0000-0000000a5b71	4015748	AVTOSPED Int. Speditions GmbH	company	DE	Fritz-Hommel-Weg 4	80805	M├£NCHEN	t	DE812311371	\N	\N	EUR	0	0.00	\N	f	\N	15786094	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bcafdf95-cb52-48f7-888e-5117ec4521b0	00000000-0000-0000-0000-0000000a5b71	3806456	AVTOSTEKLO d.o.o.	company	SI	─îeplje 050	3305	Vransko	t	SI60475072	60475072	1673149000	EUR	30	0.00	\N	f	\N	3806456	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
884fa0ba-b281-47ea-86d8-c85a19342a7a	00000000-0000-0000-0000-0000000a5b71	\N	AVTOSTORITVE ROGELJ, d.o.o.	company	SI	Kamnik pod Krimom 007C	1352	Preserje	t	SI19955065	19955065	5898692000	EUR	30	0.00	\N	f	\N	19816997	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f85c72ee-daa5-426d-8384-8c3fdd5efcb6	00000000-0000-0000-0000-0000000a5b71	\N	AVTO-SVETEK Studenec, d.o.o.	company	SI	Studenec 011	1260	Ljubljana - Polje	t	SI68804300	68804300	5608511000	EUR	30	0.00	\N	f	\N	9981460	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
db478b77-5474-43e0-9b9f-84daaf977452	00000000-0000-0000-0000-0000000a5b71	1086062	AVTOTAHO & ┼áTEVCI MARJAN OKORN S.P.	company	SI	ULICA DOLENJSKEGA ODREDA 005	1295	IVAN─îNA GORICA	t	SI43330703	43330703	5744746	EUR	0	0.00	\N	f	\N	1086062	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
712b11ee-6954-48aa-8755-1fb50813f3b6	00000000-0000-0000-0000-0000000a5b71	4010516	AVTOTEHNA OPREMA d.o.o.	company	SI	Kosovelova cesta 2	1290	GROSUPLJE	t	SI15778134	\N	\N	EUR	0	0.00	\N	f	\N	8773552	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
75e275ff-91be-4d4a-8624-1294df10c01e	00000000-0000-0000-0000-0000000a5b71	3520523	AVTOTEHNA VIS, d.o.o.	company	SI	Celov┼íka cesta 228	1000	Ljubljana	t	SI34459154	34459154	5504023000	EUR	30	0.00	\N	f	\N	3520523	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7c2ddff4-2bd7-4443-bdcc-873531c659ae	00000000-0000-0000-0000-0000000a5b71	2243883	Avtotransport Cvijeti─ì d.o.o.	company	BA	Ul. Pranji─ìi  br.5	75216	Husino - Tuzla	t	BA209832300005	209832300005	\N	EUR	40	0.00	\N	f	\N	2243883	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
512862bd-0df1-480e-99eb-280270da8504	00000000-0000-0000-0000-0000000a5b71	2592101	AVTOTRANSPORT PETA─î JANEZ S.P.	company	SI	┼¢LEBE 002D	1215	MEDVODE	t	SI49349384	49349384	5414225000	EUR	60	0.00	\N	f	\N	2592101	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ae234d11-c235-4772-85a0-c3515960a211	00000000-0000-0000-0000-0000000a5b71	\N	AVTOTRANSPORTI KASTELEC KASTELEC LADO S.P.	company	SI	Adami─ìeva cesta 057	1290	Grosuplje	t	SI60116960	60116960	5024289000	EUR	30	0.00	\N	f	\N	4021662	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8bb81740-87cb-41de-b6c9-4a4422487bae	00000000-0000-0000-0000-0000000a5b71	1837937	AVTOTRANSPORTI ZUPAN─îI─î d.o.o.	company	SI	Livada 001A	8000	Novo mesto	t	SI96158352	96158352	2009501000	EUR	30	0.00	\N	f	\N	1837937	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
27e2dcd5-c68c-4986-9a98-928afa85daba	00000000-0000-0000-0000-0000000a5b71	2588584	AVTOVLEKA ─îEPON ─îEPON STANISLAV S.P.	company	SI	Lesno Brdo 024	1360	Vrhnika	t	SI25469037	25469037	5285014000	EUR	60	0.00	\N	f	\N	2588584	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6b4b92aa-7628-4b84-a24e-64c188e9caab	00000000-0000-0000-0000-0000000a5b71	\N	AVTOVLEKA PO┼¢AR d.o.o.	company	SI	Ulica Emila Adami─ìa 051	1356	Dobrova	t	SI32388268	32388268	1353918000	EUR	30	0.00	\N	f	\N	18944604	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ad2ed256-10fd-452b-bdbf-95a24f913c52	00000000-0000-0000-0000-0000000a5b71	\N	AVUS SLO d.o.o.	company	SI	Pre┼íernova ulica 004	2000	Maribor	t	SI56008813	56008813	9009841000	EUR	30	0.00	\N	f	\N	12840207	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5845bc62-ce62-4696-90a8-6cd5127e813b	00000000-0000-0000-0000-0000000a5b71	4017704	AVY LKW & TRANSPORT SRL	company	RO	RIBITA str. CRISAN nr. 63 jud.	331081	Hunedoara	t	RO47583849	\N	\N	EUR	0	0.00	\N	f	\N	20199898	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
110bf48a-5b3d-4df3-888f-30c0316a41b6	00000000-0000-0000-0000-0000000a5b71	\N	AYMAN d.o.o.	company	SI	Dekani 003A	6271	Dekani	t	SI58883738	58883738	9004777000	EUR	30	0.00	\N	f	\N	15920230	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b8a5bebe-0685-45a5-9119-28d448a2a63d	00000000-0000-0000-0000-0000000a5b71	\N	A-Z SRL (RO-642)	company	RO	Octavian Goga 5	x	arad	t	RO1689630	1689630	\N	EUR	60	0.00	\N	f	\N	7327367	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
342ac498-fe68-467d-b78f-4257d5253bba	00000000-0000-0000-0000-0000000a5b71	\N	AZIZ MR┼¢LJAK	company	SI	─îudno selo 11	8340	─îrnomelj	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	10326472	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2ce0a33f-b7e3-416f-944e-af4c2593f043	00000000-0000-0000-0000-0000000a5b71	\N	AZO Autozentrum Oraninenburg GmbH	company	DE	Berliner str.16	16727	VELTEN	t	DE812352419	812352419	\N	EUR	30	0.00	\N	f	\N	16514296	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
68130d39-133a-42d1-8268-196912f9b496	00000000-0000-0000-0000-0000000a5b71	\N	AZONIK sp.z.o.o. (PL-616)	company	PL	Marjanskiego 3/309	15402	BIALYSTOK	t	PL5423429724	5423429724	\N	EUR	30	0.00	\N	f	\N	12239834	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
876d33da-5ba4-4def-9d36-946819f647c6	00000000-0000-0000-0000-0000000a5b71	4004911	AZtek International (GB-826)	company	GB	Albion House, 64 Vicar Lane	BD1 5AH	Bradford	t	GB790151733	\N	\N	EUR	0	0.00	\N	f	\N	6144920	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
18e69fed-afce-46f5-b928-399902629fa6	00000000-0000-0000-0000-0000000a5b71	4002739	A┼¢MAN d.o.o	company	SI	Tr┼¥a┼íka ulica 001	4248	LESCE	t	SI90433033	\N	\N	EUR	0	0.00	\N	f	\N	5183129	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3d40cb60-cc38-46c9-9b87-4c12ee7f5bac	00000000-0000-0000-0000-0000000a5b71	503563	A┼¢NOH D.O.O.	company	SI	TRG 18	2391	PREVALJE	t	SI95952748	95952748	5538564	EUR	0	0.00	\N	f	\N	503563	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f1452f6f-54ae-4ab8-9672-060dbbd7cc95	00000000-0000-0000-0000-0000000a5b71	\N	B & B, d.o.o.	company	SI	CESTA STANETA ┼¢AGARJA 027A	4000	KRANJ	t	SI11425946	11425946	5351600000	EUR	30	0.00	\N	f	\N	7327104	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0163c95a-d7d6-4782-b3fe-39c72072a017	00000000-0000-0000-0000-0000000a5b71	4004465	B & H Transport Logistik GmbH (AT-040)	company	AT	Gewerbestrasse 12	5165	Berndorf	t	ATU53998900	\N	\N	EUR	0	0.00	\N	f	\N	5875339	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e09c9131-12de-4768-b7b1-94039b46e17c	00000000-0000-0000-0000-0000000a5b71	2076756	B & L - UTRIP, d.o.o., Prebold	company	SI	Latkova vas 083A	3312	Prebold	t	SI87732068	87732068	5326460	EUR	30	0.00	\N	f	\N	2076756	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6aaadc1f-e271-4fd4-87cd-35408c1cb992	00000000-0000-0000-0000-0000000a5b71	4004033	B & S Logistics GmbH	company	AT	Wiedner Hauptstrasse 68 / Top 1	1040	Vienna	t	ATU63520844	\N	\N	EUR	0	0.00	\N	f	\N	5667201	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cf51223b-23ca-46ef-9a47-a4d3a6236b89	00000000-0000-0000-0000-0000000a5b71	1488382	B&B TRANS	company	RS	JOSIPA LIHTA 76	24000	SUBOTICA	t	RS105432516	105432516	\N	EUR	30	0.00	\N	f	\N	1488382	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
14ad8c3c-d473-4c90-b333-dfc43951a49f	00000000-0000-0000-0000-0000000a5b71	3467138	B&S-TRANS d.o.o.	company	BA	─îEHAJE 36	1111	SREBRENIK	t	BA209019420001	209019420001	\N	EUR	30	0.00	\N	f	\N	3467138	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8f979fbb-410b-4505-96e8-84828fb05498	00000000-0000-0000-0000-0000000a5b71	4007893	B. MAKOVEC TRANSPORT D.O.O.	company	SI	TOVARNI┼áKA CESTA 6 B	5270	AJDOV┼á─îINA	t	SI75774267	\N	\N	EUR	0	0.00	\N	f	\N	8112711	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e4997356-c114-4a6a-828e-8291d6a731d9	00000000-0000-0000-0000-0000000a5b71	3247422	B.HAMHUIS LANDTECHNICK GMBH	company	DE	AN DER VOSKUHLE 2	49847	ITTERBECK	t	DE117044331	117044331	\N	EUR	30	0.00	\N	f	\N	3247422	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f1bad9c1-4462-4d94-9438-6516ccb3b5e6	00000000-0000-0000-0000-0000000a5b71	\N	B.S.A. FINANCES ????	company	SI	x	1000	Ljubljana	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	18035608	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7308cad4-43b1-416d-b24f-23141b0cb1b2	00000000-0000-0000-0000-0000000a5b71	4013525	B6-Log d.o.o.	company	HR	Pru┼¥na 41	10434	STRMEC	t	HR97270388726	\N	\N	EUR	0	0.00	\N	f	\N	11799736	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2d5016cd-31ed-407e-8342-70be4d3354fb	00000000-0000-0000-0000-0000000a5b71	\N	BABIK Sp. z.o.o.	company	PL	ul.Towarowa 3	05530	Gora Kalwaria	t	PL1231092971	1231092971	\N	EUR	30	0.00	\N	f	\N	16056104	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9dc6dab1-7f9f-44aa-ae87-59fa3904883b	00000000-0000-0000-0000-0000000a5b71	579028	BABOSEK VLADO S.P.	company	SI	IVANJ┼áEVSKI VRH 0028	9245	SPODNJI IVANJCI	t	SI51505363	51505363	5435406	EUR	0	0.00	\N	f	\N	579028	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
05f64d84-da62-4137-b09c-b8a644c5cc4f	00000000-0000-0000-0000-0000000a5b71	2055191	BABY CENTER, d.o.o., Ljubljana	company	SI	Letali┼íka cesta 003C	1000	Ljubljana	t	SI66050090	66050090	5708605000	EUR	60	0.00	\N	f	\N	2055191	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
05b18502-a1ae-4bdf-8864-9441c6f225a2	00000000-0000-0000-0000-0000000a5b71	\N	BACS-EUROTRANS Kft.	company	HU	Rakoczi u29	6435	KUNBAJA	t	HU23155369	23155369	\N	EUR	60	0.00	\N	f	\N	3964860	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fbe7b1c9-e374-4b21-af31-5d37049e254d	00000000-0000-0000-0000-0000000a5b71	4006718	Ba─ìani transporti d.o.o	company	HR	Matije Gupca 28	49210	ZABOK	t	HR15481866913	\N	\N	EUR	0	0.00	\N	f	\N	6629488	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1940030c-4994-43e9-b0f2-f2100ad2d2b6	00000000-0000-0000-0000-0000000a5b71	3356172	BADARA d.o.o.	company	SI	Hmeljarska ulica 001	3310	┼¢alec	t	SI47492317	47492317	6337210000	EUR	60	0.00	\N	f	\N	3356172	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
12e29b21-268e-46b6-8e4b-c6b78ca163a3	00000000-0000-0000-0000-0000000a5b71	2271559	BAGI-TRANS d.o.o. (HR-191)	company	HR	GLAVNA 38	40313	SVETI MARTIN NA MURI	t	HR07144722790	07144722790	\N	EUR	30	0.00	\N	f	\N	2271559	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e84edeb2-cb13-496f-a82e-60d01d4b9a09	00000000-0000-0000-0000-0000000a5b71	1011810	BAJA D.O.O. (RS-688)	company	RS	Industrijska zona bb	37214	Pojate	t	RS113087152	113087152	\N	EUR	60	0.00	\N	f	\N	1011810	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5b9908f5-88ce-46bc-8b33-7af35ce404bb	00000000-0000-0000-0000-0000000a5b71	1874608	BAJI─å STOJAN, SAMOSTALNI PRIVREDNIK	company	BA	STAROG VUJADINA 110	78000	BANJALUKA	t	BA502393900008	502393900008	\N	EUR	30	0.00	\N	f	\N	1874608	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c8631b55-d05a-4c94-8c98-0f2c4df43658	00000000-0000-0000-0000-0000000a5b71	983554	BAJRAMOVI─å ┼áEFIK SP	company	SI	KOGEJEVA ULICA 0001	1000	LJUBLJANA	t	SI65154908	65154908	5707087000	EUR	0	0.00	\N	f	\N	983554	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cd522f2c-42f3-4e43-a554-10c8cf37c5a8	00000000-0000-0000-0000-0000000a5b71	2282302	BAJSI─î TRANSPORT IN LOGISTIKA, d.o.o.	company	SI	Sadjarska ulica 017	2204	Miklav┼¥ na Dravskem polju	t	SI13910582	13910582	6219004000	EUR	30	0.00	\N	f	\N	2282302	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
79441085-511b-4b4f-b972-d5cc2df05014	00000000-0000-0000-0000-0000000a5b71	3044072	BAKTER TRANS Kft	company	HU	Rona utca 7	5630	BEKES	t	HU23068285	23068285	\N	EUR	60	0.00	\N	f	\N	3044072	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4c24b8c4-e6f5-4f22-b2c1-12da05e1acb8	00000000-0000-0000-0000-0000000a5b71	546413	BALAND D.O.O.	company	SI	KAPUCINSKI TRG 7	4220	┼áKOFJA LOKA	t	SI94796823	94796823	5820901000	EUR	0	0.00	\N	f	\N	546413	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f239e4cf-a73f-4a77-9495-ad0743e78f69	00000000-0000-0000-0000-0000000a5b71	2935654	BALDO TRANSPORTI S.p.A.	company	IT	Corso Cavour, 2	37059	ZEVIO (VR)	t	IT00367150224	00367150224	\N	EUR	60	0.00	\N	f	\N	2935654	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
357acc1c-b9c0-4bdf-959b-00891a0f2330	00000000-0000-0000-0000-0000000a5b71	3802669	Balidemaj - Internationale Spedition & Logistik GmbH	company	DE	Lindauer Stra├ƒe 2-4	87600	Kaufbeuren	t	DE287347650	287347650	\N	EUR	60	0.00	\N	f	\N	3802669	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8fbcd911-2cc1-4741-95a0-e124114c0350	00000000-0000-0000-0000-0000000a5b71	\N	BALKAN EXPRES 2003 d.o.o. (RS-688)	company	RS	Filipa Kljaji─ça 25	25000	Sombor	t	RS53028287	53028287	\N	EUR	30	0.00	\N	f	\N	9584434	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
956aa048-adb0-4030-b27b-9868fd5efbe8	00000000-0000-0000-0000-0000000a5b71	2567081	BALKAN OIL d.o.o. (RS-688)	company	RS	Karadjordjeva 76	36000	KRALJEVO	t	RS104788696	104788696	\N	EUR	60	0.00	\N	f	\N	2567081	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f45c9207-5413-4ab1-a83c-ee38cafc535b	00000000-0000-0000-0000-0000000a5b71	\N	BALKAN STAR RITEIL OOD(bg)	company	BG	Rezbarska 5	1510	SOFIA	t	BG200518817	200518817	\N	EUR	30	0.00	\N	f	\N	4898835	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b9fb8633-ebe1-4c00-ba19-6ad8321dd389	00000000-0000-0000-0000-0000000a5b71	\N	BALKAN-ADRIA Logistics doo (rs-688)	company	RS	Dimitrija Tucovi─ça 74/25	11000	Beograd	t	RS104438681	104438681	\N	EUR	60	0.00	\N	f	\N	7437869	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d1966949-4410-4b13-b6b9-14a5da1e9da8	00000000-0000-0000-0000-0000000a5b71	4013644	Ballauf & Schopp Logistic GmbH	company	DE	Dieselstr. 22	85748	Garching	t	DE811 232 830	\N	\N	EUR	0	0.00	\N	f	\N	11970408	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0a0fb722-20df-4dcd-8482-c448a17bf179	00000000-0000-0000-0000-0000000a5b71	4000923	Balog d.o.o.(HR-191)	company	HR	Lovre Mata─ìi─ça bb	31500	NA┼áICE	t	HR19637898751	\N	\N	EUR	0	0.00	\N	f	\N	4310134	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
658e84ea-e8f5-477c-990d-232e16c38012	00000000-0000-0000-0000-0000000a5b71	4004511	Baltacon	company	LV	O.Vaciesa street 13	1004	RIGA	t	LV40103248435	\N	\N	EUR	0	0.00	\N	f	\N	5919394	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
36b56094-02ea-41d3-bef2-00020dfd649b	00000000-0000-0000-0000-0000000a5b71	4008088	Balter Logistics s.a.r.l.(LU-442)	company	LU	5, an de Langten	6776	Grevenmacher	t	LU21742385	\N	\N	EUR	0	0.00	\N	f	\N	7643522	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e1a83208-54e1-446e-8ac7-670d350e4bcc	00000000-0000-0000-0000-0000000a5b71	1329481	BALTH.PAPP Internationale Lebensmittellogistik KG (DE-276)	company	DE	Finsinger Feld 5	85521	Ottobrunn	t	DE129725729	DE129725729	\N	EUR	45	0.00	\N	f	\N	1329481	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0fb6277f-1241-4be0-9ebc-9a9d931ead08	00000000-0000-0000-0000-0000000a5b71	\N	BALTIC Expres LV  SIA (LV)	company	LV	Raunas str.44 k-1	1039	RIGA	t	LV40003686909	40003686909	\N	EUR	60	0.00	\N	f	\N	5453095	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
982e6841-e832-4076-9ba8-83b9780b054d	00000000-0000-0000-0000-0000000a5b71	4003785	Baltic Transline UAB (LT-440)	company	LT	Verslo g. 6, Kumpiu k.,	54311	Kauno r.	t	LT355849917	355849917	\N	EUR	60	0.00	\N	f	\N	5897103	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9d7b4a83-7a9f-43f0-84cb-1650bd47072f	00000000-0000-0000-0000-0000000a5b71	4014149	BANGROS, TRGOVINA D.O.O.	company	SI	TEHNOLO┼áKI PARK 20	1000	LJUBLJANA	t	SI55750567	\N	\N	EUR	0	0.00	\N	f	\N	12781384	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0a32cef8-e177-4ffc-825c-b6054dca0c75	00000000-0000-0000-0000-0000000a5b71	1432841	BANI─î MATJA┼¢ S.P.	company	SI	DOBRU┼áKA VAS 007A	8275	┼áKOCJAN	t	SI40690172	40690172	3875032000	EUR	30	0.00	\N	f	\N	1432841	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b853758c-4dd6-4c56-8e68-3ea4462a7d53	00000000-0000-0000-0000-0000000a5b71	\N	Banka Intesa Sanpaolo d.d.	company	SI	Pristani┼íka ulica 014	6000	Koper - Capodistria	t	SI98026305	98026305	5092221000	EUR	30	0.00	\N	f	\N	16985801	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1f45c149-8e86-4f68-bd13-4bc4ef0b66f8	00000000-0000-0000-0000-0000000a5b71	\N	BANKA KOPER d.d.	company	SI	Pristani┼íka ulica 014	6000	Koper - Capodistria	t	SI98026305	98026305	5092221000	EUR	30	0.00	\N	f	\N	3874192	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5a1d2c3e-e043-47bc-9aef-f01bea67e516	00000000-0000-0000-0000-0000000a5b71	545241	BANKO TRANSPORT D.O.O.(HR)	company	HR	Banki 28	52444	Tinjan	t	HR78169601466	78169601466	\N	EUR	60	0.00	\N	f	\N	545241	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2da874f4-e033-47bf-b0b6-9c54eafe2a41	00000000-0000-0000-0000-0000000a5b71	\N	BANSARD INTERNATIONAL ????	company	SI	X	1000	Ljubljana	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	15970333	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
971583b3-47c1-4e83-b2a5-11030460916d	00000000-0000-0000-0000-0000000a5b71	3253899	BARBARA LAMPE S.P.	company	SI	┼áarhova ulica 010	1000	Ljubljana	f	\N	98817060	6257062	EUR	30	0.00	\N	f	\N	3253899	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
987f8d70-5d7d-42fc-8e98-9fd28128f3f4	00000000-0000-0000-0000-0000000a5b71	\N	BARNY d.o.o.	company	HR	Benkova─ìko selo 85	23420	Benkovac	t	HR48671716362	48671716362	\N	EUR	30	0.00	\N	f	\N	18575827	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
02f4e809-852b-476f-8839-84766870aeaa	00000000-0000-0000-0000-0000000a5b71	\N	BARNY, prijevozni─ìki obrt	company	HR	Benkova─ìko selo 85	23420	Benkovac	t	HR28345483638	28345483638	\N	EUR	30	0.00	\N	f	\N	16763881	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7dcd16d7-f852-448a-af5c-3ba8ac56a9f9	00000000-0000-0000-0000-0000000a5b71	3406976	BARON INTERNATIONAL d.o.o.	company	SI	Obre┼¥je 004	1433	Rade─ìe	t	SI18175236	18175236	5581397000	EUR	30	0.00	\N	f	\N	3406976	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
588f5928-3cf6-4fcf-8751-a1d786d112e6	00000000-0000-0000-0000-0000000a5b71	\N	BARON TRANS ( PL-616 )	company	PL	Ul. Architektow 171A	44151	Gliwice	t	PL6311617912	6311617912	\N	PLN	30	0.00	\N	f	\N	9600736	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
15b9f9af-4b7e-493e-9788-d988a73c5250	00000000-0000-0000-0000-0000000a5b71	4000754	Barth + Co Spedition	company	DE	Siemensstr.21	41542	DORMAGEN	t	DE176877987	\N	\N	EUR	0	0.00	\N	f	\N	4272125	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3d0397df-000c-40d3-8caa-8e58315f8e80	00000000-0000-0000-0000-0000000a5b71	1715047	Barth Spedition GmbH	company	DE	Gammertinger Str. 36-40	72393	Burladingen	t	DE144836302	DE144836302	\N	EUR	30	0.00	\N	f	\N	1715047	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f953b2f1-2aa6-4215-879c-4d943d8880ec	00000000-0000-0000-0000-0000000a5b71	1065523	BARTOG d.o.o. Trebnje	company	SI	OBRTNI┼áKA ULICA 018	8210	TREBNJE	t	SI79128718	79128718	5298555000	EUR	30	0.00	\N	f	\N	1065523	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fa22dcb8-b697-4b43-a28a-95c1ed170de1	00000000-0000-0000-0000-0000000a5b71	1579832	BARTOL TRANSPORT JANEZ BARTOL S.P.	company	SI	HRIB-LO┼áKI POTOK 095A	1318	LO┼áKI POTOK	t	SI52590844	52590844	5941974	EUR	30	0.00	\N	f	\N	1579832	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d7417734-5d64-474e-aa69-83e325238b71	00000000-0000-0000-0000-0000000a5b71	\N	BAS PARTS & TYRES B.V.	company	NL	PO Box 85	5460	AB Veghel	t	NL819491780B01	819491780B01	\N	EUR	30	0.00	\N	f	\N	14243137	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
343834fc-92d0-407a-a193-6d94f2489d07	00000000-0000-0000-0000-0000000a5b71	4012018	Basamro Aachen B.V.	company	NL	Imstenraderweg 21	6422	PM Heerlen	t	NL803850165B01	\N	\N	EUR	0	0.00	\N	f	\N	10316033	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
62af415d-b461-4d72-b8b0-590376f250f9	00000000-0000-0000-0000-0000000a5b71	4008454	Basedo Steel GmbH (DE-276)	company	DE	Mettmannerstra├ƒe 51	40699	Ekrath	t	DE815501324	\N	\N	EUR	0	0.00	\N	f	\N	7888025	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cf5ac9e7-07cc-4cfb-82c8-f94379db8d50	00000000-0000-0000-0000-0000000a5b71	2991352	BASEJ d.o.o.	company	SI	CESTA V POLICO 009	4207	CERKLJE NA GORENJSKEM	t	SI78555965	78555965	3341232000	EUR	60	0.00	\N	f	\N	2991352	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2ce38bc1-4801-4ed1-b6ae-618d74e9d5ef	00000000-0000-0000-0000-0000000a5b71	1874594	BASK d.o.o.	company	SI	ROBOVA CESTA 56	1360	VRHNIKA	t	SI85847062	85847062	3988538000	EUR	30	0.00	\N	f	\N	1874594	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
747f7bad-9ec8-4578-8d2d-08c1d0e5f6eb	00000000-0000-0000-0000-0000000a5b71	4014370	BAS-TRANS, TRANSPORT IN LOGIS	company	SI	ULICA OTONA ┼¢UPAN─îI─îA 28	5280	IDRIJA	t	SI51716763	\N	\N	EUR	0	0.00	\N	f	\N	13095847	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0440b2bc-b425-432d-a745-49de16cdb8d9	00000000-0000-0000-0000-0000000a5b71	2896372	BA┼áIN d.o.o. Nova Gorica	company	SI	Ulica Milana Klemen─ìi─ìa 022	5250	Solkan	t	SI68921241	68921241	5694256000	EUR	30	0.00	\N	f	\N	2896372	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ec454ed8-b0bc-4107-ae91-229dc7318ffd	00000000-0000-0000-0000-0000000a5b71	2554429	BATI─î TRANSPORT d.o.o.	company	SI	Litijska cesta 043	1000	Ljubljana	t	SI16574648	16574648	5755760	EUR	60	0.00	\N	f	\N	2554429	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4dddc930-9932-4ac3-9f09-baa1b19daf99	00000000-0000-0000-0000-0000000a5b71	2309180	BATKI TRANS KFT	company	HU	DEAK FERENC UTCA 10	2626	NAGYMAROS	t	HU12258523	12258523	\N	EUR	30	0.00	\N	f	\N	2309180	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f49d7e19-5469-4771-b587-7b670d011358	00000000-0000-0000-0000-0000000a5b71	4001655	BATTERY-BH doo	company	BA	Marina Dr┼¥i─ça 3	71000	Sarajevo	t	BA200988560000	\N	\N	EUR	0	0.00	\N	f	\N	4670843	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7814d132-932f-4b5c-b87a-b7c8b0aab300	00000000-0000-0000-0000-0000000a5b71	4013692	Bauer Transport + Speziallogis	company	DE	Alte Mannheimer Str. 2-4	68519	Viernheim	t	DE251944192	\N	\N	EUR	0	0.00	\N	f	\N	12058095	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
eabf7a13-be06-4869-b777-147a710863df	00000000-0000-0000-0000-0000000a5b71	4007422	Bauer Transport + Speziallogis (DE-276)	company	DE	Waldstr. 182	68305	Mannheim	t	DE251944192	\N	\N	EUR	0	0.00	\N	f	\N	7028923	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9e3d2f42-c353-4ac8-a2b3-7b7f59764ea9	00000000-0000-0000-0000-0000000a5b71	4010805	BAUERFEIND, ZDRAVSTVENI PRIPO	company	SI	DOLENJSKA CESTA 242 B	1000	LJUBLJANA	t	SI97747343	\N	\N	EUR	0	0.00	\N	f	\N	9113084	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4925a626-0f93-451b-9c9c-03c185437b42	00000000-0000-0000-0000-0000000a5b71	\N	BAUHAUS d.o.o., k.d.	company	SI	Kajuhova ulica 045	1000	Ljubljana	t	SI86657593	86657593	5873002000	EUR	30	0.00	\N	f	\N	4930574	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
09b1e3c6-b93f-45c4-87c7-bc421dfbfae6	00000000-0000-0000-0000-0000000a5b71	4009830	Bauma Stone AG (BE)	company	BE	Rue Voie de Liege 20	4681	Hermalle-Sous-Argenteau	t	BE0456 409 546	\N	\N	EUR	0	0.00	\N	f	\N	8198945	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f0dd27b7-1c21-4257-a5ae-9ad10c3db632	00000000-0000-0000-0000-0000000a5b71	\N	BAUSETRA GmbH	company	DE	Handelshof 10	14478	Potsdam	t	DE138401809	138401809	\N	EUR	30	0.00	\N	f	\N	16319195	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a678f258-cbf9-49d8-b8b4-8535ba8a28d1	00000000-0000-0000-0000-0000000a5b71	\N	BAXI USLUGI TRANSPORTOWE (pl-616) ZYGMUNT BAKAJ	company	PL	UL.PLAC 1-GO MAJA 15	88-190	BARCIN	t	PL5561814808	5561814808	\N	EUR	30	0.00	\N	f	\N	7463757	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b2e24d13-56c7-4432-9e57-580fe09967be	00000000-0000-0000-0000-0000000a5b71	3259310	Bayernsped Int. Speditions GmbH (DE-276)	company	DE	Flurstrasse 38	85402	Kranzberg	t	DE251165682	251165682	\N	EUR	45	0.00	\N	f	\N	3259310	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a8205dbf-6b99-494b-a120-932a25d5b666	00000000-0000-0000-0000-0000000a5b71	4014698	BB Freights S.R.L.	company	RO	Strada Amurgului, nr.1, Birou 8+9, Etaj.2	300278	Timisoara	t	RO39680956	\N	\N	EUR	0	0.00	\N	f	\N	13698827	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7bbb1963-a507-4a25-bcc4-6bd73959e715	00000000-0000-0000-0000-0000000a5b71	4013623	BBA TRANSPORT SYSTEM	company	PL	ul. Kordeckiego 49	04-330	Warsawa	t	PL1132590157	\N	\N	EUR	0	0.00	\N	f	\N	11937046	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5f75944c-79f6-43f1-b0ad-cd7ad44d0aa7	00000000-0000-0000-0000-0000000a5b71	4016408	BBL TRANSPORT	company	FR	45 Avenue de l''Europe	59223	RONCQ	t	FR48410881148	\N	\N	EUR	0	0.00	\N	f	\N	17237816	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ac70f8c1-c7c9-41ba-902c-cdd3bd3ac715	00000000-0000-0000-0000-0000000a5b71	4017089	BBL TRANSPORT BORDEAUX	company	FR	6 RUE DE STRASBOURG Z.I. BDX FRET	33520	BRUGES	t	FR48410881148	\N	\N	EUR	0	0.00	\N	f	\N	18623538	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ebb69a2c-6677-45f5-9c64-7d5bda7c4322	00000000-0000-0000-0000-0000000a5b71	\N	BBS Jereb d.o.o.	company	SI	SON─îNI LOG 004	1370	LOGATEC	t	SI97853950	97853950	3438694000	EUR	60	0.00	\N	f	\N	7327514	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f825906f-6cc8-4bc0-9936-433dd78672d9	00000000-0000-0000-0000-0000000a5b71	2194241	BBT PETROVI─î, d.o.o.	company	SI	Bukovci 059	2281	Markovci	t	SI29551811	29551811	3678199000	EUR	30	0.00	\N	f	\N	2194241	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b51b53e2-a566-43f0-b8ca-ebdd029e3c02	00000000-0000-0000-0000-0000000a5b71	\N	BD EXPRESS s.r.o. ( SK-703)	company	SK	Svinna 482	91324	Svinna	t	SK2820010171	2820010171	\N	EUR	30	0.00	\N	f	\N	9101781	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ad63bf4d-c313-4654-8703-eec5f9370e0f	00000000-0000-0000-0000-0000000a5b71	4001699	Bechthold Transporte (DE)	company	DE	Gro├ƒer Ring 29	65550	LIMBURG	t	DE814803507	\N	\N	EUR	0	0.00	\N	f	\N	4700509	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
91946cf5-3f5f-4758-b09a-c915f83fea28	00000000-0000-0000-0000-0000000a5b71	2627845	Becker & Lietke Int. Spedition GmbH (DE-276)	company	DE	Heideweg 35	49086	Osnabr├╝ck	t	DE279698849	279698849	\N	EUR	30	0.00	\N	f	\N	2627845	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cc336904-de4b-47f0-8d42-a1a33098ed34	00000000-0000-0000-0000-0000000a5b71	540114	BECKER SPEDITION GmbH	company	DE	Gut Damme Strasse 19-21	52070	Aachen	t	DE121688996	DE121688996	\N	EUR	0	0.00	\N	f	\N	540114	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d2001937-f122-42fc-b6c7-7d7474cd437c	00000000-0000-0000-0000-0000000a5b71	3044240	BE─îAN TRANS d.o.o.	company	SI	Zvir─ìe 036	4290	Tr┼¥i─ì	t	SI15273393	15273393	5710723000	EUR	30	0.00	\N	f	\N	3044240	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d1c98228-ba67-422d-90df-919a41bcb89d	00000000-0000-0000-0000-0000000a5b71	3138490	BEDO CZ s.r.o.	company	CZ	U RENDLIKU 1904	393012	PELHRIMOV	t	CZ02928892	02928892	\N	EUR	60	0.00	\N	f	\N	3138490	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0baf5cda-1a3b-4379-86be-e10c3bab570f	00000000-0000-0000-0000-0000000a5b71	4010538	BEELOG Transporte und Logistik (AT -040)	company	AT	1. Molostrasse, Objekt 12	1110	WIEN	t	ATU72049927	\N	\N	EUR	0	0.00	\N	f	\N	8835824	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
09453daa-5af2-4a82-aff2-fd45a678b6fa	00000000-0000-0000-0000-0000000a5b71	1255411	BEFI, transport in storitve, d.o.o.	company	SI	Radmirje 107	3333	Ljubno ob Savinji	t	SI25334522	25334522	3959465000	EUR	0	0.00	\N	f	\N	1255411	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4c8261e3-1ccf-4297-9c11-b8fa2b33772e	00000000-0000-0000-0000-0000000a5b71	1731159	BEGANOVI─å TRANSPORTI d.o.o. ZENICA	company	BA	U.NIKOLE TESLE BR.5	72000	ZENICA	t	BA421872806	421872806	\N	EUR	30	0.00	\N	f	\N	1731159	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
def46545-6539-42b0-8bc1-282f0fef03cf	00000000-0000-0000-0000-0000000a5b71	3508893	BEBEN d.o.o.	company	BA	ul.svale b.b.	79101	Prijedor	t	\N	\N	\N	EUR	60	0.00	\N	f	\N	3508893	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ef7389a7-c64e-45cb-b840-23ffe4f76010	00000000-0000-0000-0000-0000000a5b71	\N	BEGRAD d.d. - v ste─ìaju	company	SI	Ko─ìevarjeva ulica 004	8000	Novo mesto	t	SI46871535	46871535	5062381000	EUR	30	0.00	\N	f	\N	5610954	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
873bf57b-d836-415a-9348-bfd1508f7705	00000000-0000-0000-0000-0000000a5b71	1391300	BEGRAD gradnje d.o.o.	company	SI	KO─îEVARJEVA ULICA 004	8000	NOVO MESTO	t	SI70676291	70676291	1252950	EUR	0	0.00	\N	f	\N	1391300	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
67d3d5ce-7cae-4b44-8e9e-8d48ab732bff	00000000-0000-0000-0000-0000000a5b71	\N	BEJA d.o.o.	company	SI	Zavrh pod ┼ámarno goro 014A	1211	Ljubljana - ┼ámartno	t	SI30606322	30606322	5474116000	EUR	30	0.00	\N	f	\N	8424899	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
afcaa84e-584d-4f6d-92ac-76e5fdb0d396	00000000-0000-0000-0000-0000000a5b71	4004110	BELAMIONIX d.o.o. Brcko	company	BA	Cerik b.b.	76000	BR─îKO	t	BA600208840004	\N	\N	EUR	0	0.00	\N	f	\N	5702466	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
903a2bb4-deb2-4a12-ba91-784a56376759	00000000-0000-0000-0000-0000000a5b71	\N	BELES d.o.o.	company	SI	─îrnomaljska cesta 005	8333	Semi─ì	t	SI65511000	65511000	3750019000	EUR	30	0.00	\N	f	\N	17279100	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f44a3666-772c-4a9f-8e82-07fdcc4cbdb7	00000000-0000-0000-0000-0000000a5b71	3532244	BELIMED d.o.o.	company	SI	Taborska cesta 038E	1290	Grosuplje	t	SI49025007	49025007	5483379000	EUR	60	0.00	\N	f	\N	3532244	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d04a4f6b-8609-49d3-9f4b-168a8e67c233	00000000-0000-0000-0000-0000000a5b71	\N	BELMARK ELEKTRO STORITVE MARKO JURMAN S.P.	company	SI	MED VINOGRADI 8	8333	SEMI─î	f	\N	25011669	9139087	EUR	30	0.00	\N	f	\N	13565578	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
778cc15f-ec2a-42b8-8474-650f2fc70b93	00000000-0000-0000-0000-0000000a5b71	3172977	Belokranjski hram d.o.o.	company	SI	Ulica Staneta Rozmana 016	8340	─îrnomelj	t	SI10920765	10920765	6606300000	EUR	60	0.00	\N	f	\N	3172977	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e827b612-7e8d-45ba-8bcb-3eef481487d6	00000000-0000-0000-0000-0000000a5b71	\N	Belschinger GmbH	company	DE	An der Ascher Str. 8c	95182	D├Âhlau OT Tauperlitz	t	de328056858	DE328056858	\N	EUR	30	0.00	\N	f	\N	16251497	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a0d18487-cb08-4aa6-9f76-293ab02cdff1	00000000-0000-0000-0000-0000000a5b71	4000624	BELUS Solutions GmbH & Co.KG (DE-276)	company	DE	Markircher Str. 2	68229	MANNHEIM	t	DE814703021	\N	\N	EUR	0	0.00	\N	f	\N	4187817	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
552427e1-9e90-42f6-99d9-f4eb1dc9ba3f	00000000-0000-0000-0000-0000000a5b71	4008107	Bemefreight Sarl (LU-442)	company	LU	48-52 Rue du Canal	4050	ESCH-SUR-ALZETTE	t	LU25956945	\N	\N	EUR	0	0.00	\N	f	\N	7692000	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9871c70a-1f12-443c-8085-48a12501a787	00000000-0000-0000-0000-0000000a5b71	2033631	BENATI TRANS Kft.	company	HU	BUDAI UT 20.FSZ 5	2030	ERD	t	HU14910191	14910191	\N	EUR	30	0.00	\N	f	\N	2033631	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
79b77bf5-b67f-441a-9819-2dde8b37808a	00000000-0000-0000-0000-0000000a5b71	3047608	Benedikt Heine GmbH & Co. KG Spedition	company	DE	Am Hogenberg 3	88239	Wangen-Haslach	t	DE147359133	147359133	\N	EUR	45	0.00	\N	f	\N	3047608	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
31b8ebd0-ccef-4ef8-bb86-9d65abcbc309	00000000-0000-0000-0000-0000000a5b71	\N	BENELA d.o.o.	company	HR	Vara┼¥dinska ulica odv.II 13	42000	Jalkovec	t	HR52580548740	52580548740	\N	EUR	30	0.00	\N	f	\N	14650287	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
796cbb60-2685-4015-84f4-4b14aaf9fd72	00000000-0000-0000-0000-0000000a5b71	1599841	BENIGAR d.o.o.	company	SI	SMLEDNI┼áKA CESTA 018	4000	KRANJ	t	SI52541240	52541240	5560349000	EUR	30	0.00	\N	f	\N	1599841	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e57c8b4f-8929-44bb-9aae-6f81ad07fbf7	00000000-0000-0000-0000-0000000a5b71	\N	BENITRANS, BENJAMIN O─îKO S.P.	company	SI	Dolnje Brezovo 019D	8283	Blanca	t	SI61840475	61840475	1748998000	EUR	30	0.00	\N	f	\N	12088359	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3f1795e3-a889-48d7-a03b-d8525f573f00	00000000-0000-0000-0000-0000000a5b71	1827282	BENIX, s.r.o. (SK-703)	company	SK	Michalska 19	81103	Bratislava	t	SK2020358153	SK2020358153	\N	EUR	30	0.00	\N	f	\N	1827282	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5141c740-3e8f-496a-b300-1988eaaf530c	00000000-0000-0000-0000-0000000a5b71	\N	BENKO-TEHNA Puconci d.o.o.	company	SI	Puconci 403	9201	Puconci	t	SI39579026	39579026	5472253000	EUR	30	0.00	\N	f	\N	5668831	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5cc80a5a-980f-4653-a648-e23ab1428f1e	00000000-0000-0000-0000-0000000a5b71	\N	BENOL d.o.o.	company	SI	I┼¥anska cesta 261A	1000	Ljubljana	t	SI65405510	65405510	6442242000	EUR	60	0.00	\N	f	\N	6590174	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d4e6382d-3d15-4f1a-9740-d0153ecd4e8a	00000000-0000-0000-0000-0000000a5b71	614481	BENTON MATJA┼¢ GRIL S.P.	company	SI	SOKOLSKI TRG 0013	8350	DOLENJSKE TOPLICE	t	SI27686973	27686973	1795970	EUR	0	0.00	\N	f	\N	614481	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
037ef010-fbd4-4558-9a0a-c398e2c32341	00000000-0000-0000-0000-0000000a5b71	3545842	BENUSSI d.o.o.	company	SI	Cvetkova ulica 001	1000	Ljubljana	t	SI15937488	15937488	6272070000	EUR	30	0.00	\N	f	\N	3545842	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
75fc4e0f-17ee-4c4b-8215-1ce32e62639a	00000000-0000-0000-0000-0000000a5b71	2892742	BENYTRADE d.o.o.	company	SI	Tr┼¥a┼íka cesta 043	2000	Maribor	t	SI98761307	98761307	5779065000	EUR	30	0.00	\N	f	\N	2892742	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4d750d03-336b-4b04-af01-06fc381832ee	00000000-0000-0000-0000-0000000a5b71	\N	BENZ d.o.o. (ba-070)	company	BA	Jakupovci b.b.	78250	LAKTA┼áI	t	BA401140920001	401140920001	\N	EUR	60	0.00	\N	f	\N	4711994	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4781ac0f-2795-43e2-a39f-d1acbca4dbf9	00000000-0000-0000-0000-0000000a5b71	3546615	BERNOBI─å Transport Sebastjan Bernobi─ç	company	HR	Markovac 20	52463	Vi┼ínjan (Visignano)	t	HR47430589185	47430589185	\N	EUR	60	0.00	\N	f	\N	3546615	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1e41719a-c1a8-4f09-a061-1238b81ef219	00000000-0000-0000-0000-0000000a5b71	\N	BERRYSHKA d.o.o.	company	SI	┼áentvid pri Sti─ìni 152	1296	┼áentvid pri Sti─ìni	t	SI22324437	22324437	8240051000	EUR	30	0.00	\N	f	\N	15002940	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8b11e090-c7df-4033-a1a5-4441cd8c0a13	00000000-0000-0000-0000-0000000a5b71	1863618	BERTO CAMLEK d.o.o.	company	SI	PODKRAJ PRI VELENJU 046B	3320	VELENJE	t	SI95415521	95415521	3986730000	EUR	30	0.00	\N	f	\N	1863618	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0cd07205-288c-47f8-9ba2-dd4acc3d69ba	00000000-0000-0000-0000-0000000a5b71	2316521	BERTRANS S.A.	company	PL	UL.MSZSZONOWSKA 36	96200	RAWA MAZOWIECKA	t	PL5751577062	5751577062	\N	EUR	30	0.00	\N	f	\N	2316521	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2c478aba-5aeb-444f-8d86-a1ca5606f4c5	00000000-0000-0000-0000-0000000a5b71	4008358	Bertrans Sped Kft. (HU-348)	company	HU	Dugonics utca 11	1043	Budapest	t	HU11422992	\N	\N	EUR	0	0.00	\N	f	\N	7828961	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2eb21dda-8e20-4eaa-a371-4efa4595efd8	00000000-0000-0000-0000-0000000a5b71	1821409	BERTSCHI, d.o.o., Ljubljana	company	SI	LETALI┼áKA CESTA 015	1000	LJUBLJANA	t	SI69049246	69049246	5925894000	EUR	15	0.00	\N	f	\N	1821409	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fddf4111-a08a-494e-bc3a-ea22e768f659	00000000-0000-0000-0000-0000000a5b71	\N	BERUS d.o.o.	company	SI	Podbev┼íkova ulica 1	8000	Novo mesto	t	SI51467682	51467682	\N	EUR	30	0.00	\N	f	\N	16231378	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cce83993-85ce-461b-aef0-29b043525c54	00000000-0000-0000-0000-0000000a5b71	\N	BERZENCE TRANS Fuvarozo Kft.(hu)	company	HU	Szent Imre u.47	7516	BERZENCE	t	HU13557186	13557186	\N	EUR	60	0.00	\N	f	\N	4693319	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e2ed0418-8b96-4c23-af4a-cac3f10e923c	00000000-0000-0000-0000-0000000a5b71	4001523	BERZENCE TRANS KFT.	company	HU	V├ír u. 12.	8800	NAGYKANIZSA	t	HU13557186	\N	\N	EUR	0	0.00	\N	f	\N	19291596	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3a9e429c-96d0-484c-8db9-b9dcc8de4f3b	00000000-0000-0000-0000-0000000a5b71	2325542	BESLA─å TRANS d.o.o. (RS)	company	RS	Mile Dimitrijevi─ç 26	11273	BATAJNICA	t	RS104162772	104162772	\N	EUR	30	0.00	\N	f	\N	2325542	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bfd767df-ef0e-4ada-936e-e5891af4533e	00000000-0000-0000-0000-0000000a5b71	\N	BEST IN PARKING MARIBOR D.O.O ???????	company	SI	x	2000	Maribor	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	18794853	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
02c6a5ae-d5ca-4275-97f2-20c96c112afd	00000000-0000-0000-0000-0000000a5b71	4013642	BEST LOGISTIC GmbH & Co. KG	company	DE	Innstr. 28	68199	MANNHEIM	t	DE813001749	\N	\N	EUR	0	0.00	\N	f	\N	12030331	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d4e094ad-79b1-4ce0-b476-548029122c3e	00000000-0000-0000-0000-0000000a5b71	4015972	Best Logistik GmbH	company	AT	Endach 34	6330	Kufstein	t	ATU69717808	\N	\N	EUR	0	0.00	\N	f	\N	16224916	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
af8f1667-fb52-40d6-9cdd-689baf87291a	00000000-0000-0000-0000-0000000a5b71	\N	BEST LOGISTIKA j.d.o.o. (HR-191)	company	HR	Savska cesta 41	10000	Zagreb	t	HR49523429488	49523429488	\N	EUR	30	0.00	\N	f	\N	9210226	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
33aa7f6f-fe6f-4304-95d7-07b43cdf9493	00000000-0000-0000-0000-0000000a5b71	4005114	Best Performance Logistics Sp. (PL-616)	company	PL	Mickiewicza 36A	01-616	Warsawa	t	PL5213680300	\N	\N	EUR	0	0.00	\N	f	\N	6260561	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
865f3726-4e5e-4382-ad8b-3963fbd4a835	00000000-0000-0000-0000-0000000a5b71	\N	BESTE TRANS Kft (hu)	company	HU	Kiskorosi ut 18-20	6000	Kecskemet	t	HU23330827	23330827	\N	EUR	60	0.00	\N	f	\N	5058140	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c9d46acc-83eb-4ed6-a54b-23b3ff0d6d7e	00000000-0000-0000-0000-0000000a5b71	4014283	Beta Trans BTLog S.R.L	company	RO	DEVA, Str.Ciprian Porumbescu,bl.17, sc.D,ap.5	307200	Ghiroda	t	RO17883160	\N	\N	EUR	0	0.00	\N	f	\N	12986491	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3403f330-eb3a-4013-9e44-a100ebd20a00	00000000-0000-0000-0000-0000000a5b71	972052	BETRANS LINE D.O.O.	company	SI	SRGA┼áI 0033	6274	┼áMARJE	t	SI75360918	75360918	5831547	EUR	0	0.00	\N	f	\N	972052	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dec9251e-7ad0-450e-955c-c64d71fe4c3d	00000000-0000-0000-0000-0000000a5b71	\N	Bettina Ostermayer	company	DE	Lilibell, Kielbarg 5	22397	Hamburg	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	13932660	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a67c0127-cf6e-4500-8eda-669135ddd87f	00000000-0000-0000-0000-0000000a5b71	579042	BETULA METLIKA D.O.O.	company	SI	VINOGRADNI┼áKA CESTA 0021A	8330	Metlika	t	SI67862098	67862098	2044404	EUR	0	0.00	\N	f	\N	579042	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8a9f97fc-c972-4b53-8629-b46f0bf2de91	00000000-0000-0000-0000-0000000a5b71	740120	BETZ INTERNATIONAL GMBH	company	DE	Max Planck Strasse 77	72766	Reutlingen	t	DE158220722	DE158220722	\N	EUR	0	0.00	\N	f	\N	740120	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f9b7654c-2ae7-437d-8773-5ab1c3553a73	00000000-0000-0000-0000-0000000a5b71	3800023	Bexter Cargo S.L.	company	ES	c/Micenas 54, Apartado Correos 142	28232	Las Rozas (Madrid)	t	ESB85642478	B85642478	\N	EUR	45	0.00	\N	f	\N	3800023	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0d0163c2-35e5-483c-ab2b-3a888c35d3db	00000000-0000-0000-0000-0000000a5b71	\N	BEZIRKSHAUPTANNSCHAFT TAMSWEG (AT-040)	company	AT	KAPUZINERPLATZ 1	5580	TAMSWEG	t	ATU36796400	ATU36796400	\N	EUR	30	0.00	\N	f	\N	8007746	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
018b29c3-47bc-46f6-823c-45630667660e	00000000-0000-0000-0000-0000000a5b71	4015720	bgm express logistik GmbH	company	DE	Stuttgarter Stra├ƒe 59	74321	Bietigheim-Bissingen	t	DE301261245	\N	\N	EUR	0	0.00	\N	f	\N	15728273	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
50929a89-3e51-4188-bc2b-846dbd463b5b	00000000-0000-0000-0000-0000000a5b71	4008000	BGP gradnje d.o.o. Gradac	company	SI	GRADAC 135	8332	GRADAC	t	SI55558224	55558224	\N	EUR	0	0.00	\N	f	\N	9158934	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
60155ee8-c73d-441d-8b85-206db754a1e1	00000000-0000-0000-0000-0000000a5b71	\N	BGS ÔÇô REVIZIJA d.o.o.	company	SI	Ljubljanska cesta 041	8000	Novo mesto	t	SI24030651	24030651	8103712000	EUR	30	0.00	\N	f	\N	9498818	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8e17335a-b385-45e5-8451-732534b5bfcc	00000000-0000-0000-0000-0000000a5b71	\N	BGT GLOBAL d.o.o.	company	SI	Pokopali┼íka cesta 002	1230	Dom┼¥ale	t	SI25961748	25961748	7216211000	EUR	30	0.00	\N	f	\N	19072401	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e05721da-c0b6-40e1-813a-d539faf1ddeb	00000000-0000-0000-0000-0000000a5b71	\N	BH TRUCKS d.o.o. (BA)	company	BA	iSMETA Alajbegovi─ça ┼áerbe 3	x	SARAJEVO	t	BA4201948470004	4201948470004	\N	EUR	60	0.00	\N	f	\N	6644789	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
279d8d54-090f-4861-b7d9-9b5066f50d7f	00000000-0000-0000-0000-0000000a5b71	2774316	BHL d.o.o. CAZIN	company	BA	Slatinski put b,b,	77220	CAZIN	t	BA4263650310000	4263650310000	\N	EUR	60	0.00	\N	f	\N	2774316	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e5e50c0a-7746-43b9-a372-568ac3107b1c	00000000-0000-0000-0000-0000000a5b71	3433778	BHS TRANS Kft	company	HU	Hell utca 1	3800	Szikszo	t	HU23196081	23196081	\N	EUR	60	0.00	\N	f	\N	3433778	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
50180177-6d34-4799-a4a5-417523112d94	00000000-0000-0000-0000-0000000a5b71	4012704	Biewer Logistik GmbH	company	DE	Hans-B├Âckler-Stra├ƒe 3	56070	Koblenz	t	DE149276357	\N	\N	EUR	0	0.00	\N	f	\N	10926540	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e693f52d-3973-4d3a-983a-5e731eb9dc10	00000000-0000-0000-0000-0000000a5b71	583400	BIG BANG, D.O.O.	company	SI	┼áMARTINSKA 152,HALA 0005I	1000	LJUBLJANA	t	SI18224326	18224326	5464943000	EUR	0	0.00	\N	f	\N	583400	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
596d033f-009e-4055-8604-4dc9f5f2cbda	00000000-0000-0000-0000-0000000a5b71	\N	BIJELI , vl. ALEN ┼áTIKS (hr) Prijevozni─ìki obrt	company	HR	Sajmi┼ína 2	44322	Lipovljani	t	HR97608222096	97608222096	\N	EUR	60	0.00	\N	f	\N	6334664	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
81a7e67c-2120-4478-bc3a-7dd5b7e03cb0	00000000-0000-0000-0000-0000000a5b71	\N	BILBAN d.o.o.	company	SI	Poslovna cona A 010	4208	┼áen─ìur	t	SI32639775	32639775	5314453000	EUR	30	0.00	\N	f	\N	16775537	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f307c577-ca0a-48b6-9652-e98c5b687e23	00000000-0000-0000-0000-0000000a5b71	490009	BILBIJA VESNA S.P.	company	SI	LIPCE 25	4273	BLEJSKA DOBRAVA	t	SI42828538	42828538	3357864	EUR	0	0.00	\N	f	\N	490009	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3213fe5f-66bd-4118-b484-9bdf6549b181	00000000-0000-0000-0000-0000000a5b71	\N	BIM Express d.o.o. (HR-191)	company	HR	Matije Gupca 16	40000	─îakovec	t	HR37143989119	37143989119	\N	EUR	30	0.00	\N	f	\N	11077910	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3e3bd53b-edec-4190-b7d9-7cc333dfaf5b	00000000-0000-0000-0000-0000000a5b71	663960	BINAL TRANSPORT D.O.O.	company	SI	PARI┼¢LJE 58	3314	BRASLOV─îE	t	SI26429527	26429527	2258030000	EUR	0	0.00	\N	f	\N	663960	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1f969121-83bd-4a96-aebb-a25f42ed0bc6	00000000-0000-0000-0000-0000000a5b71	\N	BINTRANS d.o.o.	company	SI	┼álandrova ulica 003	3250	Roga┼íka Slatina	t	SI94711950	94711950	8370117000	EUR	30	0.00	\N	f	\N	8061137	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
63f3c7fe-8571-421e-bf9f-678247cd1163	00000000-0000-0000-0000-0000000a5b71	\N	BIO M.B. d.o.o.	company	HR	Dubrava 122	10000	Zagreb	t	HR16224488895	16224488895	\N	EUR	30	0.00	\N	f	\N	10445469	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e6bbadde-9d80-4532-9630-ab7ac06dac48	00000000-0000-0000-0000-0000000a5b71	4010770	Bio Peleti Energija d.o.o. (HR-191)	company	HR	┼¢akanje 58	47276	┼¢akanje	t	HR51911297606	\N	\N	EUR	0	0.00	\N	f	\N	9101674	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0ccba665-5404-418c-bade-f48f18ece1bd	00000000-0000-0000-0000-0000000a5b71	4015134	Biocodex Oy	company	FI	Mets├ñnneidonkuja 8	02130	Espoo	t	FI05801587	\N	\N	EUR	0	0.00	\N	f	\N	14649473	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cc4ad513-e767-456f-b163-c3bffc1d99ac	00000000-0000-0000-0000-0000000a5b71	1082651	BIOENERG d.o.o.	company	SI	CESTA TALCEV 008	1230	DOM┼¢ALE	t	SI84815124	84815124	2034182	EUR	0	0.00	\N	f	\N	1082651	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ef060942-9fdc-43cf-a841-9cd1b0ddde73	00000000-0000-0000-0000-0000000a5b71	4016748	Bioles Horizont d.o.o.	company	SI	Kor─ìetova ulica 5	2000	MARIBOR	t	SI76107027	\N	\N	EUR	0	0.00	\N	f	\N	17921736	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
503353fb-e671-4d9e-b7c2-35d0422d4c50	00000000-0000-0000-0000-0000000a5b71	\N	BIRING IT d.o.o.	company	SI	┼ápruha 019	1236	Trzin	t	SI44523793	44523793	2195291000	EUR	30	0.00	\N	f	\N	4674400	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6ced3b3b-2062-4452-9640-50360b486d29	00000000-0000-0000-0000-0000000a5b71	\N	BIROTEHNA d.o.o.	company	SI	Litijska cesta 259	1261	Ljubljana - Dobrunje	t	SI48671959	48671959	5925983000	EUR	30	0.00	\N	f	\N	4133125	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9ee5f29a-6e1e-41e4-996d-8718549f4c18	00000000-0000-0000-0000-0000000a5b71	774970	BISER D.O.O. CERKNO	company	SI	RAVNE PRI CERKNEM 0046	5282	CERKNO	t	SI76713113	76713113	5692059000	EUR	0	0.00	\N	f	\N	774970	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ef69c696-9f11-4d93-843b-3b02522d0385	00000000-0000-0000-0000-0000000a5b71	1229620	Bisnode d.o.o.	company	SI	LIKOZARJEVA ULICA 003	1000	LJUBLJANA	t	SI27086461	27086461	1786393000	EUR	0	0.00	\N	f	\N	1229620	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
17d1a826-573f-4513-bdcb-c4483861de1d	00000000-0000-0000-0000-0000000a5b71	4016622	Bisol d.o.o.	company	SI	Latkova vas 59	3312	PREBOLD	t	SI58719555	\N	\N	EUR	0	0.00	\N	f	\N	17689717	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
06c1bfaa-248d-486b-bb2d-1b8d304f2caa	00000000-0000-0000-0000-0000000a5b71	\N	BISPEL Sp z.o.o.  (PL-616)	company	PL	ul. Mickiewicza 36A	01-616	Warszawa	t	PL1132939594	1132939594	\N	EUR	30	0.00	\N	f	\N	10471338	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
178ab484-0096-4029-8836-a6c377f5926c	00000000-0000-0000-0000-0000000a5b71	4012039	Bispel sp. z o.o.	company	PL	Mickiewicza 36A	01-616	Warsawa	t	PL1132939594	\N	\N	EUR	0	0.00	\N	f	\N	11307472	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bc00731b-3592-4aa3-94f8-073256ed7b7d	00000000-0000-0000-0000-0000000a5b71	594036	Bittermann Daylight KG	company	DE	Dr. Muller Strasse 26	92637	Weiden i.d. Opf.	t	DE250 634 64	DE250 634 64	\N	EUR	0	0.00	\N	f	\N	594036	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4f5a31a0-4903-4e8c-8cea-fc1465e04c77	00000000-0000-0000-0000-0000000a5b71	\N	BK4 d.o.o.	company	SI	Ulica bratov Kralji─ì 004	1000	Ljubljana	t	SI78196957	78196957	5540364000	EUR	30	0.00	\N	f	\N	11850915	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1210f35a-d57e-4820-8f30-e5e1f0bb80b8	00000000-0000-0000-0000-0000000a5b71	1390973	BKP spol. s.r.o.	company	SK	L. Podjavorinskej 3b	915 01	Nove Mesto nad Vahom	t	SK2020183319	SK2020183319	\N	EUR	0	0.00	\N	f	\N	1390973	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d5e2ace0-a4d1-4717-b158-6ba7c6b508c5	00000000-0000-0000-0000-0000000a5b71	\N	BKS-leasing, d.o.o.	company	SI	Dunajska cesta 161	1000	Ljubljana	t	SI14702215	14702215	5935539000	EUR	30	0.00	\N	f	\N	5256913	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d57e412c-d2a1-4ee9-bf14-248f44d512d0	00000000-0000-0000-0000-0000000a5b71	4017587	BL Transport	company	BA	Lazari─ìka 1	78000	BANJA LUKA	t	BA403852230004	\N	\N	EUR	0	0.00	\N	f	\N	19895178	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ba631f2d-f02c-4003-bb12-9b97805b3bd9	00000000-0000-0000-0000-0000000a5b71	4013144	Blackbird Roadfreight B.V.	company	NL	Hoeksteen 18	2132 MS	Hoofddorp	t	NL860467065B01	\N	\N	EUR	0	0.00	\N	f	\N	11336756	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
64aaa619-ecd6-4b43-82ee-a9e4e8f1480a	00000000-0000-0000-0000-0000000a5b71	\N	Blackblox d.o.o.	company	SI	Mijav─ìeva ulica 016	1291	┼ákofljica	t	SI71393897	71393897	5997321000	EUR	30	0.00	\N	f	\N	12627788	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3cf25e8f-5e09-4f72-b231-587950191d7e	00000000-0000-0000-0000-0000000a5b71	\N	Blashko Delov	company	SI	Dobru┼ía 3	1217	Vodice	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	8559434	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
49b605d7-4186-4acb-b620-8c7628d864d5	00000000-0000-0000-0000-0000000a5b71	1866576	BLATE┼áI─å TRANSPORT d.o.o.(BA-070)	company	BA	JOVANA DU─îI─åA 11	78430	PRNJAVOR	t	BA401588470007	401588470007	\N	EUR	60	0.00	\N	f	\N	1866576	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
17463a78-cff1-4d88-85ca-22545aaeee13	00000000-0000-0000-0000-0000000a5b71	\N	BLA┼¢ BEN─îINA S.P.	company	SI	Zajel┼íe 026	1262	Dol pri Ljubljani	t	SI10983376	10983376	1449664000	EUR	30	0.00	\N	f	\N	19498203	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
57c75e68-439e-4d61-9b0d-b51f289a58cf	00000000-0000-0000-0000-0000000a5b71	\N	Bla┼¥ Strehovec s.p.	company	SI	Gora pri Komendi 010	1218	Komenda	t	SI90065085	90065085	6085857000	EUR	30	0.00	\N	f	\N	11325958	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
29b254be-c545-483b-9e33-2296c084c052	00000000-0000-0000-0000-0000000a5b71	2526706	Bleky d.o.o. (HR)	company	HR	Zagreba─ìka 16	51000	RIJEKA	t	HR19636580055	19636580055	\N	EUR	45	0.00	\N	f	\N	2526706	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
43a25cec-53de-470a-9dc2-ba03917a510f	00000000-0000-0000-0000-0000000a5b71	\N	BLITEB, d.o.o., Kranj	company	SI	Kolodvorska cesta 004	4000	Kranj	t	SI61889024	61889024	5451264000	EUR	30	0.00	\N	f	\N	9216633	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bc0ed247-8ff0-4123-802c-ac53b567964c	00000000-0000-0000-0000-0000000a5b71	4017719	BLU Logistics d.o.o.	company	SI	Brn─ìi─ìeva ulica 17a	1231	LJUBLJANA - ─îRNU─îE	t	SI24417106	\N	\N	EUR	0	0.00	\N	f	\N	20247469	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9acf8580-1c5c-4c49-be0f-d0cd7c95f437	00000000-0000-0000-0000-0000000a5b71	\N	BLU LOGISTICS d.o.o.	company	SI	Brn─ìi─ìeva ulica 017A	1231	Ljubljana - ─îrnu─ìe	t	SI24417106	24417106	7360401000	EUR	30	0.00	\N	f	\N	19962021	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
478432f2-07bc-48e8-a6f0-5cde18599ba6	00000000-0000-0000-0000-0000000a5b71	4000447	Blue Frigo Logistics  sp.zoo.	company	PL	Ul. Malkowskiego 30/1	70-304	Szczecin	t	PL8522611439	\N	\N	EUR	0	0.00	\N	f	\N	4148924	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
45c6fe83-f3c5-4301-a0f8-8d9527e878f2	00000000-0000-0000-0000-0000000a5b71	4007218	Blue Water Shipping (DK-208)	company	DK	Ventrupparken 8b	2670	GREVE	t	DK40516611	\N	\N	EUR	0	0.00	\N	f	\N	6911342	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
dabc5625-a6c5-4c93-a59c-10dd6fd7b65d	00000000-0000-0000-0000-0000000a5b71	2602662	BLUMEN MARKET DOO (RS)	company	RS	Misarska 11	34300	ARANDJELOVAC	t	RS102202189	102202189	\N	EUR	30	0.00	\N	f	\N	2602662	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2363af8a-fc52-46dd-b095-c326a89c96d4	00000000-0000-0000-0000-0000000a5b71	\N	BLUNA ┼áPED OD (RS)	company	RS	Save Kova─ìevi─ça	36300	Novi Pazar	t	RS102496700	102496700	\N	EUR	60	0.00	\N	f	\N	5517051	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6a8a9479-d77e-4662-863b-33fa6f597a5c	00000000-0000-0000-0000-0000000a5b71	4013021	BM Interfreight B.V.	company	NL	Koekoeksedijk 11 C	4761 RG	Zevenbergen	t	NL855948814B01	\N	\N	EUR	0	0.00	\N	f	\N	11262083	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7d1681cd-f53d-4caa-b81b-08d1199a8934	00000000-0000-0000-0000-0000000a5b71	1320840	BM LORRAINE	company	FR	BD DE LA SOLIDARITE, BP 25110	57073	METZ CEDEX 3	t	FR83302180955	FR8330218095	\N	EUR	0	0.00	\N	f	\N	1320840	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2ce61735-1b40-41e6-97f8-6990f1b21128	00000000-0000-0000-0000-0000000a5b71	\N	BM ┼áPED d.o.o. (BA-070)	company	BA	Ilindanska 11	88220	┼áiroki Brijeg	t	BA272294330008	272294330008	\N	EUR	30	0.00	\N	f	\N	11130844	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f933014c-a789-45eb-a5d1-53b594567dc1	00000000-0000-0000-0000-0000000a5b71	4017375	BM TRANS d.o.o.	company	SI	Polene 28a	3210	SLOVENSKE KONJICE	t	SI85197475	85197475	\N	EUR	0	0.00	\N	f	\N	19291601	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6f5acce2-b910-46f5-b0d2-2fd4f57c7e59	00000000-0000-0000-0000-0000000a5b71	3584997	BMD LOG d.o.o.(hr)	company	HR	Bedenica 45a	10381	Bedenica	t	HR16282327650	16282327650	\N	EUR	60	0.00	\N	f	\N	3584997	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
50be4080-cc39-44b7-a930-3924cb3c2db0	00000000-0000-0000-0000-0000000a5b71	503575	BMTS TRANS-SERVIS D.O.O. (HR-191)	company	HR	PAKRA─îKA 4	4200	VARA┼¢DIN	t	HR99974697179	99974697179	\N	EUR	0	0.00	\N	f	\N	503575	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7188085d-8337-4501-9425-ae08cdcee6a1	00000000-0000-0000-0000-0000000a5b71	1405173	BN - TRANSPORT d.o.o.	company	SI	NA GRI─îU 001	3202	LJUBE─îNA	t	SI20969279	20969279	3510077000	EUR	0	0.00	\N	f	\N	1405173	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3998db02-8c3b-45d2-89e6-6219a764a97d	00000000-0000-0000-0000-0000000a5b71	\N	BNC GmbH	company	DE	Marie Curie str.36	73230	KIRCHHEIM UNTER TECK	t	DE815328920	815328920	\N	EUR	30	0.00	\N	f	\N	15178837	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c5422204-8661-4169-9693-2e4b8a90648d	00000000-0000-0000-0000-0000000a5b71	3301463	BNM d.o.o.	company	SI	Ulica 1. maja 004	8330	Metlika	t	SI73850900	73850900	6279228000	EUR	30	0.00	\N	f	\N	3301463	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
37345e8e-6008-4cd0-9f33-566613226b4f	00000000-0000-0000-0000-0000000a5b71	\N	BNS Bernes (de-276)-Nutzfahrzeug - Service MAN	company	DE	IM Seinfental 7	53498	BAD BREISIG	t	DE122497042	122497042	\N	EUR	30	0.00	\N	f	\N	6146966	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9ef504bd-014f-4a94-9838-8a790c4326ff	00000000-0000-0000-0000-0000000a5b71	1435663	BO - TISK, d.o.o.	company	SI	Tr┼¥a┼íka cesta 002	1000	LJUBLJANA	t	SI32928661	32928661	5910331	EUR	30	0.00	\N	f	\N	1435663	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f7262860-6bd6-481a-a6d1-af45364044ed	00000000-0000-0000-0000-0000000a5b71	2910983	BOARD KLUB WINTERSTICK	company	SI	Pod klancem 009A	1000	Ljubljana	f	\N	24289485	1826115	EUR	30	0.00	\N	f	\N	2910983	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e73cad8b-9fdf-44bf-bf86-34a1627f5432	00000000-0000-0000-0000-0000000a5b71	1526731	BOBANA TRANSPORTI (BiH)	company	BA	GORNJI GOREVCI BB	79101	PRIJEDOR	t	1846850	1846850	\N	EUR	30	0.00	\N	f	\N	1526731	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ff7d3ad6-5235-421d-84e7-4e05cf44c41e	00000000-0000-0000-0000-0000000a5b71	458077	BODNAR TRANS KFT.	company	HU	ER U.5	1037	Budapest	t	HU13266042	13266042	\N	EUR	0	0.00	\N	f	\N	458077	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0fb17d10-ef62-4f0b-a5a2-3c2f1f4bb9e5	00000000-0000-0000-0000-0000000a5b71	4003586	Boecker International, Inhaber	company	DE	Starenweg 55	59469	Ense-Parsit	t	DE297983490	\N	\N	EUR	0	0.00	\N	f	\N	5509260	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1c420087-3af7-4301-812c-601d68a3cadb	00000000-0000-0000-0000-0000000a5b71	\N	BOEKESTIJN Fashion Logistics (nl)	company	NL	Eerste Industrieweg 28	5450	AB MILL	t	NL802708328B01	802708328B01	\N	EUR	60	0.00	\N	f	\N	5528129	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e39fff2d-ec1f-4b90-ae5d-d7cc4b9e326d	00000000-0000-0000-0000-0000000a5b71	\N	BOERS GmbH	company	DE	Sunderhookerweg 12	48599	Geohau-Epe	t	DE813374781	813374781	\N	EUR	30	0.00	\N	f	\N	19938430	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
0e810506-7165-466b-81de-48d2c797f15b	00000000-0000-0000-0000-0000000a5b71	\N	BOGACZ TRANSPORT Damian Bogacz(pl)	company	PL	Falniow 23	32200	MIECHOW	t	PL6591434229	6591434229	\N	EUR	60	0.00	\N	f	\N	6815054	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f169f05a-a992-4509-8cf3-d651a47e995e	00000000-0000-0000-0000-0000000a5b71	579133	BOGATAJ VENCESLAV S.P.	company	SI	GR─îAREVEC 0011	1370	LOGATEC	t	SI45529272	45529272	5222797	EUR	0	0.00	\N	f	\N	579133	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e88dd1e4-85cb-4ee6-ac58-42fb16aed2eb	00000000-0000-0000-0000-0000000a5b71	\N	BOGDAN PETRI┼áI─î S.P.	company	SI	Dednja vas 001	8255	Pi┼íece	t	SI55205453	55205453	1800299000	EUR	30	0.00	\N	f	\N	7945603	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7a611d13-4d23-4c1b-a555-ad93d4b40cba	00000000-0000-0000-0000-0000000a5b71	\N	BOGDAN ┼¢ALJEC S.P.	company	SI	Zilje 027	8344	Vinica	t	SI35601515	35601515	6904785000	EUR	20	0.00	\N	f	\N	18340663	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
936d12e2-3c9a-42c0-8dd6-74e351586867	00000000-0000-0000-0000-0000000a5b71	2431107	BOGDANOVIC TRANSPORT	company	CH	WAESSERWIESENSTRASSE 88	8408	WINTERTHUR	t	CH02010637321	02010637321	\N	EUR	30	0.00	\N	f	\N	2431107	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e150934c-2cfa-47b1-a1c5-8d0da4b454c5	00000000-0000-0000-0000-0000000a5b71	2869353	Bogilovi─ç d.o.o.	company	BA	Safeta Zajke 450	71000	Sarajevo	t	BA4200532080006	4200532080006	\N	EUR	60	0.00	\N	f	\N	2869353	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a89d55e6-cf11-4670-b477-9a9aad8f99ee	00000000-0000-0000-0000-0000000a5b71	1001748	BOGILOVI─å D.O.O.	company	BA	ALEJA LIPA 46	71000	SARAJEVO	t	\N	\N	\N	EUR	0	0.00	\N	f	\N	1001748	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5603117c-bc53-4a76-84b4-84d1981fd412	00000000-0000-0000-0000-0000000a5b71	1787595	BOGOMIR SAJKO S.P.	company	SI	Slape 019	2323	Ptujska gora	t	SI36844446	36844446	5197707000	EUR	30	0.00	\N	f	\N	1787595	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3b7bfc14-801e-450b-8233-af0d7d8c876c	00000000-0000-0000-0000-0000000a5b71	4000004	BOHEMIA CARGO s.r.o	company	CZ	├Üsteck├í 98,	405 02	D─ø─ì├¡n	t	CZ25025571	25025571	\N	EUR	0	0.00	\N	f	\N	4006251	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f9ea7492-6c79-4a9a-bc44-4c494bac2526	00000000-0000-0000-0000-0000000a5b71	491040	BOHEMIAN KOTRANS s.r.o.	company	CZ	KVETINOV 33	58001	HAVLI─îKUV BROD1	f	\N	\N	\N	EUR	0	0.00	\N	f	\N	491040	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
305ce6de-7241-46b5-86b1-ec8e73a86474	00000000-0000-0000-0000-0000000a5b71	4000470	B├Âhler Spedition GmbH	company	DE	Im M├╝hlegr├╝n 5	77716	Haslach	t	DE811391326	\N	\N	EUR	0	0.00	\N	f	\N	4154924	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bcf9e68b-aba4-4360-b33b-f1e39fb0c86d	00000000-0000-0000-0000-0000000a5b71	1671887	Bohm & Besold GmbH	company	DE	Pfaffenweg 35	89231	Neu Ulm	t	DE130848870	DE130848870	\N	EUR	30	0.00	\N	f	\N	1671887	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c4a0f707-ecae-4e0c-9a19-3b45a1b1f382	00000000-0000-0000-0000-0000000a5b71	4003587	Bohnen Logistik GmbH & Co. KG	company	DE	An der Beek 255	41372	Niederkr├╝chten	t	DE119114459	\N	\N	EUR	0	0.00	\N	f	\N	5509261	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d4c60e75-8602-4878-8724-d11921fba515	00000000-0000-0000-0000-0000000a5b71	2901839	BOJAN BOBNAR S.P.	company	SI	Spodnji Brnik 068	4207	Cerklje na Gorenjskem	t	SI88091473	88091473	3054772000	EUR	30	0.00	\N	f	\N	2901839	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b71a0700-50d6-40c1-9463-2c51f3807916	00000000-0000-0000-0000-0000000a5b71	1677976	BOJAN CVEK S.P.	company	SI	ULICA FRANKOLOVSKIH ┼¢RTEV 034	3000	CELJE	t	SI63679787	63679787	5311959000	EUR	30	0.00	\N	f	\N	1677976	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
99631841-b114-4d56-a65b-867fd0113c9e	00000000-0000-0000-0000-0000000a5b71	\N	BOJAN KARNER S.P.	company	SI	Oti┼íki Vrh 104	2373	┼áentjan┼¥ pri Dravogradu	t	SI83805877	83805877	3285448000	EUR	30	0.00	\N	f	\N	8581993	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f8376c75-3d6f-4d0a-9d54-ce01c3f0b90b	00000000-0000-0000-0000-0000000a5b71	\N	BOJAN KOJI─å	company	SI	GRADAC 135	8332	Gradac	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	15225318	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ba95ee0f-43ab-42c6-bb71-23398b7baae7	00000000-0000-0000-0000-0000000a5b71	3836890	BOJAN MEDVED S.P.	company	SI	Pod Pohorjem 004	2000	Maribor	t	SI51922002	51922002	1842072000	EUR	60	0.00	\N	f	\N	3836890	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
5f947332-bb37-45b2-8e46-e3ddffe39248	00000000-0000-0000-0000-0000000a5b71	\N	Bojan Milanovi─ç	company	SI	Erjav─ìeva ulica 7	8270	Kr┼íko	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	7365307	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c6abe7fc-8b13-4b5b-8b14-24fc4f7e0fdf	00000000-0000-0000-0000-0000000a5b71	\N	Bojan Oblak s.p.	company	SI	Resnik 102	3214	Zre─ìe	f	\N	37483528	8205051	EUR	30	0.00	\N	f	\N	8581981	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a0069d50-9a21-4948-a34a-66f0388f4f41	00000000-0000-0000-0000-0000000a5b71	3340358	BOJAN obrt za prijevoz Jerman Bojan (HR-191)	company	HR	Vrhov─ìak 16	10430	Samobor	t	HR56377615049	56377615049	\N	EUR	60	0.00	\N	f	\N	3340358	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
9e25a69e-6338-4ec8-ad58-158fe0d8ac42	00000000-0000-0000-0000-0000000a5b71	1298459	BOJAN SKVAR─îA S.P.	company	SI	TR┼¢A┼áKA CESTA 127	1370	LOGATEC	t	SI26327783	26327783	5221985000	EUR	0	0.00	\N	f	\N	1298459	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ad08af7a-6cfc-4256-b8fb-82d3424cd5db	00000000-0000-0000-0000-0000000a5b71	655509	BOJAN TU┼áEK S.P.	company	SI	STRO─îJA VAS 0009A	9240	LJUTOMER	t	SI36315753	36315753	5369610	EUR	0	0.00	\N	f	\N	655509	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
15b06ff2-252b-44c3-bea1-1c11b2f2031d	00000000-0000-0000-0000-0000000a5b71	2326144	BOJAN UNUTARNJI I ME─ÉUNARODNI TRANSPORTI	company	HR	VRHOV─îAK 16	10430	SAMOBOR	f	\N	56377618	\N	EUR	30	0.00	\N	f	\N	2326144	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ee3969d1-0e7b-43d5-a397-cd906721cb29	00000000-0000-0000-0000-0000000a5b71	\N	BOJAN ZORI─å	company	SI	ULICA BELOKRANJSKEGA ODREDA 11	8330	Metlika	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	6211973	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4e00910e-5c4f-4229-bb71-8f340fedf280	00000000-0000-0000-0000-0000000a5b71	1478327	BOKAT d.o.o.	company	SI	PLEMLJEVA ULICA 002	1210	LJUBLJANA - ┼áENTVID	t	SI51705826	51705826	1939122	EUR	30	0.00	\N	f	\N	1478327	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
382f1be0-2dc8-4083-8219-b1f792e398fd	00000000-0000-0000-0000-0000000a5b71	\N	BOKI EXPRESS d.o.o.	company	SI	Partizanska pot 008	3325	┼áo┼ítanj	t	SI91666511	91666511	8163391000	EUR	30	0.00	\N	f	\N	7708690	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
acb477a4-5762-4179-9bc8-e341077731d2	00000000-0000-0000-0000-0000000a5b71	1526570	BOK┼áI─î d.o.o. ─îAPLJINA	company	BA	TASOV─îI─îI B.B.	88300	─îAPLJINA	t	227015250002	227015250002	\N	EUR	30	0.00	\N	f	\N	1526570	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
37580f22-89d3-4691-8add-af1d9981b76f	00000000-0000-0000-0000-0000000a5b71	\N	BOK┼áI─å d.o.o. (hr-191)	company	HR	Ante Str─ìevi─ça 2	20350	Metkovi─ç	t	HR55414831869	55414831869	\N	EUR	30	0.00	\N	f	\N	6989355	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8a065616-c267-4ada-acaa-f3567cba001d	00000000-0000-0000-0000-0000000a5b71	\N	BOLEK-TRANS-Paulina Bolek (pl-616)	company	PL	Sandomierska 11	26600	RADOM	t	PL7962401562	7962401562	\N	EUR	60	0.00	\N	f	\N	7390612	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2cf37b1e-e379-4f25-a6e9-db0cd6365612	00000000-0000-0000-0000-0000000a5b71	3751960	BOLK TRANSPORT BV (NL)	company	NL	POSTBUS 385	7602	ALMELO	t	NL007874601B01	007874601B01	\N	EUR	60	0.00	\N	f	\N	3751960	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
89a5fbeb-3db4-483e-9304-cb8b161f4051	00000000-0000-0000-0000-0000000a5b71	1565403	BoLogistic Bo┼ítjan Horvat s.p.	company	SI	Van─ìa vas 075A	9251	TI┼áINA	t	SI89849353	89849353	3838960	EUR	30	0.00	\N	f	\N	1565403	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a7834e0c-c50c-43a1-b76d-1b7fe8221f2a	00000000-0000-0000-0000-0000000a5b71	2570741	BoLogistik d.o.o.	company	SI	Van─ìa vas 075A	9251	Ti┼íina	t	SI44144849	44144849	6358799	EUR	30	0.00	\N	f	\N	2570741	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c3be8f34-33a3-46e8-b8e1-ac44898ef4d4	00000000-0000-0000-0000-0000000a5b71	2425229	BOLTAS GMBH SPEDITION UND HANDEL	company	FR	17 RUE DE FONTENAY	28110	LUCE CHARTRES	t	FR09450666946	09450666946	\N	EUR	45	0.00	\N	f	\N	2425229	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
81580231-a7a7-4a8a-a12c-e2e92c82ee03	00000000-0000-0000-0000-0000000a5b71	2125386	Boltas Gmbh. Spedition und Handel	company	DE	Industriastrasse 11	90584	Allersberg	t	DE129304605	129304605	\N	EUR	45	0.00	\N	f	\N	2125386	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
86a12046-6ec2-4149-862d-ba663f630b19	00000000-0000-0000-0000-0000000a5b71	\N	BOL-TEX PS KFT	company	HU	Temesvari utca 83	1212	BUDAPEST	t	HU12202429	12202429	\N	EUR	60	0.00	\N	f	\N	3983142	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
30a4b3d2-627b-4760-b274-cc634523a0f2	00000000-0000-0000-0000-0000000a5b71	\N	BOLTEZ, d.o.o.	company	SI	Cesta Staneta ┼¢agarja 058C	4000	Kranj	t	SI34731881	34731881	9284648000	EUR	30	0.00	\N	f	\N	18889346	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
bbed64bd-01f2-47e4-8881-1dfc82041a4d	00000000-0000-0000-0000-0000000a5b71	2621653	BOMBEK MAKSIMILJAN, AVTOPREVOZNI┼áTVO S.P.	company	SI	┼álandrov trg 019	3310	┼¢alec	t	SI13211790	13211790	5124545	EUR	30	0.00	\N	f	\N	2621653	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d30534e5-dc50-424e-a5b6-c00680eb9963	00000000-0000-0000-0000-0000000a5b71	\N	BONAJO d.o.o.	company	SI	Industrijska cesta 009	1290	Grosuplje	t	SI91517214	91517214	3811000000	EUR	30	0.00	\N	f	\N	6791898	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
03559a82-1b92-4b32-9302-ec6ff2674a87	00000000-0000-0000-0000-0000000a5b71	4011904	Boni Fructi s.r.o.	company	SK	Lipnick├í 3035/162	90042	Dunajska Lu┼¥n├í	t	SK2020201425	\N	\N	EUR	0	0.00	\N	f	\N	10180306	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
07f4d5ae-7471-4187-86f3-43353ff0e345	00000000-0000-0000-0000-0000000a5b71	1061627	BONTA d.o.o.	company	SI	Rai─ìeva ulica 017 A	1000	Ljubljana	t	SI60182717	60182717	1767887000	EUR	60	0.00	\N	f	\N	1061627	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8d43f43e-e06d-4ec2-b3f6-67e2480c00af	00000000-0000-0000-0000-0000000a5b71	4011921	Bon-trans BV	company	NL	Grote Kerkstraat 22	5911 CH	Venlo	t	NL809379946B01	\N	\N	EUR	0	0.00	\N	f	\N	10234498	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8c61ebe5-4232-401c-84e5-2c31ecc399db	00000000-0000-0000-0000-0000000a5b71	\N	BOONSTRA Schadevoertuigen BV	company	NL	Dopplerlaan 4	9207	Drachten	t	NL821707826B01	821707826B01	\N	EUR	30	0.00	\N	f	\N	19054382	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ea8b1b5f-3160-4aa7-9bce-a0ad221d5048	00000000-0000-0000-0000-0000000a5b71	4011888	Boonstra's Intern.Transportbed	company	NL	Leeksterweg 63 B	8433	KW Haulerwijk	t	NL004684746B01	\N	\N	EUR	0	0.00	\N	f	\N	10193390	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
403d8527-7940-47bb-ad19-f97e344c662e	00000000-0000-0000-0000-0000000a5b71	\N	BOPIS d.o.o.	company	SI	Dolenjska cesta 070	1000	Ljubljana	t	SI60069465	60069465	1798839000	EUR	30	0.00	\N	f	\N	18944105	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
90f4207c-32b8-4bd7-99ed-a32ae52bfcec	00000000-0000-0000-0000-0000000a5b71	\N	BOR TRANS vl. Marijana Bor┼íi─ç (hr)	company	HR	Grletinec 47/2	49231	Hum na Sutli	t	HR30659765058	30659765058	\N	EUR	60	0.00	\N	f	\N	4159174	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c0e6e78f-261f-47cf-84db-c0ebc4eaffb5	00000000-0000-0000-0000-0000000a5b71	4001587	Bora d.o.o	company	SI	Koprska ulica 1	6310	IZOLA	t	SI91456525	\N	\N	EUR	0	0.00	\N	f	\N	4670817	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6fe58938-0531-41be-989a-751f586048c0	00000000-0000-0000-0000-0000000a5b71	1102218	BORA KE─îI─å SPECIJALNI TRANSPORTI D.O.O.	company	RS	Stevana Filipovi─ça 113	11250	┼¢eleznik	t	RS101017218	101017218	\N	EUR	0	0.00	\N	f	\N	1102218	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
91b68b58-00d0-43f5-b14a-c116e88cb8b6	00000000-0000-0000-0000-0000000a5b71	\N	Borbely Pal E.V. ( 348-HU)	company	HU	Hunyadi utca 10/1	2220	Vecses	t	HU66349749	66349749	\N	EUR	30	0.00	\N	f	\N	10533271	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
01b966b5-5225-469e-bcbf-9e404ce14c6f	00000000-0000-0000-0000-0000000a5b71	2298221	BORDON SIMON S.P.	company	SI	Montinjan 001A	6273	Marezige	t	SI27572030	27572030	5175678000	EUR	30	0.00	\N	f	\N	2298221	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2c357d99-da12-4e34-a1c7-8425a9ffbcf0	00000000-0000-0000-0000-0000000a5b71	4002843	B├Ârgitzer Speditions GmbH	company	DE	Im Kleinen Winkel 1	39576	Stendal OT B├Ârgitz	t	DE294275233	\N	\N	EUR	0	0.00	\N	f	\N	5223773	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f778ef8f-5d66-44a5-bd93-cac5ae48b636	00000000-0000-0000-0000-0000000a5b71	\N	BORGULA Milan (sk-703)	company	SK	┼¢upkov17	96671	┼¢UPKOV	t	SK1077347579	1077347579	\N	EUR	60	0.00	\N	f	\N	5326535	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c8420a27-ea1a-4eae-9135-cf3a95a00277	00000000-0000-0000-0000-0000000a5b71	\N	BORIS BRODARI─î S.P.	company	SI	Griblje 084B	8332	Gradac	t	SI20425961	20425961	6875505000	EUR	30	0.00	\N	f	\N	10454518	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
80ebb9b9-85d7-4d1e-a921-b2103b6d99d7	00000000-0000-0000-0000-0000000a5b71	\N	Boris Ho─ìevar s.p.	company	SI	Bevke 112	1358	Log pri Brezovici	t	SI64153754	64153754	9376135000	EUR	30	0.00	\N	f	\N	19816259	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e05003c1-0c81-4aba-8de7-cf516cc34132	00000000-0000-0000-0000-0000000a5b71	579153	BORIS KRI┼¢AN S.P.	company	SI	OTOK 0006A	8332	GRADAC	t	SI23003804	23003804	3086640000	EUR	0	0.00	\N	f	\N	579153	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a0da5139-5ac1-4f20-9f0f-38f7005c858a	00000000-0000-0000-0000-0000000a5b71	2944610	BORIS LETNAR - IZVR┼áITELJ	company	SI	Mestni trg 007B	3210	Slovenske Konjice	t	SI80179258	80179258	2208547	EUR	30	0.00	\N	f	\N	2944610	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b362e594-1833-40c5-a3a2-228ea666e0b4	00000000-0000-0000-0000-0000000a5b71	1612241	BORIS MLAKAR S.P.	company	SI	Kandijska cesta 045	8000	Novo mesto	t	SI67592635	67592635	3229513	EUR	30	0.00	\N	f	\N	1612241	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1a21f001-65ca-4845-967e-43cf88492d79	00000000-0000-0000-0000-0000000a5b71	2995243	BORIS MULLER	company	SI	Kani┼¥arica 10	8340	─îrnomelj	f	8140044	81400144	\N	EUR	30	0.00	\N	f	\N	2995243	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
fc5aca3d-2c84-4b82-907a-5baf694f9f38	00000000-0000-0000-0000-0000000a5b71	1473680	BORIS OCVIRK s.p.	company	SI	LEV─îEVA ULICA 016	1234	MENGE┼á	t	SI72695196	72695196	3648559	EUR	30	0.00	\N	f	\N	1473680	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1dbe5f98-51dd-4991-b3af-4e8edefd439c	00000000-0000-0000-0000-0000000a5b71	1731179	Boris Skubic s.p.	company	SI	BRVACE 007A	1290	GROSUPLJE	t	SI76964191	76964191	3911691000	EUR	20	0.00	\N	f	\N	1731179	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
1e5503e9-ec6a-4863-a665-c2dd5006ce1c	00000000-0000-0000-0000-0000000a5b71	3558746	BORIS STOPAR - AMBULANTA ZA MEDICINO DELA, PROMETA IN ┼áPORTA	company	SI	VODOVODNA CESTA 099A	1000	LJUBLJANA	f	\N	16041232	1408739	EUR	30	0.00	\N	f	\N	3558746	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b6d05356-e2cc-4fd2-ae40-b799b9c9fb73	00000000-0000-0000-0000-0000000a5b71	4005020	BORS B┼Öeclav a.s	company	CZ	Bratislavsk├í 26	690 62	BRECLAV	t	CZ49969242	\N	\N	EUR	0	0.00	\N	f	\N	6236763	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6a808dc0-e487-4d3a-a207-e323efa6d960	00000000-0000-0000-0000-0000000a5b71	4016140	BORS LOGISTICS s.r.o.	company	CZ	Bratislavsk├í 2284/26	69002	BRECLAV	t	CZ60749881	\N	\N	EUR	0	0.00	\N	f	\N	16519264	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f051d5dc-0d56-4251-bed2-f4f3e6a3487d	00000000-0000-0000-0000-0000000a5b71	2154614	BOR┼áTNIK d.o.o.	company	SI	Kri┼íka vas 061	1294	Vi┼ínja Gora	t	SI21466700	21466700	1527827000	EUR	30	0.00	\N	f	\N	2154614	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c2a7832d-20cc-4eb8-b580-cec277610f5d	00000000-0000-0000-0000-0000000a5b71	\N	BORUT BAHOR S.P.	company	SI	Jankovi─ìi 050	8341	Adle┼íi─ìi	t	SI77845188	77845188	6472079000	EUR	30	0.00	\N	f	\N	14095340	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ee957bbd-e50e-4edf-bcac-ee5a346bf600	00000000-0000-0000-0000-0000000a5b71	600952	BORUT CELAN S.P.	company	SI	MLINSKA ULICA 0042	2311	HO─îE	t	SI64481565	64481565	3128857	EUR	0	0.00	\N	f	\N	600952	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
91083994-0e56-45f4-94ef-6c7c87b3a485	00000000-0000-0000-0000-0000000a5b71	2747137	BORUT FIJAV┼¢ S.P.	company	SI	Bukovlje 001	3206	Stranice	t	SI23191503	23191503	5860514	EUR	60	0.00	\N	f	\N	2747137	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e1454e1e-62ab-48fd-afad-992c06342c8d	00000000-0000-0000-0000-0000000a5b71	\N	BORUT JAKLI─î s.p.	company	SI	Zemelj 007	8332	Gradac	f	\N	49362909	6580599000	EUR	30	0.00	\N	f	\N	6600604	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
db66c656-e37a-432c-a644-b85f07045284	00000000-0000-0000-0000-0000000a5b71	\N	BORUT KRIVEC S.P.	company	SI	Dolenja Trebu┼ía 016A	5283	Slap ob Idrijci	t	SI62563939	62563939	6472591000	EUR	30	0.00	\N	f	\N	6146870	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
630984b0-b5f0-445b-906d-8b273c6c6910	00000000-0000-0000-0000-0000000a5b71	\N	BORUT PETRIC s.p.	company	SI	Marenti─ìeva ulica 008	8330	Metlika	t	SI41096533	41096533	6066429000	EUR	30	0.00	\N	f	\N	11083563	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b2414b85-0b00-4111-8588-5a9bb06a96f0	00000000-0000-0000-0000-0000000a5b71	2999589	BORUT POZNE S.P.	company	SI	Partizanska cesta 070	2317	Oplotnica	t	SI32302371	32302371	1039032000	EUR	60	0.00	\N	f	\N	2999589	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a60e9a4c-b081-4df7-83e2-a3016ca77cb6	00000000-0000-0000-0000-0000000a5b71	3572043	BOSATRANS SA	company	ES	C/ VENUS 32	08228	TERRASSA	t	ESA65251902	A65251902	\N	EUR	60	0.00	\N	f	\N	3572043	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
88507ba1-fe69-488c-a43a-c846bac4fc82	00000000-0000-0000-0000-0000000a5b71	\N	BOSNI─å SPED d.o.o. (BA-070)	company	BA	Lipa 166	75320	Gra─ìanica	t	BA4263729680007	4263729680007	\N	EUR	30	0.00	\N	f	\N	18263336	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
908516c7-3dce-4d32-9c1b-548f91c34e4c	00000000-0000-0000-0000-0000000a5b71	\N	BOSSI, Irhad Sejdi─ç s.p.	company	SI	Teharje 034	3221	Teharje	t	SI97081396	97081396	8814899	EUR	30	0.00	\N	f	\N	10521990	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
280566dd-7fbc-4776-ab32-96d155def40c	00000000-0000-0000-0000-0000000a5b71	1387824	BOSSPLAST d.o.o.	company	SI	POD JEL┼áAMI 005	1290	GROSUPLJE	t	SI17112338	17112338	5427126000	EUR	59	0.00	\N	f	\N	1387824	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d49519a6-912a-41ef-bdaf-479ced587638	00000000-0000-0000-0000-0000000a5b71	2430980	BO┼áNJA─îKI TRANSPORTI D.O.O.(RS)	company	RS	MILICE SUVAKOVI─î 4/4	11080	BEOGRAD	t	RS108121772	108121772	\N	EUR	60	0.00	\N	f	\N	2430980	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
048eb186-3b70-496d-9703-814c4b4e66e6	00000000-0000-0000-0000-0000000a5b71	2271595	BO┼áTJAN ANDREJ─îI─î S.P.	company	SI	Dobrava 045	8222	Oto─ìec	t	SI12201812	12201812	3777081000	EUR	30	0.00	\N	f	\N	2271595	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
cc888605-669a-4ede-afd8-f57d9d02c42c	00000000-0000-0000-0000-0000000a5b71	2747074	Bo┼ítjan BERGLEZ, s. p.	company	SI	Sladki Vrh 008	2214	Sladki vrh	t	SI82886423	82886423	6108792	EUR	30	0.00	\N	f	\N	2747074	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ff1f2b25-168d-4823-8db6-6697af5e6713	00000000-0000-0000-0000-0000000a5b71	443541	BO┼áTJAN BERUS S.P.	company	SI	PODBEV┼áKOVA ULICA 0001	8000	NOVO MESTO	t	SI33680175	33680175	5621473	EUR	0	0.00	\N	f	\N	443541	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
f1de068d-7756-4b4a-940f-86c87dd0c6ed	00000000-0000-0000-0000-0000000a5b71	\N	BO┼áTJAN GOVEKAR S.P.	company	SI	Valburga 064	1216	Smlednik	t	SI67148905	67148905	3836487000	EUR	30	0.00	\N	f	\N	4566221	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b9af6821-d4c1-45b4-99bb-bdb1bc8875a0	00000000-0000-0000-0000-0000000a5b71	2544645	BO┼áTJAN KERMAVNER S.P.	company	SI	Tr┼¥a┼íka cesta 357	1000	Ljubljana	t	SI78484782	78484782	5042517000	EUR	30	0.00	\N	f	\N	2544645	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7c2c78e7-e522-4e3b-ad81-b4a9b8b34e93	00000000-0000-0000-0000-0000000a5b71	1388908	BO┼áTJAN KOTNIK S.P.	company	SI	ME┼¢A 114	2370	DRAVOGRAD	t	SI56679793	56679793	3913015	EUR	0	0.00	\N	f	\N	1388908	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6a2a3716-9019-4120-b3bf-d8021336c48b	00000000-0000-0000-0000-0000000a5b71	\N	BO┼áTJAN LE┼á─îANEC s.p.	company	SI	Bo┼¥akovo 035	8330	Metlika	t	SI93419007	93419007	3681971000	EUR	30	0.00	\N	f	\N	8083530	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6558762a-c2b6-4aae-81af-81dcfcc06268	00000000-0000-0000-0000-0000000a5b71	567673	BO┼áTJAN MA─îEK S.P.	company	SI	ULICA TALCEV 5	3230	┼áENTJUR	t	SI88572145	88572145	3448975000	EUR	0	0.00	\N	f	\N	567673	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
818a7a63-afbb-4207-80f5-608facb26865	00000000-0000-0000-0000-0000000a5b71	\N	BO┼áTJAN NEMANI─î s.p.	company	SI	Gornji Suhor pri Metliki 016	8331	Suhor	t	SI23685042	23685042	5184800000	EUR	30	0.00	\N	f	\N	19706432	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
30cf6785-3966-49c3-83c7-b3da57686a80	00000000-0000-0000-0000-0000000a5b71	3370517	BO┼áTJAN PLANINC s.p.	company	SI	Pecelj 028	3255	Bu─ìe	t	SI20703643	20703643	1896121000	EUR	60	0.00	\N	f	\N	3370517	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ab8bf777-b724-49f2-9e8f-4c818419c053	00000000-0000-0000-0000-0000000a5b71	2257833	BO┼áTJAN PLOJ s.p.	company	SI	Cafova ulica 019	2235	Sv. Trojica v Slov. goricah	t	SI13885618	13885618	6357148000	EUR	30	0.00	\N	f	\N	2257833	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8e5eb9a2-5de0-4992-a7c5-cf8b89bf0d5a	00000000-0000-0000-0000-0000000a5b71	1466365	BO┼áTJAN RA─îI─î S.P.	company	SI	Kajuhova ulica 005	1235	Radomlje	t	SI31902103	31902103	1760823000	EUR	30	0.00	\N	f	\N	1466365	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2c1472cf-1b6c-4af1-8191-8475bb3d4f1c	00000000-0000-0000-0000-0000000a5b71	567786	BO┼áTJAN ┼áTEFANI─î S.P.	company	SI	GORNJA LOKVICA 0018	8330	METLIKA	t	SI45818193	45818193	5183730000	EUR	0	0.00	\N	f	\N	567786	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
c32fd891-774c-440c-84c8-48c5a9e408a4	00000000-0000-0000-0000-0000000a5b71	4017564	Botlek Logistics B.V.	company	NL	Strevelsweg 700 / 113	3083	AS Rotterdam	t	NL856581926B01	\N	\N	EUR	0	0.00	\N	f	\N	19818716	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8654ea4a-7bd5-41e9-b34c-58908b9f270d	00000000-0000-0000-0000-0000000a5b71	4013616	BOTRAN D.O.O.	company	SI	VIPAVSKA CESTA 2C	5270	AJDOV┼á─îINA	t	SI69620849	\N	\N	EUR	0	0.00	\N	f	\N	11970377	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3a5b86bf-0803-4146-a322-af777c518e79	00000000-0000-0000-0000-0000000a5b71	2212689	Bova Group srl.	company	IT	Via delle Valli 1	04011	Aprilia (LT)	t	IT04482051002	04482051002	\N	EUR	60	0.00	\N	f	\N	2212689	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
8d319d6f-31b0-41fe-b9d0-54f50409435b	00000000-0000-0000-0000-0000000a5b71	547705	BRANAL D.O.O.	company	SI	JENKOVA ULICA 10	6230	POSTOJNA	t	SI91284147	91284147	5599482000	EUR	0	0.00	\N	f	\N	547705	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
b68aaf3c-7328-4bf7-b840-48525a547e00	00000000-0000-0000-0000-0000000a5b71	\N	MUSTAFA AL ASSAD	company	JO	FREE ZONE	13134	ZARQUA	t	\N	\N	\N	EUR	30	0.00	\N	f	\N	11603120	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
009cb192-c29b-478d-bf45-c58addeae5b6	00000000-0000-0000-0000-0000000a5b71	\N	PANCZO PIOTR PANCZYK (PL-616)	company	PL	PRZECLAW 100B/4	72-005	PRZECLAW	t	PL6721281794	6721281794	\N	PLN	60	0.00	\N	f	\N	8046319	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
6ceb75e5-7374-40b4-b8e2-79206776480d	00000000-0000-0000-0000-0000000a5b71	\N	"AVTOPREVOZNI┼áTVO" JANEZ BALI┼¢ S.P.	company	SI	Ob jami 008	1217	Vodice	t	SI99740923	99740923	1224719000	EUR	30	0.00	\N	f	\N	5644309	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
17474235-2581-4dd8-a850-e3fe0d0383da	00000000-0000-0000-0000-0000000a5b71	\N	"BALTYK-TRANS-SPEDITION" PAWEL SOMINKA (PL-616)	company	PL	ul. Mieszka I 41	75-124	Koszalin	t	SI6692279196	6692279196	\N	PLN	30	0.00	\N	f	\N	7722731	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
66ea376b-d291-490a-ab45-b3928d90930d	00000000-0000-0000-0000-0000000a5b71	4016502	"Blumen-Nob" Jozef Nowak	company	PL	Gryfi┼äska 33	70-772	Szczecin	t	PL8510009955	\N	\N	EUR	0	0.00	\N	f	\N	17497316	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3022f2ff-57ed-4d12-8404-06466369df0c	00000000-0000-0000-0000-0000000a5b71	1653518	"DOLOMITI COMMERCE" trgovsko podjetje, d.o.o.	company	SI	Na vasi 006A	1351	Brezovica pri Ljubljani	t	SI62710265	62710265	5310938000	EUR	30	0.00	\N	f	\N	1653518	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
aeff1144-76f5-4e71-b527-dd0b9f8953cf	00000000-0000-0000-0000-0000000a5b71	1701996	"G.P.T. HR┼áAK" d.o.o.	company	HR	Mihaljekov Jarek 26a	49000	Krapina	t	HR11850994265	11850994265	\N	EUR	30	0.00	\N	f	\N	1701996	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
23464f90-95a9-4990-84bd-8457befa0ab3	00000000-0000-0000-0000-0000000a5b71	4011937	3a - Logistics GmbH	company	AT	Edtstra├ƒe 14	4060	Leonding	t	ATU72835202	\N	\N	EUR	0	0.00	\N	f	\N	10255061	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
2019f7e1-71e7-4cf8-b211-1edcf3fd44e7	00000000-0000-0000-0000-0000000a5b71	4012418	Ants - In Gmbh	company	AT	Bonygasee 42 / GL21	1120	WIEN	t	AT71199259	\N	\N	EUR	0	0.00	\N	f	\N	10678652	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
ea996294-39a6-4add-8172-e93c5eb48710	00000000-0000-0000-0000-0000000a5b71	442602	BO┼¢I─î TRANSPORT D.O.O.	company	SI	ANKARANSKA CESTA 0005C	6000	KOPER - CAPODISTRIA	t	SI21197598	21197598	2172283000	EUR	0	0.00	\N	f	\N	442602	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
774cfa39-99eb-4799-9a71-7444a87d832a	00000000-0000-0000-0000-0000000a5b71	1500532	BO┼¢IDAR OVEN S.P.	company	SI	Vrhovo pri ┼áentlovrencu 017	8212	Velika Loka	t	SI70352887	70352887	5355078	EUR	30	0.00	\N	f	\N	1500532	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
3a09e145-e1fe-40ab-95a3-49820016731b	00000000-0000-0000-0000-0000000a5b71	3431518	BP TANKSTELLE	company	DE	XXX	1000	MINHEN	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	3431518	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
981f8ddc-41b8-4584-bb15-b2e963da9bb6	00000000-0000-0000-0000-0000000a5b71	1117048	BPROM d.o.o.	company	SI	GLAVARJEVA ULICA 017	8210	TREBNJE	t	SI98196197	98196197	3692671000	EUR	0	0.00	\N	f	\N	1117048	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4b817877-a423-460f-8006-18b8c7cf6aa4	00000000-0000-0000-0000-0000000a5b71	4007906	BRA─îA PIVAC (HR-191)	company	HR	Te┼¥a─ìka 13	21276	Vrgorac	t	HR28128148322	\N	\N	EUR	0	0.00	\N	f	\N	7458699	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
a6c375ea-b9ed-4c08-9ffc-771aeeeca908	00000000-0000-0000-0000-0000000a5b71	\N	BRAJO TRANSPORT ATP (RS-688)	company	RS	Prijepolje Ivanje bb	11000	Beograd	t	RS110018534	110018534	\N	EUR	30	0.00	\N	f	\N	9934395	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
d799d112-0296-4499-8632-9f7994130dbc	00000000-0000-0000-0000-0000000a5b71	1377863	BRAND ANDREJ BRAJER S.P.	company	SI	RO┼¢NI VRH 016	8210	Trebnje	t	SI81800312	81800312	3752186	EUR	0	0.00	\N	f	\N	1377863	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
eb6cf1af-caaf-4fdd-a56e-0684595d5840	00000000-0000-0000-0000-0000000a5b71	\N	Brane ─Éuranovi─ç	company	SI	Dobrava 24	8222	Oto─ìec	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	8559336	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
53dec951-70d4-40c8-93c1-d607047d8c9e	00000000-0000-0000-0000-0000000a5b71	1599833	BRANEX d.o.o.	company	BA	N.┼á.ZRINSKOG BB	72260	BUSOVA─îA	t	BA236008890003	236008890003	\N	EUR	30	0.00	\N	f	\N	1599833	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
4599edaa-4997-4fce-9256-e39c281e6445	00000000-0000-0000-0000-0000000a5b71	\N	BRANISLAV SKRUBE S.P.	company	SI	Me┼¥a 049	2370	Dravograd	t	SI76783626	76783626	3775399000	EUR	30	0.00	\N	f	\N	16889854	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
e064a65c-5bef-449e-a143-fb0e17c14f4b	00000000-0000-0000-0000-0000000a5b71	\N	BRANKO BAJUK	company	SI	RADOVICA 1/A	8330	Metlika	f	\N	\N	\N	EUR	30	0.00	\N	f	\N	13288540	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
7bfb1c8f-d6b4-4814-bd69-6fad656561bb	00000000-0000-0000-0000-0000000a5b71	1969559	BRANKO BANDELJ S.P.	company	SI	Ulica Gradnikove brigade 031	5000	Nova Gorica	t	SI93759622	93759622	5375189	EUR	30	0.00	\N	f	\N	1969559	\N	active	1	2026-06-07 20:31:58.653673+00	2026-06-09 13:04:35.371005+00	\N	\N	f	\N	\N	\N	\N	\N
\.


--
-- Data for Name: document_counters; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.document_counters (tenant_id, doc_type, year, value, updated_at) FROM stdin;
\.


--
-- Data for Name: einvoice_documents; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.einvoice_documents (id, tenant_id, invoice_id, channel, format, status, payload, authority_ref, last_error, attempts, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: estimates; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.estimates (id, tenant_id, number, customer_id, asset_id, work_order_id, status, lines, valid_until, invoice_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: field_service_events; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.field_service_events (id, tenant_id, user_id, customer_id, kind, location, country, started_at, ended_at, travel_seconds, work_seconds, waiting_seconds, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fleets; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.fleets (id, tenant_id, customer_id, name, cost_center, notes, status, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: goods_receipt_lines; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.goods_receipt_lines (id, tenant_id, goods_receipt_id, line_no, purchase_order_line_id, item_id, location_id, qty, unit_cost_minor, ocr_raw_text, ocr_confidence, match_status, movement_id, created_at) FROM stdin;
\.


--
-- Data for Name: goods_receipts; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.goods_receipts (id, tenant_id, number, supplier_id, purchase_order_id, received_at, received_by, delivery_note_ref, source, ocr_attachment_id, ocr_confidence, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: insight_snapshots; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.insight_snapshots (id, tenant_id, period_label, window_days, total, by_severity, by_category, payload, created_at) FROM stdin;
2961afee-cd4f-44ca-b852-4d6f4ef32a03	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-07 20:49:02.851933+00
e0c308db-87fc-4731-9a16-de377cf7e4a2	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-09 13:54:58.564801+00
515165e5-6009-4528-9702-f2c2078356d1	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-11 10:42:06.28884+00
c416a55d-eb2b-4729-8b2f-4fde22951465	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-11 10:42:09.609455+00
3b8a93b2-6488-45ea-afcc-15a6f7ceaeec	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-11 10:42:09.636796+00
742cc390-58a7-4d8c-a8fc-1e5be370fb22	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-11 10:42:30.978976+00
f7d47bb4-b697-4e2b-bfaf-efe24f442248	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-11 10:42:30.996816+00
f397124e-f64b-4c6a-a5e8-c18574d49756	00000000-0000-0000-0000-0000000a5b71	Last 30 days	30	0	{}	{}	{"summary": {"top": [], "total": 0, "headline": "Last 30 days: nothing needs attention ÔÇö no anomalies or profitability issues detected.", "byCategory": {}, "bySeverity": {}}, "insights": []}	2026-06-11 10:42:32.195576+00
\.


--
-- Data for Name: integration_credentials; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.integration_credentials (id, tenant_id, provider, config, secret_ciphertext, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.inventory_items (id, tenant_id, sku, oem_ref, name, unit, cost_minor, price_minor, currency, vat_rate_pct, is_core, minimax_article_id, version, created_at, updated_at, avg_cost_minor, category_id, barcode, superseded_by_id, preferred_supplier_id) FROM stdin;
\.


--
-- Data for Name: invoice_lines; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.invoice_lines (id, tenant_id, invoice_id, line_no, type, description, quantity, unit_price_minor, discount_pct, vat_rate_pct, reverse_charge, net_minor, vat_minor, gross_minor, created_at, work_order_id) FROM stdin;
\.


--
-- Data for Name: invoice_vat_breakdown; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.invoice_vat_breakdown (id, tenant_id, invoice_id, rate_pct, reverse_charge, net_minor, vat_minor) FROM stdin;
\.


--
-- Data for Name: invoice_work_orders; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.invoice_work_orders (invoice_id, work_order_id, tenant_id, created_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.invoices (id, tenant_id, kind, number, work_order_id, customer_id, corrects_invoice_id, status, currency, vat_treatment, reverse_charge, vat_note, total_net_minor, total_vat_minor, total_gross_minor, paid_minor, issue_date, due_date, issued_at, minimax_invoice_id, version, created_at, updated_at, created_by, issued_by) FROM stdin;
\.


--
-- Data for Name: labour_standards; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.labour_standards (id, tenant_id, op_code, description, vehicle_class, standard_minutes, source, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.leave_requests (id, tenant_id, user_id, leave_type, start_date, end_date, hours_per_day, status, reason, decided_by, decided_at, decision_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.locations (id, tenant_id, name, address, bays, created_at, updated_at) FROM stdin;
66f053f8-af27-4d94-8102-4dd4347e9efb	00000000-0000-0000-0000-0000000a5b71	─îrnomelj	─îrnomelj, Slovenia	4	2026-06-07 20:31:58.638534+00	2026-06-07 20:31:58.638534+00
7a234c85-6747-42ed-90e6-d98b6451be74	00000000-0000-0000-0000-0000000a5b71	─îrnomelj	─îrnomelj, Slovenia	4	2026-06-09 11:11:34.724158+00	2026-06-09 11:11:34.724158+00
376e0858-b636-4dd9-b35b-086432acc893	00000000-0000-0000-0000-0000000a5b71	─îrnomelj	─îrnomelj, Slovenia	4	2026-06-09 13:04:35.320022+00	2026-06-09 13:04:35.320022+00
\.


--
-- Data for Name: login_events; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.login_events (id, user_id, tenant_id, email_attempted, method, success, ip, user_agent, detail, at) FROM stdin;
\.


--
-- Data for Name: member_permission_overrides; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.member_permission_overrides (tenant_id, user_id, permission, allow, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.memberships (id, tenant_id, user_id, roles, active, created_at, updated_at) FROM stdin;
c92fbb1e-2222-4c67-bdec-9597e109f8cc	00000000-0000-0000-0000-0000000a5b71	00000000-0000-0000-0000-0000000a5001	{owner,admin}	t	2026-06-07 20:31:58.638534+00	2026-06-07 20:31:58.638534+00
d4bb1516-a602-4a15-a194-7e3a02be788b	00000000-0000-0000-0000-0000000a5b71	00000000-0000-0000-0000-0000000a5002	{mechanic}	t	2026-06-07 20:31:58.638534+00	2026-06-07 20:31:58.638534+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.notifications (id, tenant_id, recipient_user_id, kind, title, body, entity_type, entity_id, read_at, created_at) FROM stdin;
93f69779-d2b3-4e63-a9ae-a686a498d779	00000000-0000-0000-0000-0000000a5b71	00000000-0000-0000-0000-0000000a5001	system	Integracija ni uspela: minimax.partner.upsert	Dogodek je po vseh poskusih ozna─ìen kot neuspe┼íen. Napaka: Integration not configured: minimax	\N	\N	\N	2026-06-13 17:44:46.016609+00
\.


--
-- Data for Name: ocr_extractions; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.ocr_extractions (id, tenant_id, attachment_id, interaction_id, document_type, goods_receipt_id, matched_supplier_id, overall_confidence, review_payload, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: outbox; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.outbox (id, tenant_id, event_type, payload, idempotency_key, status, attempts, next_attempt_at, last_error, created_at, updated_at) FROM stdin;
6b0bef0a-0bbc-4be9-8db2-6734d8a8d005	00000000-0000-0000-0000-0000000a5b71	minimax.partner.upsert	{"customerId": "4e7b58b9-73ba-452c-a233-c52184906127"}	minimax.partner.upsert:4e7b58b9-73ba-452c-a233-c52184906127	dead	12	2026-06-10 13:03:50.515878+00	Integration not configured: minimax	2026-06-09 19:18:47.911325+00	2026-06-10 13:03:50.954639+00
99bdfc35-dfd4-4ce6-8605-109ca38f0e15	00000000-0000-0000-0000-0000000a5b71	minimax.partner.upsert	{"customerId": "bea20189-620d-4064-8e4b-4ac62512d0c8"}	minimax.partner.upsert:bea20189-620d-4064-8e4b-4ac62512d0c8	dead	12	2026-06-10 13:03:50.530867+00	Integration not configured: minimax	2026-06-09 19:17:48.881863+00	2026-06-10 13:03:50.966976+00
4d8b17f6-6834-4523-9837-dee1c8172aae	00000000-0000-0000-0000-0000000a5b71	minimax.partner.upsert	{"customerId": "400733fd-c416-4d12-85ba-31203783e0f6"}	minimax.partner.upsert:400733fd-c416-4d12-85ba-31203783e0f6	dead	12	2026-06-10 13:03:50.538387+00	Integration not configured: minimax	2026-06-09 20:53:44.378447+00	2026-06-10 13:03:50.976812+00
674855b1-2cb0-414e-9efc-435b1f07a8f0	00000000-0000-0000-0000-0000000a5b71	minimax.partner.upsert	{"customerId": "34ed179b-59d2-4186-80fc-582e657a51f1"}	minimax.partner.upsert:34ed179b-59d2-4186-80fc-582e657a51f1:1781368585282	dead	12	2026-06-13 17:44:45.303129+00	Integration not configured: minimax	2026-06-13 16:36:25.269346+00	2026-06-13 17:44:46.016609+00
\.


--
-- Data for Name: parts_categories; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.parts_categories (id, tenant_id, name, parent_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_allocations; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.payment_allocations (id, tenant_id, payment_id, invoice_id, applied_minor, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.payments (id, tenant_id, customer_id, currency, amount_minor, method, received_at, reference, unapplied_minor, created_at, created_by, reversed_at, reversed_by, reversal_reason) FROM stdin;
\.


--
-- Data for Name: plate_recognitions; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.plate_recognitions (id, tenant_id, attachment_id, interaction_id, read_plate, canonical_plate, country, confidence, outcome, review_payload, confirmed_asset_id, work_order_id, work_order_created, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: portal_sessions; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.portal_sessions (id, tenant_id, customer_id, token_hash, user_agent, created_at, last_seen_at, expires_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: presets; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.presets (id, tenant_id, name, description, vehicle_classes, powertrains, lines, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_order_lines; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.purchase_order_lines (id, tenant_id, purchase_order_id, line_no, item_id, supplier_item_id, description, qty_ordered, qty_received, unit_cost_minor, vat_rate_pct, net_minor, vat_minor, gross_minor, created_at) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.purchase_orders (id, tenant_id, number, supplier_id, status, currency, expected_date, ship_to_location_id, total_net_minor, total_vat_minor, total_gross_minor, notes, minimax_doc_id, created_by, updated_by, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rental_contracts; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.rental_contracts (id, tenant_id, number, reservation_id, rental_vehicle_id, customer_id, start_at, end_at, pickup_location, return_location, daily_rate_minor, included_km_per_day, per_km_rate_minor, per_fuel_eighth_minor, cleaning_fee_minor, late_fee_per_day_minor, deposit_minor, deductible_minor, casco, fuel_policy, mileage_policy, late_policy, currency, start_mileage_km, start_fuel_eighths, handover_at, handover_signature_attachment_id, return_mileage_km, return_fuel_eighths, returned_dirty, return_at, return_signature_attachment_id, charges, invoice_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rental_damages; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.rental_damages (id, tenant_id, contract_id, recorded_at_stage, description, severity, estimated_cost_minor, photo_attachment_ids, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rental_reservations; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.rental_reservations (id, tenant_id, rental_vehicle_id, customer_id, start_at, end_at, pickup_location, return_location, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rental_vehicles; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.rental_vehicles (id, tenant_id, category, make, model, plate, vin, year, daily_rate_minor, included_km_per_day, per_km_rate_minor, per_fuel_eighth_minor, cleaning_fee_minor, late_fee_per_day_minor, deposit_minor, deductible_minor, fuel_tank_eighths, currency, current_mileage_km, current_fuel_eighths, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.schema_migrations (filename, applied_at) FROM stdin;
0001_foundation.sql	2026-06-07 14:11:47.840451+00
0002_workorders_inventory.sql	2026-06-07 14:11:47.987634+00
0003_phase2_review_fixes.sql	2026-06-07 14:11:47.992666+00
0004_invoicing_ar_einvoice.sql	2026-06-07 14:11:48.108406+00
0005_attachments_profiles_sessions.sql	2026-06-07 14:11:48.160838+00
0006_customer_vat_validation.sql	2026-06-07 14:11:48.168141+00
0007_warehouse_step50.sql	2026-06-07 14:11:48.181501+00
0008_suppliers.sql	2026-06-07 14:11:48.249872+00
0009_purchasing_receiving_counting.sql	2026-06-07 14:11:48.345452+00
0010_customer_portal.sql	2026-06-07 14:11:48.39227+00
0011_ocr_extractions.sql	2026-06-07 14:11:48.416596+00
0012_plate_recognitions.sql	2026-06-07 14:11:48.443677+00
0013_employee_attendance.sql	2026-06-07 14:11:48.499318+00
0014_voice_drafts.sql	2026-06-07 14:11:48.51548+00
0015_insight_snapshots.sql	2026-06-07 14:11:48.529099+00
0016_rental_management.sql	2026-06-07 14:11:48.582967+00
0017_estimates_appointments.sql	2026-06-10 10:49:29.488013+00
0018_self_serve_signup.sql	2026-06-10 12:11:59.00905+00
0019_notifications_presets.sql	2026-06-10 13:09:06.235149+00
0020_tenant_billing_profile.sql	2026-06-10 15:27:01.550659+00
0021_stripe_billing.sql	2026-06-10 16:12:05.637384+00
0022_bank_import.sql	2026-06-10 19:39:00.489763+00
0023_tenant_invoice_identity.sql	2026-06-10 19:59:13.303377+00
0024_payment_reversal.sql	2026-06-11 09:01:33.886348+00
0025_member_permission_overrides.sql	2026-06-11 13:54:48.946813+00
0026_api_keys.sql	2026-06-11 14:59:59.333758+00
0027_login_events.sql	2026-06-11 15:13:48.567875+00
0028_invoice_work_orders.sql	2026-06-11 15:59:47.134245+00
0029_invoice_lines_work_order.sql	2026-06-11 16:32:01.477653+00
0030_customer_phone.sql	2026-06-11 18:43:03.423748+00
0031_tenant_integration_toggles.sql	2026-06-13 09:34:35.016776+00
\.


--
-- Data for Name: service_vehicles; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.service_vehicles (id, tenant_id, registration_number, vin, make, model, fuel_type, current_mileage_km, assigned_user_id, insurance_note, registration_expiry, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: signup_tokens; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.signup_tokens (id, email, token_hash, purpose, payload, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: stock_count_lines; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.stock_count_lines (id, tenant_id, stock_count_id, item_id, location_id, system_qty, counted_qty, adjustment_movement_id, created_at) FROM stdin;
\.


--
-- Data for Name: stock_counts; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.stock_counts (id, tenant_id, number, scope, location_id, status, started_by, started_at, closed_by, closed_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_levels; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.stock_levels (id, tenant_id, item_id, location_id, on_hand, reserved, reorder_point, updated_at, reorder_qty, max_qty, bin) FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.stock_movements (id, tenant_id, item_id, location_id, type, quantity, work_order_line_id, reason, created_by, created_at, unit_cost_minor, transfer_id, source_ref) FROM stdin;
\.


--
-- Data for Name: supplier_items; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.supplier_items (id, tenant_id, supplier_id, item_id, supplier_sku, supplier_name, pack_size, last_price_minor, currency, lead_time_days, preferred, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.suppliers (id, tenant_id, code, name, country, vat_id, currency, payment_terms_days, default_lead_time_days, email, phone, address, notes, minimax_partner_id, status, created_by, updated_by, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sync_mutations; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.sync_mutations (id, tenant_id, device_id, idempotency_key, result, created_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.tenants (id, name, country, vat_id, tax_id, registration_no, default_currency, languages, status, created_at, updated_at, plan, billing_status, trial_ends_at, iban, bank_name, address, post_code, city, stripe_customer_id, stripe_subscription_id, phone, fax, email, website, bic, iban2, bic2, registration_note, sms_enabled, minimax_enabled) FROM stdin;
00000000-0000-0000-0000-0000000a5b71	A-SPRINT d.o.o.	SI	\N	\N	\N	EUR	{sl,en,hr}	active	2026-06-07 20:31:58.638534+00	2026-06-07 20:31:58.638534+00	founders	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	t
\.


--
-- Data for Name: time_entries; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.time_entries (id, tenant_id, work_order_id, mechanic_id, started_at, ended_at, duration_seconds, cost_minor, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: travel_orders; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.travel_orders (id, tenant_id, number, user_id, service_vehicle_id, customer_id, work_order_id, purpose, destination, country, started_at, ended_at, travel_seconds, work_seconds, waiting_seconds, km, per_km_rate_minor, expenses_minor, currency, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_credentials; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.user_credentials (user_id, password_hash, email_verified_at, failed_attempts, locked_until, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.user_sessions (id, user_id, device_id, user_agent, ip_hint, created_at, last_seen_at, expires_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.users (id, email, name, locale, status, external_subject, created_at, updated_at, display_name, phone, avatar_key) FROM stdin;
00000000-0000-0000-0000-0000000a5002	marko.kovac@a-sprint.si	Marko Kova─ì	sl	active	oidc|seed-mechanic	2026-06-07 20:31:58.638534+00	2026-06-07 20:31:58.638534+00	\N	\N	\N
00000000-0000-0000-0000-0000000a5001	owner@a-sprint.si	A-SPRINT Owner	sl	active	oidc|seed-owner	2026-06-07 20:31:58.638534+00	2026-06-07 21:22:43.136111+00	\N	\N	\N
\.


--
-- Data for Name: voice_drafts; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.voice_drafts (id, tenant_id, attachment_id, interaction_id, transcript, language, intent, completeness, needs_review, draft_payload, work_order_id, outcome, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: work_order_approvals; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.work_order_approvals (id, tenant_id, customer_id, work_order_id, kind, title, proposed_items, amount_net_minor, amount_gross_minor, currency, status, responded_at, response_note, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: work_order_lines; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.work_order_lines (id, tenant_id, work_order_id, line_no, type, description, inventory_item_id, quantity, unit_price_minor, discount_pct, vat_rate_pct, net_minor, vat_minor, gross_minor, issued, created_at, updated_at, reserved_location_id, standard_minutes, clocked_seconds) FROM stdin;
\.


--
-- Data for Name: work_orders; Type: TABLE DATA; Schema: app; Owner: workshop
--

COPY app.work_orders (id, tenant_id, number, location_id, customer_id, asset_id, fleet_id, status, complaint, diagnosis, odometer, engine_hours, advisor_id, assigned_mechanic_id, currency, customer_po, total_net_minor, total_vat_minor, total_gross_minor, opened_at, ready_at, invoiced_at, closed_at, version, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Name: change_feed_cursor_seq; Type: SEQUENCE SET; Schema: app; Owner: workshop
--

SELECT pg_catalog.setval('app.change_feed_cursor_seq', 1, false);


--
-- Name: ai_interactions ai_interactions_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ai_interactions
    ADD CONSTRAINT ai_interactions_pkey PRIMARY KEY (id);


--
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: appointment_requests appointment_requests_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointment_requests
    ADD CONSTRAINT appointment_requests_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: asset_links asset_links_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.asset_links
    ADD CONSTRAINT asset_links_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_storage_key_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attachments
    ADD CONSTRAINT attachments_storage_key_key UNIQUE (storage_key);


--
-- Name: attendance_breaks attendance_breaks_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_breaks
    ADD CONSTRAINT attendance_breaks_pkey PRIMARY KEY (id);


--
-- Name: attendance_days attendance_days_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_days
    ADD CONSTRAINT attendance_days_pkey PRIMARY KEY (id);


--
-- Name: attendance_days attendance_days_tenant_id_user_id_work_date_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_days
    ADD CONSTRAINT attendance_days_tenant_id_user_id_work_date_key UNIQUE (tenant_id, user_id, work_date);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_tenant_id_seq_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.audit_log
    ADD CONSTRAINT audit_log_tenant_id_seq_key UNIQUE (tenant_id, seq);


--
-- Name: bank_import_entries bank_import_entries_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_import_entries
    ADD CONSTRAINT bank_import_entries_pkey PRIMARY KEY (id);


--
-- Name: bank_import_entries bank_import_entries_tenant_id_fingerprint_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_import_entries
    ADD CONSTRAINT bank_import_entries_tenant_id_fingerprint_key UNIQUE (tenant_id, fingerprint);


--
-- Name: bank_imports bank_imports_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_imports
    ADD CONSTRAINT bank_imports_pkey PRIMARY KEY (id);


--
-- Name: change_feed change_feed_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.change_feed
    ADD CONSTRAINT change_feed_pkey PRIMARY KEY (cursor);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: document_counters document_counters_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.document_counters
    ADD CONSTRAINT document_counters_pkey PRIMARY KEY (tenant_id, doc_type, year);


--
-- Name: einvoice_documents einvoice_documents_invoice_id_channel_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.einvoice_documents
    ADD CONSTRAINT einvoice_documents_invoice_id_channel_key UNIQUE (invoice_id, channel);


--
-- Name: einvoice_documents einvoice_documents_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.einvoice_documents
    ADD CONSTRAINT einvoice_documents_pkey PRIMARY KEY (id);


--
-- Name: estimates estimates_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.estimates
    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);


--
-- Name: field_service_events field_service_events_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.field_service_events
    ADD CONSTRAINT field_service_events_pkey PRIMARY KEY (id);


--
-- Name: fleets fleets_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.fleets
    ADD CONSTRAINT fleets_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_lines goods_receipt_lines_goods_receipt_id_line_no_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_goods_receipt_id_line_no_key UNIQUE (goods_receipt_id, line_no);


--
-- Name: goods_receipt_lines goods_receipt_lines_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: insight_snapshots insight_snapshots_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.insight_snapshots
    ADD CONSTRAINT insight_snapshots_pkey PRIMARY KEY (id);


--
-- Name: integration_credentials integration_credentials_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.integration_credentials
    ADD CONSTRAINT integration_credentials_pkey PRIMARY KEY (id);


--
-- Name: integration_credentials integration_credentials_tenant_id_provider_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.integration_credentials
    ADD CONSTRAINT integration_credentials_tenant_id_provider_key UNIQUE (tenant_id, provider);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_lines invoice_lines_invoice_id_line_no_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_id_line_no_key UNIQUE (invoice_id, line_no);


--
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: invoice_vat_breakdown invoice_vat_breakdown_invoice_id_rate_pct_reverse_charge_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_vat_breakdown
    ADD CONSTRAINT invoice_vat_breakdown_invoice_id_rate_pct_reverse_charge_key UNIQUE (invoice_id, rate_pct, reverse_charge);


--
-- Name: invoice_vat_breakdown invoice_vat_breakdown_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_vat_breakdown
    ADD CONSTRAINT invoice_vat_breakdown_pkey PRIMARY KEY (id);


--
-- Name: invoice_work_orders invoice_work_orders_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_work_orders
    ADD CONSTRAINT invoice_work_orders_pkey PRIMARY KEY (invoice_id, work_order_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: labour_standards labour_standards_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.labour_standards
    ADD CONSTRAINT labour_standards_pkey PRIMARY KEY (id);


--
-- Name: labour_standards labour_standards_tenant_id_op_code_vehicle_class_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.labour_standards
    ADD CONSTRAINT labour_standards_tenant_id_op_code_vehicle_class_key UNIQUE (tenant_id, op_code, vehicle_class);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: login_events login_events_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.login_events
    ADD CONSTRAINT login_events_pkey PRIMARY KEY (id);


--
-- Name: member_permission_overrides member_permission_overrides_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.member_permission_overrides
    ADD CONSTRAINT member_permission_overrides_pkey PRIMARY KEY (tenant_id, user_id, permission);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_tenant_id_user_id_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.memberships
    ADD CONSTRAINT memberships_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ocr_extractions ocr_extractions_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ocr_extractions
    ADD CONSTRAINT ocr_extractions_pkey PRIMARY KEY (id);


--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);


--
-- Name: outbox outbox_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.outbox
    ADD CONSTRAINT outbox_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: parts_categories parts_categories_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.parts_categories
    ADD CONSTRAINT parts_categories_pkey PRIMARY KEY (id);


--
-- Name: payment_allocations payment_allocations_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.payment_allocations
    ADD CONSTRAINT payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plate_recognitions plate_recognitions_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.plate_recognitions
    ADD CONSTRAINT plate_recognitions_pkey PRIMARY KEY (id);


--
-- Name: portal_sessions portal_sessions_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.portal_sessions
    ADD CONSTRAINT portal_sessions_pkey PRIMARY KEY (id);


--
-- Name: presets presets_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.presets
    ADD CONSTRAINT presets_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_lines purchase_order_lines_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_lines purchase_order_lines_purchase_order_id_line_no_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_purchase_order_id_line_no_key UNIQUE (purchase_order_id, line_no);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: rental_contracts rental_contracts_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_pkey PRIMARY KEY (id);


--
-- Name: rental_contracts rental_contracts_tenant_id_number_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_tenant_id_number_key UNIQUE (tenant_id, number);


--
-- Name: rental_damages rental_damages_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_damages
    ADD CONSTRAINT rental_damages_pkey PRIMARY KEY (id);


--
-- Name: rental_reservations rental_reservations_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_reservations
    ADD CONSTRAINT rental_reservations_pkey PRIMARY KEY (id);


--
-- Name: rental_vehicles rental_vehicles_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_vehicles
    ADD CONSTRAINT rental_vehicles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);


--
-- Name: service_vehicles service_vehicles_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.service_vehicles
    ADD CONSTRAINT service_vehicles_pkey PRIMARY KEY (id);


--
-- Name: signup_tokens signup_tokens_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.signup_tokens
    ADD CONSTRAINT signup_tokens_pkey PRIMARY KEY (id);


--
-- Name: signup_tokens signup_tokens_token_hash_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.signup_tokens
    ADD CONSTRAINT signup_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: stock_count_lines stock_count_lines_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_count_lines
    ADD CONSTRAINT stock_count_lines_pkey PRIMARY KEY (id);


--
-- Name: stock_count_lines stock_count_lines_stock_count_id_item_id_location_id_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_count_lines
    ADD CONSTRAINT stock_count_lines_stock_count_id_item_id_location_id_key UNIQUE (stock_count_id, item_id, location_id);


--
-- Name: stock_counts stock_counts_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_counts
    ADD CONSTRAINT stock_counts_pkey PRIMARY KEY (id);


--
-- Name: stock_levels stock_levels_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_levels
    ADD CONSTRAINT stock_levels_pkey PRIMARY KEY (id);


--
-- Name: stock_levels stock_levels_tenant_id_item_id_location_id_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_levels
    ADD CONSTRAINT stock_levels_tenant_id_item_id_location_id_key UNIQUE (tenant_id, item_id, location_id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: supplier_items supplier_items_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.supplier_items
    ADD CONSTRAINT supplier_items_pkey PRIMARY KEY (id);


--
-- Name: supplier_items supplier_items_tenant_id_supplier_id_item_id_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.supplier_items
    ADD CONSTRAINT supplier_items_tenant_id_supplier_id_item_id_key UNIQUE (tenant_id, supplier_id, item_id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: sync_mutations sync_mutations_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.sync_mutations
    ADD CONSTRAINT sync_mutations_pkey PRIMARY KEY (id);


--
-- Name: sync_mutations sync_mutations_tenant_id_device_id_idempotency_key_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.sync_mutations
    ADD CONSTRAINT sync_mutations_tenant_id_device_id_idempotency_key_key UNIQUE (tenant_id, device_id, idempotency_key);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: travel_orders travel_orders_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.travel_orders
    ADD CONSTRAINT travel_orders_pkey PRIMARY KEY (id);


--
-- Name: user_credentials user_credentials_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.user_credentials
    ADD CONSTRAINT user_credentials_pkey PRIMARY KEY (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_external_subject_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_external_subject_key UNIQUE (external_subject);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: voice_drafts voice_drafts_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.voice_drafts
    ADD CONSTRAINT voice_drafts_pkey PRIMARY KEY (id);


--
-- Name: work_order_approvals work_order_approvals_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_approvals
    ADD CONSTRAINT work_order_approvals_pkey PRIMARY KEY (id);


--
-- Name: work_order_lines work_order_lines_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_lines
    ADD CONSTRAINT work_order_lines_pkey PRIMARY KEY (id);


--
-- Name: work_order_lines work_order_lines_work_order_id_line_no_key; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_lines
    ADD CONSTRAINT work_order_lines_work_order_id_line_no_key UNIQUE (work_order_id, line_no);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_interactions_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_ai_interactions_tenant ON app.ai_interactions USING btree (tenant_id, created_at DESC);


--
-- Name: idx_ai_suggestions_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_ai_suggestions_tenant ON app.ai_suggestions USING btree (tenant_id, created_at DESC);


--
-- Name: idx_api_keys_hash; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX idx_api_keys_hash ON app.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_api_keys_tenant ON app.api_keys USING btree (tenant_id, created_at DESC);


--
-- Name: idx_appointments_tenant_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_appointments_tenant_customer ON app.appointments USING btree (tenant_id, customer_id);


--
-- Name: idx_appointments_tenant_start; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_appointments_tenant_start ON app.appointments USING btree (tenant_id, start_at);


--
-- Name: idx_approvals_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_approvals_customer ON app.work_order_approvals USING btree (tenant_id, customer_id, status);


--
-- Name: idx_approvals_wo; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_approvals_wo ON app.work_order_approvals USING btree (tenant_id, work_order_id);


--
-- Name: idx_appt_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_appt_customer ON app.appointment_requests USING btree (tenant_id, customer_id, status);


--
-- Name: idx_asset_links_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_asset_links_tenant ON app.asset_links USING btree (tenant_id);


--
-- Name: idx_assets_tenant_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_assets_tenant_customer ON app.assets USING btree (tenant_id, customer_id);


--
-- Name: idx_attachments_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_attachments_status ON app.attachments USING btree (tenant_id, status);


--
-- Name: idx_attachments_work_order; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_attachments_work_order ON app.attachments USING btree (tenant_id, work_order_id);


--
-- Name: idx_attendance_breaks_day; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_attendance_breaks_day ON app.attendance_breaks USING btree (tenant_id, attendance_day_id);


--
-- Name: idx_attendance_days_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_attendance_days_user ON app.attendance_days USING btree (tenant_id, user_id, work_date DESC);


--
-- Name: idx_audit_tenant_seq; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_audit_tenant_seq ON app.audit_log USING btree (tenant_id, seq DESC);


--
-- Name: idx_bank_entries_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_bank_entries_tenant ON app.bank_import_entries USING btree (tenant_id, created_at DESC);


--
-- Name: idx_bank_imports_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_bank_imports_tenant ON app.bank_imports USING btree (tenant_id, created_at DESC);


--
-- Name: idx_change_feed_tenant_cursor; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_change_feed_tenant_cursor ON app.change_feed USING btree (tenant_id, cursor);


--
-- Name: idx_count_lines_count; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_count_lines_count ON app.stock_count_lines USING btree (tenant_id, stock_count_id);


--
-- Name: idx_counts_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_counts_tenant_status ON app.stock_counts USING btree (tenant_id, status);


--
-- Name: idx_customers_tenant_name; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_customers_tenant_name ON app.customers USING btree (tenant_id, lower(name));


--
-- Name: idx_einvoice_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_einvoice_tenant_status ON app.einvoice_documents USING btree (tenant_id, status);


--
-- Name: idx_estimates_tenant_created; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_estimates_tenant_created ON app.estimates USING btree (tenant_id, created_at DESC);


--
-- Name: idx_estimates_tenant_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_estimates_tenant_customer ON app.estimates USING btree (tenant_id, customer_id);


--
-- Name: idx_field_service_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_field_service_user ON app.field_service_events USING btree (tenant_id, user_id, started_at DESC);


--
-- Name: idx_fleets_tenant_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_fleets_tenant_customer ON app.fleets USING btree (tenant_id, customer_id);


--
-- Name: idx_grn_lines_grn; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_grn_lines_grn ON app.goods_receipt_lines USING btree (tenant_id, goods_receipt_id);


--
-- Name: idx_grn_tenant_po; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_grn_tenant_po ON app.goods_receipts USING btree (tenant_id, purchase_order_id);


--
-- Name: idx_grn_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_grn_tenant_status ON app.goods_receipts USING btree (tenant_id, status);


--
-- Name: idx_insight_snapshots_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_insight_snapshots_tenant ON app.insight_snapshots USING btree (tenant_id, created_at DESC);


--
-- Name: idx_inv_items_barcode; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_inv_items_barcode ON app.inventory_items USING btree (tenant_id, barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_inv_items_category; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_inv_items_category ON app.inventory_items USING btree (tenant_id, category_id) WHERE (category_id IS NOT NULL);


--
-- Name: idx_inv_items_tenant_name; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_inv_items_tenant_name ON app.inventory_items USING btree (tenant_id, lower(name));


--
-- Name: idx_invoice_lines_tenant_inv; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_invoice_lines_tenant_inv ON app.invoice_lines USING btree (tenant_id, invoice_id);


--
-- Name: idx_invoice_lines_wo; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_invoice_lines_wo ON app.invoice_lines USING btree (work_order_id) WHERE (work_order_id IS NOT NULL);


--
-- Name: idx_invoices_tenant_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_invoices_tenant_customer ON app.invoices USING btree (tenant_id, customer_id);


--
-- Name: idx_invoices_tenant_due; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_invoices_tenant_due ON app.invoices USING btree (tenant_id, due_date) WHERE (status = ANY (ARRAY['issued'::text, 'sent'::text, 'partly_paid'::text, 'overdue'::text]));


--
-- Name: idx_invoices_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_invoices_tenant_status ON app.invoices USING btree (tenant_id, status);


--
-- Name: idx_iwo_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_iwo_tenant ON app.invoice_work_orders USING btree (tenant_id, created_at DESC);


--
-- Name: idx_iwo_work_order; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX idx_iwo_work_order ON app.invoice_work_orders USING btree (work_order_id);


--
-- Name: idx_labour_std_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_labour_std_tenant ON app.labour_standards USING btree (tenant_id, op_code);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_leave_requests_status ON app.leave_requests USING btree (tenant_id, status);


--
-- Name: idx_leave_requests_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_leave_requests_user ON app.leave_requests USING btree (tenant_id, user_id, start_date DESC);


--
-- Name: idx_locations_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_locations_tenant ON app.locations USING btree (tenant_id);


--
-- Name: idx_login_events_at; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_login_events_at ON app.login_events USING btree (at DESC);


--
-- Name: idx_login_events_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_login_events_tenant ON app.login_events USING btree (tenant_id, at DESC);


--
-- Name: idx_login_events_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_login_events_user ON app.login_events USING btree (user_id, at DESC);


--
-- Name: idx_memberships_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_memberships_user ON app.memberships USING btree (user_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_notifications_recipient ON app.notifications USING btree (tenant_id, recipient_user_id, created_at DESC);


--
-- Name: idx_ocr_extractions_attachment; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_ocr_extractions_attachment ON app.ocr_extractions USING btree (tenant_id, attachment_id);


--
-- Name: idx_ocr_extractions_grn; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_ocr_extractions_grn ON app.ocr_extractions USING btree (tenant_id, goods_receipt_id);


--
-- Name: idx_ocr_extractions_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_ocr_extractions_tenant ON app.ocr_extractions USING btree (tenant_id, created_at DESC);


--
-- Name: idx_outbox_due; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_outbox_due ON app.outbox USING btree (status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));


--
-- Name: idx_parts_categories_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_parts_categories_tenant ON app.parts_categories USING btree (tenant_id, parent_id);


--
-- Name: idx_pay_alloc_invoice; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_pay_alloc_invoice ON app.payment_allocations USING btree (tenant_id, invoice_id);


--
-- Name: idx_payments_tenant_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_payments_tenant_customer ON app.payments USING btree (tenant_id, customer_id);


--
-- Name: idx_perm_overrides_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_perm_overrides_user ON app.member_permission_overrides USING btree (tenant_id, user_id);


--
-- Name: idx_plate_recognitions_asset; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_plate_recognitions_asset ON app.plate_recognitions USING btree (tenant_id, confirmed_asset_id);


--
-- Name: idx_plate_recognitions_attachment; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_plate_recognitions_attachment ON app.plate_recognitions USING btree (tenant_id, attachment_id);


--
-- Name: idx_plate_recognitions_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_plate_recognitions_tenant ON app.plate_recognitions USING btree (tenant_id, created_at DESC);


--
-- Name: idx_po_lines_po; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_po_lines_po ON app.purchase_order_lines USING btree (tenant_id, purchase_order_id);


--
-- Name: idx_po_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_po_tenant_status ON app.purchase_orders USING btree (tenant_id, status);


--
-- Name: idx_po_tenant_supplier; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_po_tenant_supplier ON app.purchase_orders USING btree (tenant_id, supplier_id);


--
-- Name: idx_portal_sessions_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_portal_sessions_customer ON app.portal_sessions USING btree (tenant_id, customer_id);


--
-- Name: idx_portal_sessions_lookup; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_portal_sessions_lookup ON app.portal_sessions USING btree (tenant_id, token_hash) WHERE (revoked_at IS NULL);


--
-- Name: idx_presets_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_presets_tenant ON app.presets USING btree (tenant_id, active);


--
-- Name: idx_rental_contracts_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_rental_contracts_tenant_status ON app.rental_contracts USING btree (tenant_id, status);


--
-- Name: idx_rental_contracts_tenant_vehicle; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_rental_contracts_tenant_vehicle ON app.rental_contracts USING btree (tenant_id, rental_vehicle_id);


--
-- Name: idx_rental_damages_tenant_contract; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_rental_damages_tenant_contract ON app.rental_damages USING btree (tenant_id, contract_id);


--
-- Name: idx_rental_res_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_rental_res_tenant_status ON app.rental_reservations USING btree (tenant_id, status);


--
-- Name: idx_rental_res_tenant_vehicle; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_rental_res_tenant_vehicle ON app.rental_reservations USING btree (tenant_id, rental_vehicle_id, start_at);


--
-- Name: idx_rental_vehicles_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_rental_vehicles_tenant ON app.rental_vehicles USING btree (tenant_id, status);


--
-- Name: idx_service_vehicles_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_service_vehicles_tenant ON app.service_vehicles USING btree (tenant_id, status);


--
-- Name: idx_signup_tokens_email; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_signup_tokens_email ON app.signup_tokens USING btree (email) WHERE (used_at IS NULL);


--
-- Name: idx_stock_levels_tenant_item; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_stock_levels_tenant_item ON app.stock_levels USING btree (tenant_id, item_id);


--
-- Name: idx_stock_moves_tenant_item; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_stock_moves_tenant_item ON app.stock_movements USING btree (tenant_id, item_id, created_at DESC);


--
-- Name: idx_stock_moves_transfer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_stock_moves_transfer ON app.stock_movements USING btree (tenant_id, transfer_id) WHERE (transfer_id IS NOT NULL);


--
-- Name: idx_supplier_items_item; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_supplier_items_item ON app.supplier_items USING btree (tenant_id, item_id);


--
-- Name: idx_supplier_items_supplier; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_supplier_items_supplier ON app.supplier_items USING btree (tenant_id, supplier_id);


--
-- Name: idx_suppliers_tenant_name; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_suppliers_tenant_name ON app.suppliers USING btree (tenant_id, lower(name));


--
-- Name: idx_time_entries_tenant_wo; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_time_entries_tenant_wo ON app.time_entries USING btree (tenant_id, work_order_id);


--
-- Name: idx_travel_orders_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_travel_orders_status ON app.travel_orders USING btree (tenant_id, status);


--
-- Name: idx_travel_orders_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_travel_orders_user ON app.travel_orders USING btree (tenant_id, user_id, created_at DESC);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_user_sessions_user ON app.user_sessions USING btree (user_id) WHERE (revoked_at IS NULL);


--
-- Name: idx_voice_drafts_attachment; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_voice_drafts_attachment ON app.voice_drafts USING btree (tenant_id, attachment_id);


--
-- Name: idx_voice_drafts_tenant; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_voice_drafts_tenant ON app.voice_drafts USING btree (tenant_id, created_at DESC);


--
-- Name: idx_voice_drafts_work_order; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_voice_drafts_work_order ON app.voice_drafts USING btree (tenant_id, work_order_id);


--
-- Name: idx_wol_tenant_wo; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_wol_tenant_wo ON app.work_order_lines USING btree (tenant_id, work_order_id);


--
-- Name: idx_work_orders_tenant_asset; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_work_orders_tenant_asset ON app.work_orders USING btree (tenant_id, asset_id);


--
-- Name: idx_work_orders_tenant_customer; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_work_orders_tenant_customer ON app.work_orders USING btree (tenant_id, customer_id);


--
-- Name: idx_work_orders_tenant_status; Type: INDEX; Schema: app; Owner: workshop
--

CREATE INDEX idx_work_orders_tenant_status ON app.work_orders USING btree (tenant_id, status);


--
-- Name: tenants_stripe_customer_uq; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX tenants_stripe_customer_uq ON app.tenants USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);


--
-- Name: tenants_stripe_subscription_uq; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX tenants_stripe_subscription_uq ON app.tenants USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: uq_assets_tenant_plate; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_assets_tenant_plate ON app.assets USING btree (tenant_id, country_of_plate, plate);


--
-- Name: uq_customers_tenant_code; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_customers_tenant_code ON app.customers USING btree (tenant_id, code) WHERE (code IS NOT NULL);


--
-- Name: uq_customers_tenant_minimax; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_customers_tenant_minimax ON app.customers USING btree (tenant_id, minimax_partner_id) WHERE (minimax_partner_id IS NOT NULL);


--
-- Name: uq_estimates_tenant_number; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_estimates_tenant_number ON app.estimates USING btree (tenant_id, number);


--
-- Name: uq_inv_items_tenant_sku; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_inv_items_tenant_sku ON app.inventory_items USING btree (tenant_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: uq_invoices_number; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_invoices_number ON app.invoices USING btree (tenant_id, number) WHERE (number IS NOT NULL);


--
-- Name: uq_one_open_entry_per_mechanic; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_one_open_entry_per_mechanic ON app.time_entries USING btree (tenant_id, mechanic_id) WHERE (ended_at IS NULL);


--
-- Name: uq_supplier_items_preferred; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_supplier_items_preferred ON app.supplier_items USING btree (tenant_id, item_id) WHERE (preferred = true);


--
-- Name: uq_suppliers_tenant_code; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_suppliers_tenant_code ON app.suppliers USING btree (tenant_id, code) WHERE (code IS NOT NULL);


--
-- Name: uq_user_session_device; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_user_session_device ON app.user_sessions USING btree (user_id, device_id) WHERE ((revoked_at IS NULL) AND (device_id IS NOT NULL));


--
-- Name: uq_work_orders_number; Type: INDEX; Schema: app; Owner: workshop
--

CREATE UNIQUE INDEX uq_work_orders_number ON app.work_orders USING btree (tenant_id, number) WHERE (number IS NOT NULL);


--
-- Name: audit_log audit_no_delete; Type: RULE; Schema: app; Owner: workshop
--

CREATE RULE audit_no_delete AS
    ON DELETE TO app.audit_log DO INSTEAD NOTHING;


--
-- Name: audit_log audit_no_update; Type: RULE; Schema: app; Owner: workshop
--

CREATE RULE audit_no_update AS
    ON UPDATE TO app.audit_log DO INSTEAD NOTHING;


--
-- Name: payment_allocations pay_alloc_no_delete; Type: RULE; Schema: app; Owner: workshop
--

CREATE RULE pay_alloc_no_delete AS
    ON DELETE TO app.payment_allocations DO INSTEAD NOTHING;


--
-- Name: payment_allocations pay_alloc_no_update; Type: RULE; Schema: app; Owner: workshop
--

CREATE RULE pay_alloc_no_update AS
    ON UPDATE TO app.payment_allocations DO INSTEAD NOTHING;


--
-- Name: stock_movements stock_moves_no_delete; Type: RULE; Schema: app; Owner: workshop
--

CREATE RULE stock_moves_no_delete AS
    ON DELETE TO app.stock_movements DO INSTEAD NOTHING;


--
-- Name: stock_movements stock_moves_no_update; Type: RULE; Schema: app; Owner: workshop
--

CREATE RULE stock_moves_no_update AS
    ON UPDATE TO app.stock_movements DO INSTEAD NOTHING;


--
-- Name: appointments trg_appointments_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_appointments_touch BEFORE UPDATE ON app.appointments FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: work_order_approvals trg_approvals_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_approvals_touch BEFORE UPDATE ON app.work_order_approvals FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: appointment_requests trg_appt_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_appt_touch BEFORE UPDATE ON app.appointment_requests FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: assets trg_assets_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_assets_touch BEFORE UPDATE ON app.assets FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: attendance_breaks trg_attendance_breaks_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_attendance_breaks_touch BEFORE UPDATE ON app.attendance_breaks FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: attendance_days trg_attendance_days_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_attendance_days_touch BEFORE UPDATE ON app.attendance_days FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: stock_counts trg_counts_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_counts_touch BEFORE UPDATE ON app.stock_counts FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: customers trg_customers_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_customers_touch BEFORE UPDATE ON app.customers FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: einvoice_documents trg_einvoice_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_einvoice_touch BEFORE UPDATE ON app.einvoice_documents FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: estimates trg_estimates_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_estimates_touch BEFORE UPDATE ON app.estimates FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: field_service_events trg_field_service_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_field_service_touch BEFORE UPDATE ON app.field_service_events FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: fleets trg_fleets_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_fleets_touch BEFORE UPDATE ON app.fleets FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: goods_receipts trg_grn_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_grn_touch BEFORE UPDATE ON app.goods_receipts FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: integration_credentials trg_intcred_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_intcred_touch BEFORE UPDATE ON app.integration_credentials FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: inventory_items trg_inv_items_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_inv_items_touch BEFORE UPDATE ON app.inventory_items FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: invoices trg_invoices_immutable; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_invoices_immutable BEFORE UPDATE ON app.invoices FOR EACH ROW EXECUTE FUNCTION app.invoices_guard_immutable();


--
-- Name: invoices trg_invoices_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_invoices_touch BEFORE UPDATE ON app.invoices FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: labour_standards trg_labour_std_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_labour_std_touch BEFORE UPDATE ON app.labour_standards FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: leave_requests trg_leave_requests_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_leave_requests_touch BEFORE UPDATE ON app.leave_requests FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: memberships trg_memberships_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_memberships_touch BEFORE UPDATE ON app.memberships FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: ocr_extractions trg_ocr_extractions_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_ocr_extractions_touch BEFORE UPDATE ON app.ocr_extractions FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: outbox trg_outbox_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_outbox_touch BEFORE UPDATE ON app.outbox FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: parts_categories trg_parts_categories_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_parts_categories_touch BEFORE UPDATE ON app.parts_categories FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: plate_recognitions trg_plate_recognitions_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_plate_recognitions_touch BEFORE UPDATE ON app.plate_recognitions FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: purchase_orders trg_po_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_po_touch BEFORE UPDATE ON app.purchase_orders FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: presets trg_presets_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_presets_touch BEFORE UPDATE ON app.presets FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: rental_contracts trg_rental_contracts_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_rental_contracts_touch BEFORE UPDATE ON app.rental_contracts FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: rental_damages trg_rental_damages_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_rental_damages_touch BEFORE UPDATE ON app.rental_damages FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: rental_reservations trg_rental_reservations_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_rental_reservations_touch BEFORE UPDATE ON app.rental_reservations FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: rental_vehicles trg_rental_vehicles_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_rental_vehicles_touch BEFORE UPDATE ON app.rental_vehicles FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: service_vehicles trg_service_vehicles_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_service_vehicles_touch BEFORE UPDATE ON app.service_vehicles FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: stock_levels trg_stock_levels_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_stock_levels_touch BEFORE UPDATE ON app.stock_levels FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: supplier_items trg_supplier_items_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_supplier_items_touch BEFORE UPDATE ON app.supplier_items FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: suppliers trg_suppliers_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_suppliers_touch BEFORE UPDATE ON app.suppliers FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: time_entries trg_te_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_te_touch BEFORE UPDATE ON app.time_entries FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: tenants trg_tenants_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_tenants_touch BEFORE UPDATE ON app.tenants FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: travel_orders trg_travel_orders_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_travel_orders_touch BEFORE UPDATE ON app.travel_orders FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: user_credentials trg_user_credentials_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_user_credentials_touch BEFORE UPDATE ON app.user_credentials FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: users trg_users_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_users_touch BEFORE UPDATE ON app.users FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: voice_drafts trg_voice_drafts_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_voice_drafts_touch BEFORE UPDATE ON app.voice_drafts FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: work_orders trg_wo_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_wo_touch BEFORE UPDATE ON app.work_orders FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: work_order_lines trg_wol_touch; Type: TRIGGER; Schema: app; Owner: workshop
--

CREATE TRIGGER trg_wol_touch BEFORE UPDATE ON app.work_order_lines FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: ai_interactions ai_interactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ai_interactions
    ADD CONSTRAINT ai_interactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: ai_suggestions ai_suggestions_interaction_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ai_suggestions
    ADD CONSTRAINT ai_suggestions_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES app.ai_interactions(id) ON DELETE CASCADE;


--
-- Name: ai_suggestions ai_suggestions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ai_suggestions
    ADD CONSTRAINT ai_suggestions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES app.users(id);


--
-- Name: api_keys api_keys_revoked_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.api_keys
    ADD CONSTRAINT api_keys_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES app.users(id);


--
-- Name: api_keys api_keys_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.api_keys
    ADD CONSTRAINT api_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: appointment_requests appointment_requests_asset_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointment_requests
    ADD CONSTRAINT appointment_requests_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES app.assets(id) ON DELETE SET NULL;


--
-- Name: appointment_requests appointment_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointment_requests
    ADD CONSTRAINT appointment_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE CASCADE;


--
-- Name: appointment_requests appointment_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointment_requests
    ADD CONSTRAINT appointment_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_asset_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointments
    ADD CONSTRAINT appointments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES app.assets(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointments
    ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointments
    ADD CONSTRAINT appointments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.appointments
    ADD CONSTRAINT appointments_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE SET NULL;


--
-- Name: asset_links asset_links_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.asset_links
    ADD CONSTRAINT asset_links_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: asset_links asset_links_tractor_asset_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.asset_links
    ADD CONSTRAINT asset_links_tractor_asset_id_fkey FOREIGN KEY (tractor_asset_id) REFERENCES app.assets(id) ON DELETE CASCADE;


--
-- Name: asset_links asset_links_trailer_asset_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.asset_links
    ADD CONSTRAINT asset_links_trailer_asset_id_fkey FOREIGN KEY (trailer_asset_id) REFERENCES app.assets(id) ON DELETE CASCADE;


--
-- Name: assets assets_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.assets
    ADD CONSTRAINT assets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE RESTRICT;


--
-- Name: assets assets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.assets
    ADD CONSTRAINT assets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attachments
    ADD CONSTRAINT attachments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attachments
    ADD CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES app.users(id);


--
-- Name: attachments attachments_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attachments
    ADD CONSTRAINT attachments_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE CASCADE;


--
-- Name: attendance_breaks attendance_breaks_attendance_day_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_breaks
    ADD CONSTRAINT attendance_breaks_attendance_day_id_fkey FOREIGN KEY (attendance_day_id) REFERENCES app.attendance_days(id) ON DELETE CASCADE;


--
-- Name: attendance_breaks attendance_breaks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_breaks
    ADD CONSTRAINT attendance_breaks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: attendance_days attendance_days_corrected_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_days
    ADD CONSTRAINT attendance_days_corrected_by_fkey FOREIGN KEY (corrected_by) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: attendance_days attendance_days_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_days
    ADD CONSTRAINT attendance_days_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: attendance_days attendance_days_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.attendance_days
    ADD CONSTRAINT attendance_days_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: audit_log audit_log_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.audit_log
    ADD CONSTRAINT audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: bank_import_entries bank_import_entries_import_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_import_entries
    ADD CONSTRAINT bank_import_entries_import_id_fkey FOREIGN KEY (import_id) REFERENCES app.bank_imports(id) ON DELETE SET NULL;


--
-- Name: bank_import_entries bank_import_entries_matched_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_import_entries
    ADD CONSTRAINT bank_import_entries_matched_invoice_id_fkey FOREIGN KEY (matched_invoice_id) REFERENCES app.invoices(id) ON DELETE SET NULL;


--
-- Name: bank_import_entries bank_import_entries_payment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_import_entries
    ADD CONSTRAINT bank_import_entries_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES app.payments(id) ON DELETE SET NULL;


--
-- Name: bank_import_entries bank_import_entries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_import_entries
    ADD CONSTRAINT bank_import_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: bank_imports bank_imports_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.bank_imports
    ADD CONSTRAINT bank_imports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: change_feed change_feed_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.change_feed
    ADD CONSTRAINT change_feed_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: customers customers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: customers customers_vat_id_validated_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_vat_id_validated_by_fkey FOREIGN KEY (vat_id_validated_by) REFERENCES app.users(id);


--
-- Name: document_counters document_counters_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.document_counters
    ADD CONSTRAINT document_counters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: einvoice_documents einvoice_documents_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.einvoice_documents
    ADD CONSTRAINT einvoice_documents_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id) ON DELETE CASCADE;


--
-- Name: einvoice_documents einvoice_documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.einvoice_documents
    ADD CONSTRAINT einvoice_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: estimates estimates_asset_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.estimates
    ADD CONSTRAINT estimates_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES app.assets(id) ON DELETE SET NULL;


--
-- Name: estimates estimates_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.estimates
    ADD CONSTRAINT estimates_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE RESTRICT;


--
-- Name: estimates estimates_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.estimates
    ADD CONSTRAINT estimates_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id) ON DELETE SET NULL;


--
-- Name: estimates estimates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.estimates
    ADD CONSTRAINT estimates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: estimates estimates_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.estimates
    ADD CONSTRAINT estimates_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE SET NULL;


--
-- Name: field_service_events field_service_events_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.field_service_events
    ADD CONSTRAINT field_service_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE SET NULL;


--
-- Name: field_service_events field_service_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.field_service_events
    ADD CONSTRAINT field_service_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: field_service_events field_service_events_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.field_service_events
    ADD CONSTRAINT field_service_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: assets fk_assets_fleet; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.assets
    ADD CONSTRAINT fk_assets_fleet FOREIGN KEY (fleet_id) REFERENCES app.fleets(id) ON DELETE SET NULL;


--
-- Name: inventory_items fk_inv_items_category; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.inventory_items
    ADD CONSTRAINT fk_inv_items_category FOREIGN KEY (category_id) REFERENCES app.parts_categories(id) ON DELETE SET NULL;


--
-- Name: inventory_items fk_inv_items_preferred_supplier; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.inventory_items
    ADD CONSTRAINT fk_inv_items_preferred_supplier FOREIGN KEY (preferred_supplier_id) REFERENCES app.suppliers(id) ON DELETE SET NULL;


--
-- Name: inventory_items fk_inv_items_superseded_by; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.inventory_items
    ADD CONSTRAINT fk_inv_items_superseded_by FOREIGN KEY (superseded_by_id) REFERENCES app.inventory_items(id) ON DELETE SET NULL;


--
-- Name: work_order_lines fk_wol_item; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_lines
    ADD CONSTRAINT fk_wol_item FOREIGN KEY (inventory_item_id) REFERENCES app.inventory_items(id) ON DELETE SET NULL;


--
-- Name: fleets fleets_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.fleets
    ADD CONSTRAINT fleets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE CASCADE;


--
-- Name: fleets fleets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.fleets
    ADD CONSTRAINT fleets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: goods_receipt_lines goods_receipt_lines_goods_receipt_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_goods_receipt_id_fkey FOREIGN KEY (goods_receipt_id) REFERENCES app.goods_receipts(id) ON DELETE CASCADE;


--
-- Name: goods_receipt_lines goods_receipt_lines_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_item_id_fkey FOREIGN KEY (item_id) REFERENCES app.inventory_items(id) ON DELETE RESTRICT;


--
-- Name: goods_receipt_lines goods_receipt_lines_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_location_id_fkey FOREIGN KEY (location_id) REFERENCES app.locations(id) ON DELETE RESTRICT;


--
-- Name: goods_receipt_lines goods_receipt_lines_movement_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES app.stock_movements(id) ON DELETE SET NULL;


--
-- Name: goods_receipt_lines goods_receipt_lines_purchase_order_line_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_purchase_order_line_id_fkey FOREIGN KEY (purchase_order_line_id) REFERENCES app.purchase_order_lines(id) ON DELETE SET NULL;


--
-- Name: goods_receipt_lines goods_receipt_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: goods_receipts goods_receipts_ocr_attachment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipts
    ADD CONSTRAINT goods_receipts_ocr_attachment_id_fkey FOREIGN KEY (ocr_attachment_id) REFERENCES app.attachments(id) ON DELETE SET NULL;


--
-- Name: goods_receipts goods_receipts_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipts
    ADD CONSTRAINT goods_receipts_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES app.purchase_orders(id) ON DELETE SET NULL;


--
-- Name: goods_receipts goods_receipts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipts
    ADD CONSTRAINT goods_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES app.suppliers(id) ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.goods_receipts
    ADD CONSTRAINT goods_receipts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: insight_snapshots insight_snapshots_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.insight_snapshots
    ADD CONSTRAINT insight_snapshots_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: integration_credentials integration_credentials_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.integration_credentials
    ADD CONSTRAINT integration_credentials_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.inventory_items
    ADD CONSTRAINT inventory_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_lines
    ADD CONSTRAINT invoice_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_lines
    ADD CONSTRAINT invoice_lines_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE SET NULL;


--
-- Name: invoice_vat_breakdown invoice_vat_breakdown_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_vat_breakdown
    ADD CONSTRAINT invoice_vat_breakdown_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_vat_breakdown invoice_vat_breakdown_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_vat_breakdown
    ADD CONSTRAINT invoice_vat_breakdown_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: invoice_work_orders invoice_work_orders_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_work_orders
    ADD CONSTRAINT invoice_work_orders_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_work_orders invoice_work_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_work_orders
    ADD CONSTRAINT invoice_work_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: invoice_work_orders invoice_work_orders_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoice_work_orders
    ADD CONSTRAINT invoice_work_orders_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id);


--
-- Name: invoices invoices_corrects_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoices
    ADD CONSTRAINT invoices_corrects_invoice_id_fkey FOREIGN KEY (corrects_invoice_id) REFERENCES app.invoices(id) ON DELETE RESTRICT;


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE RESTRICT;


--
-- Name: invoices invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoices
    ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.invoices
    ADD CONSTRAINT invoices_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE SET NULL;


--
-- Name: labour_standards labour_standards_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.labour_standards
    ADD CONSTRAINT labour_standards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_decided_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.leave_requests
    ADD CONSTRAINT leave_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.leave_requests
    ADD CONSTRAINT leave_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.leave_requests
    ADD CONSTRAINT leave_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: locations locations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.locations
    ADD CONSTRAINT locations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: login_events login_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.login_events
    ADD CONSTRAINT login_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE SET NULL;


--
-- Name: login_events login_events_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.login_events
    ADD CONSTRAINT login_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: member_permission_overrides member_permission_overrides_created_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.member_permission_overrides
    ADD CONSTRAINT member_permission_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES app.users(id);


--
-- Name: member_permission_overrides member_permission_overrides_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.member_permission_overrides
    ADD CONSTRAINT member_permission_overrides_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: member_permission_overrides member_permission_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.member_permission_overrides
    ADD CONSTRAINT member_permission_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.memberships
    ADD CONSTRAINT memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.notifications
    ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: ocr_extractions ocr_extractions_attachment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ocr_extractions
    ADD CONSTRAINT ocr_extractions_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES app.attachments(id) ON DELETE SET NULL;


--
-- Name: ocr_extractions ocr_extractions_goods_receipt_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ocr_extractions
    ADD CONSTRAINT ocr_extractions_goods_receipt_id_fkey FOREIGN KEY (goods_receipt_id) REFERENCES app.goods_receipts(id) ON DELETE SET NULL;


--
-- Name: ocr_extractions ocr_extractions_matched_supplier_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ocr_extractions
    ADD CONSTRAINT ocr_extractions_matched_supplier_id_fkey FOREIGN KEY (matched_supplier_id) REFERENCES app.suppliers(id) ON DELETE SET NULL;


--
-- Name: ocr_extractions ocr_extractions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.ocr_extractions
    ADD CONSTRAINT ocr_extractions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: outbox outbox_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.outbox
    ADD CONSTRAINT outbox_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: parts_categories parts_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.parts_categories
    ADD CONSTRAINT parts_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES app.parts_categories(id) ON DELETE SET NULL;


--
-- Name: parts_categories parts_categories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.parts_categories
    ADD CONSTRAINT parts_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: payment_allocations payment_allocations_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.payment_allocations
    ADD CONSTRAINT payment_allocations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id) ON DELETE RESTRICT;


--
-- Name: payment_allocations payment_allocations_payment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.payment_allocations
    ADD CONSTRAINT payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES app.payments(id) ON DELETE CASCADE;


--
-- Name: payment_allocations payment_allocations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.payment_allocations
    ADD CONSTRAINT payment_allocations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE RESTRICT;


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: plate_recognitions plate_recognitions_attachment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.plate_recognitions
    ADD CONSTRAINT plate_recognitions_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES app.attachments(id) ON DELETE SET NULL;


--
-- Name: plate_recognitions plate_recognitions_confirmed_asset_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.plate_recognitions
    ADD CONSTRAINT plate_recognitions_confirmed_asset_id_fkey FOREIGN KEY (confirmed_asset_id) REFERENCES app.assets(id) ON DELETE SET NULL;


--
-- Name: plate_recognitions plate_recognitions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.plate_recognitions
    ADD CONSTRAINT plate_recognitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: plate_recognitions plate_recognitions_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.plate_recognitions
    ADD CONSTRAINT plate_recognitions_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE SET NULL;


--
-- Name: portal_sessions portal_sessions_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.portal_sessions
    ADD CONSTRAINT portal_sessions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE CASCADE;


--
-- Name: portal_sessions portal_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.portal_sessions
    ADD CONSTRAINT portal_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: presets presets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.presets
    ADD CONSTRAINT presets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_item_id_fkey FOREIGN KEY (item_id) REFERENCES app.inventory_items(id) ON DELETE RESTRICT;


--
-- Name: purchase_order_lines purchase_order_lines_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES app.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES app.supplier_items(id) ON DELETE SET NULL;


--
-- Name: purchase_order_lines purchase_order_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_ship_to_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_orders
    ADD CONSTRAINT purchase_orders_ship_to_location_id_fkey FOREIGN KEY (ship_to_location_id) REFERENCES app.locations(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES app.suppliers(id) ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.purchase_orders
    ADD CONSTRAINT purchase_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: rental_contracts rental_contracts_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE RESTRICT;


--
-- Name: rental_contracts rental_contracts_handover_signature_attachment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_handover_signature_attachment_id_fkey FOREIGN KEY (handover_signature_attachment_id) REFERENCES app.attachments(id) ON DELETE SET NULL;


--
-- Name: rental_contracts rental_contracts_invoice_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id) ON DELETE SET NULL;


--
-- Name: rental_contracts rental_contracts_rental_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_rental_vehicle_id_fkey FOREIGN KEY (rental_vehicle_id) REFERENCES app.rental_vehicles(id) ON DELETE RESTRICT;


--
-- Name: rental_contracts rental_contracts_reservation_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES app.rental_reservations(id) ON DELETE SET NULL;


--
-- Name: rental_contracts rental_contracts_return_signature_attachment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_return_signature_attachment_id_fkey FOREIGN KEY (return_signature_attachment_id) REFERENCES app.attachments(id) ON DELETE SET NULL;


--
-- Name: rental_contracts rental_contracts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_contracts
    ADD CONSTRAINT rental_contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: rental_damages rental_damages_contract_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_damages
    ADD CONSTRAINT rental_damages_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES app.rental_contracts(id) ON DELETE CASCADE;


--
-- Name: rental_damages rental_damages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_damages
    ADD CONSTRAINT rental_damages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: rental_reservations rental_reservations_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_reservations
    ADD CONSTRAINT rental_reservations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE RESTRICT;


--
-- Name: rental_reservations rental_reservations_rental_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_reservations
    ADD CONSTRAINT rental_reservations_rental_vehicle_id_fkey FOREIGN KEY (rental_vehicle_id) REFERENCES app.rental_vehicles(id) ON DELETE RESTRICT;


--
-- Name: rental_reservations rental_reservations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_reservations
    ADD CONSTRAINT rental_reservations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: rental_vehicles rental_vehicles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.rental_vehicles
    ADD CONSTRAINT rental_vehicles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: service_vehicles service_vehicles_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.service_vehicles
    ADD CONSTRAINT service_vehicles_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: service_vehicles service_vehicles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.service_vehicles
    ADD CONSTRAINT service_vehicles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_count_lines stock_count_lines_adjustment_movement_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_count_lines
    ADD CONSTRAINT stock_count_lines_adjustment_movement_id_fkey FOREIGN KEY (adjustment_movement_id) REFERENCES app.stock_movements(id) ON DELETE SET NULL;


--
-- Name: stock_count_lines stock_count_lines_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_count_lines
    ADD CONSTRAINT stock_count_lines_item_id_fkey FOREIGN KEY (item_id) REFERENCES app.inventory_items(id) ON DELETE RESTRICT;


--
-- Name: stock_count_lines stock_count_lines_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_count_lines
    ADD CONSTRAINT stock_count_lines_location_id_fkey FOREIGN KEY (location_id) REFERENCES app.locations(id) ON DELETE RESTRICT;


--
-- Name: stock_count_lines stock_count_lines_stock_count_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_count_lines
    ADD CONSTRAINT stock_count_lines_stock_count_id_fkey FOREIGN KEY (stock_count_id) REFERENCES app.stock_counts(id) ON DELETE CASCADE;


--
-- Name: stock_count_lines stock_count_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_count_lines
    ADD CONSTRAINT stock_count_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_counts stock_counts_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_counts
    ADD CONSTRAINT stock_counts_location_id_fkey FOREIGN KEY (location_id) REFERENCES app.locations(id) ON DELETE SET NULL;


--
-- Name: stock_counts stock_counts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_counts
    ADD CONSTRAINT stock_counts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_levels
    ADD CONSTRAINT stock_levels_item_id_fkey FOREIGN KEY (item_id) REFERENCES app.inventory_items(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_levels
    ADD CONSTRAINT stock_levels_location_id_fkey FOREIGN KEY (location_id) REFERENCES app.locations(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_levels
    ADD CONSTRAINT stock_levels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_movements
    ADD CONSTRAINT stock_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES app.inventory_items(id) ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_movements
    ADD CONSTRAINT stock_movements_location_id_fkey FOREIGN KEY (location_id) REFERENCES app.locations(id) ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_movements
    ADD CONSTRAINT stock_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_work_order_line_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.stock_movements
    ADD CONSTRAINT stock_movements_work_order_line_id_fkey FOREIGN KEY (work_order_line_id) REFERENCES app.work_order_lines(id) ON DELETE SET NULL;


--
-- Name: supplier_items supplier_items_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.supplier_items
    ADD CONSTRAINT supplier_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES app.inventory_items(id) ON DELETE CASCADE;


--
-- Name: supplier_items supplier_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.supplier_items
    ADD CONSTRAINT supplier_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES app.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_items supplier_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.supplier_items
    ADD CONSTRAINT supplier_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.suppliers
    ADD CONSTRAINT suppliers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: sync_mutations sync_mutations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.sync_mutations
    ADD CONSTRAINT sync_mutations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_mechanic_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.time_entries
    ADD CONSTRAINT time_entries_mechanic_id_fkey FOREIGN KEY (mechanic_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: time_entries time_entries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.time_entries
    ADD CONSTRAINT time_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.time_entries
    ADD CONSTRAINT time_entries_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE CASCADE;


--
-- Name: travel_orders travel_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.travel_orders
    ADD CONSTRAINT travel_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE SET NULL;


--
-- Name: travel_orders travel_orders_service_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.travel_orders
    ADD CONSTRAINT travel_orders_service_vehicle_id_fkey FOREIGN KEY (service_vehicle_id) REFERENCES app.service_vehicles(id) ON DELETE SET NULL;


--
-- Name: travel_orders travel_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.travel_orders
    ADD CONSTRAINT travel_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: travel_orders travel_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.travel_orders
    ADD CONSTRAINT travel_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: travel_orders travel_orders_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.travel_orders
    ADD CONSTRAINT travel_orders_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE SET NULL;


--
-- Name: user_credentials user_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.user_credentials
    ADD CONSTRAINT user_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: voice_drafts voice_drafts_attachment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.voice_drafts
    ADD CONSTRAINT voice_drafts_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES app.attachments(id) ON DELETE SET NULL;


--
-- Name: voice_drafts voice_drafts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.voice_drafts
    ADD CONSTRAINT voice_drafts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: voice_drafts voice_drafts_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.voice_drafts
    ADD CONSTRAINT voice_drafts_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE SET NULL;


--
-- Name: work_order_approvals work_order_approvals_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_approvals
    ADD CONSTRAINT work_order_approvals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE CASCADE;


--
-- Name: work_order_approvals work_order_approvals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_approvals
    ADD CONSTRAINT work_order_approvals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: work_order_approvals work_order_approvals_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_approvals
    ADD CONSTRAINT work_order_approvals_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_order_lines work_order_lines_reserved_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_lines
    ADD CONSTRAINT work_order_lines_reserved_location_id_fkey FOREIGN KEY (reserved_location_id) REFERENCES app.locations(id) ON DELETE SET NULL;


--
-- Name: work_order_lines work_order_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_lines
    ADD CONSTRAINT work_order_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: work_order_lines work_order_lines_work_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_order_lines
    ADD CONSTRAINT work_order_lines_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES app.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_orders work_orders_advisor_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_asset_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES app.assets(id) ON DELETE RESTRICT;


--
-- Name: work_orders work_orders_assigned_mechanic_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_assigned_mechanic_id_fkey FOREIGN KEY (assigned_mechanic_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app.customers(id) ON DELETE RESTRICT;


--
-- Name: work_orders work_orders_fleet_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_fleet_id_fkey FOREIGN KEY (fleet_id) REFERENCES app.fleets(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_location_id_fkey FOREIGN KEY (location_id) REFERENCES app.locations(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: workshop
--

ALTER TABLE ONLY app.work_orders
    ADD CONSTRAINT work_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES app.tenants(id) ON DELETE CASCADE;


--
-- Name: ai_interactions; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.ai_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_suggestions; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.ai_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: appointment_requests; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.appointment_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_links; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.asset_links ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: attachments; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: attachments attachments_tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY attachments_tenant_isolation ON app.attachments USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)) WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));


--
-- Name: attendance_breaks; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.attendance_breaks ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_days; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.attendance_days ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_import_entries; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.bank_import_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_imports; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.bank_imports ENABLE ROW LEVEL SECURITY;

--
-- Name: change_feed; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.change_feed ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: document_counters; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.document_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: einvoice_documents; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.einvoice_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: estimates; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.estimates ENABLE ROW LEVEL SECURITY;

--
-- Name: field_service_events; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.field_service_events ENABLE ROW LEVEL SECURITY;

--
-- Name: fleets; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.fleets ENABLE ROW LEVEL SECURITY;

--
-- Name: goods_receipt_lines; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.goods_receipt_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: goods_receipts; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.goods_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: insight_snapshots; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.insight_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_credentials; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.integration_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_lines; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.invoice_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_vat_breakdown; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.invoice_vat_breakdown ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_work_orders; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.invoice_work_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: labour_standards; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.labour_standards ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_requests; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: locations; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: member_permission_overrides; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.member_permission_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: ocr_extractions; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.ocr_extractions ENABLE ROW LEVEL SECURITY;

--
-- Name: outbox; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: parts_categories; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.parts_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_allocations; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.payment_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: plate_recognitions; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.plate_recognitions ENABLE ROW LEVEL SECURITY;

--
-- Name: portal_sessions; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.portal_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: presets; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.presets ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_order_lines; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.purchase_order_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_contracts; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.rental_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_damages; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.rental_damages ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_reservations; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.rental_reservations ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_vehicles; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.rental_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: service_vehicles; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.service_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: signup_tokens; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.signup_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_count_lines; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.stock_count_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_counts; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.stock_counts ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_levels; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.stock_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_items; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.supplier_items ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_mutations; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.sync_mutations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_interactions tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.ai_interactions USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: ai_suggestions tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.ai_suggestions USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: api_keys tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.api_keys USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: appointment_requests tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.appointment_requests USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: appointments tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.appointments USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: asset_links tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.asset_links USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: assets tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.assets USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: attendance_breaks tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.attendance_breaks USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: attendance_days tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.attendance_days USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: audit_log tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.audit_log USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: bank_import_entries tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.bank_import_entries USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: bank_imports tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.bank_imports USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: change_feed tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.change_feed USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: customers tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.customers USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: document_counters tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.document_counters USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: einvoice_documents tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.einvoice_documents USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: estimates tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.estimates USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: field_service_events tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.field_service_events USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: fleets tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.fleets USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: goods_receipt_lines tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.goods_receipt_lines USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: goods_receipts tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.goods_receipts USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: insight_snapshots tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.insight_snapshots USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: integration_credentials tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.integration_credentials USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: inventory_items tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.inventory_items USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: invoice_lines tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.invoice_lines USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: invoice_vat_breakdown tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.invoice_vat_breakdown USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: invoice_work_orders tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.invoice_work_orders USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: invoices tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.invoices USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: labour_standards tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.labour_standards USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: leave_requests tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.leave_requests USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: locations tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.locations USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: member_permission_overrides tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.member_permission_overrides USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: memberships tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.memberships USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: notifications tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.notifications USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: ocr_extractions tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.ocr_extractions USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: outbox tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.outbox USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: parts_categories tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.parts_categories USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: payment_allocations tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.payment_allocations USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: payments tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.payments USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: plate_recognitions tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.plate_recognitions USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: portal_sessions tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.portal_sessions USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: presets tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.presets USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: purchase_order_lines tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.purchase_order_lines USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: purchase_orders tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.purchase_orders USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: rental_contracts tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.rental_contracts USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: rental_damages tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.rental_damages USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: rental_reservations tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.rental_reservations USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: rental_vehicles tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.rental_vehicles USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: service_vehicles tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.service_vehicles USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: stock_count_lines tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.stock_count_lines USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: stock_counts tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.stock_counts USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: stock_levels tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.stock_levels USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: stock_movements tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.stock_movements USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: supplier_items tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.supplier_items USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: suppliers tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.suppliers USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: sync_mutations tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.sync_mutations USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: time_entries tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.time_entries USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: travel_orders tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.travel_orders USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: voice_drafts tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.voice_drafts USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: work_order_approvals tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.work_order_approvals USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: work_order_lines tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.work_order_lines USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: work_orders tenant_isolation; Type: POLICY; Schema: app; Owner: workshop
--

CREATE POLICY tenant_isolation ON app.work_orders USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: time_entries; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.time_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_orders; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.travel_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: user_credentials; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.user_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_drafts; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.voice_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: work_order_approvals; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.work_order_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: work_order_lines; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.work_order_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: work_orders; Type: ROW SECURITY; Schema: app; Owner: workshop
--

ALTER TABLE app.work_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA app; Type: ACL; Schema: -; Owner: workshop
--

GRANT USAGE ON SCHEMA app TO workshop_app;


--
-- Name: FUNCTION current_tenant_id(); Type: ACL; Schema: app; Owner: workshop
--

GRANT ALL ON FUNCTION app.current_tenant_id() TO workshop_app;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: app; Owner: workshop
--

GRANT ALL ON FUNCTION app.touch_updated_at() TO workshop_app;


--
-- Name: TABLE ai_interactions; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.ai_interactions TO workshop_app;


--
-- Name: TABLE ai_suggestions; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.ai_suggestions TO workshop_app;


--
-- Name: TABLE api_keys; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE app.api_keys TO workshop_app;


--
-- Name: TABLE appointment_requests; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.appointment_requests TO workshop_app;


--
-- Name: TABLE appointments; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE app.appointments TO workshop_app;


--
-- Name: TABLE asset_links; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.asset_links TO workshop_app;


--
-- Name: TABLE assets; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.assets TO workshop_app;


--
-- Name: TABLE attachments; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.attachments TO workshop_app;


--
-- Name: TABLE attendance_breaks; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.attendance_breaks TO workshop_app;


--
-- Name: TABLE attendance_days; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.attendance_days TO workshop_app;


--
-- Name: TABLE audit_log; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.audit_log TO workshop_app;


--
-- Name: TABLE bank_import_entries; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.bank_import_entries TO workshop_app;


--
-- Name: TABLE bank_imports; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.bank_imports TO workshop_app;


--
-- Name: TABLE change_feed; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.change_feed TO workshop_app;


--
-- Name: SEQUENCE change_feed_cursor_seq; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,USAGE ON SEQUENCE app.change_feed_cursor_seq TO workshop_app;


--
-- Name: TABLE customers; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.customers TO workshop_app;


--
-- Name: TABLE document_counters; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.document_counters TO workshop_app;


--
-- Name: TABLE einvoice_documents; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.einvoice_documents TO workshop_app;


--
-- Name: TABLE estimates; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.estimates TO workshop_app;


--
-- Name: TABLE field_service_events; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.field_service_events TO workshop_app;


--
-- Name: TABLE fleets; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.fleets TO workshop_app;


--
-- Name: TABLE goods_receipt_lines; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.goods_receipt_lines TO workshop_app;


--
-- Name: TABLE goods_receipts; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.goods_receipts TO workshop_app;


--
-- Name: TABLE insight_snapshots; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.insight_snapshots TO workshop_app;


--
-- Name: TABLE integration_credentials; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.integration_credentials TO workshop_app;


--
-- Name: TABLE inventory_items; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.inventory_items TO workshop_app;


--
-- Name: TABLE invoice_lines; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.invoice_lines TO workshop_app;


--
-- Name: TABLE invoice_vat_breakdown; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.invoice_vat_breakdown TO workshop_app;


--
-- Name: TABLE invoice_work_orders; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,DELETE ON TABLE app.invoice_work_orders TO workshop_app;


--
-- Name: TABLE invoices; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.invoices TO workshop_app;


--
-- Name: TABLE labour_standards; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.labour_standards TO workshop_app;


--
-- Name: TABLE leave_requests; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.leave_requests TO workshop_app;


--
-- Name: TABLE locations; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.locations TO workshop_app;


--
-- Name: TABLE login_events; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT ON TABLE app.login_events TO workshop_app;


--
-- Name: TABLE member_permission_overrides; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE app.member_permission_overrides TO workshop_app;


--
-- Name: TABLE memberships; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.memberships TO workshop_app;


--
-- Name: TABLE notifications; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.notifications TO workshop_app;


--
-- Name: TABLE ocr_extractions; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.ocr_extractions TO workshop_app;


--
-- Name: TABLE outbox; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.outbox TO workshop_app;


--
-- Name: TABLE parts_categories; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.parts_categories TO workshop_app;


--
-- Name: TABLE payment_allocations; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.payment_allocations TO workshop_app;


--
-- Name: TABLE payments; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.payments TO workshop_app;


--
-- Name: TABLE plate_recognitions; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.plate_recognitions TO workshop_app;


--
-- Name: TABLE portal_sessions; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.portal_sessions TO workshop_app;


--
-- Name: TABLE presets; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE app.presets TO workshop_app;


--
-- Name: TABLE purchase_order_lines; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.purchase_order_lines TO workshop_app;


--
-- Name: TABLE purchase_orders; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.purchase_orders TO workshop_app;


--
-- Name: TABLE rental_contracts; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.rental_contracts TO workshop_app;


--
-- Name: TABLE rental_damages; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.rental_damages TO workshop_app;


--
-- Name: TABLE rental_reservations; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.rental_reservations TO workshop_app;


--
-- Name: TABLE rental_vehicles; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.rental_vehicles TO workshop_app;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.schema_migrations TO workshop_app;


--
-- Name: TABLE service_vehicles; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.service_vehicles TO workshop_app;


--
-- Name: TABLE stock_count_lines; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.stock_count_lines TO workshop_app;


--
-- Name: TABLE stock_counts; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.stock_counts TO workshop_app;


--
-- Name: TABLE stock_levels; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.stock_levels TO workshop_app;


--
-- Name: TABLE stock_movements; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.stock_movements TO workshop_app;


--
-- Name: TABLE supplier_items; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.supplier_items TO workshop_app;


--
-- Name: TABLE suppliers; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.suppliers TO workshop_app;


--
-- Name: TABLE sync_mutations; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.sync_mutations TO workshop_app;


--
-- Name: TABLE tenants; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.tenants TO workshop_app;


--
-- Name: TABLE time_entries; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.time_entries TO workshop_app;


--
-- Name: TABLE travel_orders; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.travel_orders TO workshop_app;


--
-- Name: TABLE user_sessions; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.user_sessions TO workshop_app;


--
-- Name: TABLE users; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.users TO workshop_app;


--
-- Name: TABLE voice_drafts; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.voice_drafts TO workshop_app;


--
-- Name: TABLE work_order_approvals; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.work_order_approvals TO workshop_app;


--
-- Name: TABLE work_order_lines; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.work_order_lines TO workshop_app;


--
-- Name: TABLE work_orders; Type: ACL; Schema: app; Owner: workshop
--

GRANT SELECT,INSERT,UPDATE ON TABLE app.work_orders TO workshop_app;


--
-- PostgreSQL database dump complete
--

\unrestrict OVTw4eQXuK7C4fGju1ZgW7wdChtjFfW3FTdIsu7MIODWPhDBlfzFCwvujr9EGAQ

