-- CreateIndex
CREATE UNIQUE INDEX "auth_user_roles_name_key" ON "auth_user_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_sources_name_key" ON "crm_lead_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_deal_statuses_name_key" ON "crm_deal_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_message_directions_name_key" ON "crm_message_directions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "org_onboarding_statuses_name_key" ON "org_onboarding_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_sale_statuses_name_key" ON "crm_sale_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_onboarding_statuses_name_key" ON "whatsapp_onboarding_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connection_statuses_name_key" ON "whatsapp_connection_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_health_statuses_name_key" ON "whatsapp_health_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_audit_actions_name_key" ON "whatsapp_audit_actions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_email_key" ON "auth_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_phone_key" ON "auth_user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_token_key" ON "auth_session"("token");

-- CreateIndex
CREATE INDEX "auth_session_userId_idx" ON "auth_session"("userId");

-- CreateIndex
CREATE INDEX "auth_account_userId_idx" ON "auth_account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_account_providerId_accountId_key" ON "auth_account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_deal_tracking_dealId_key" ON "crm_deal_tracking"("dealId");

-- CreateIndex
CREATE INDEX "crm_deal_tracking_utmSource_idx" ON "crm_deal_tracking"("utmSource");

-- CreateIndex
CREATE INDEX "crm_deal_tracking_sourceType_idx" ON "crm_deal_tracking"("sourceType");

-- CreateIndex
CREATE INDEX "crm_deal_tracking_ctwaclid_idx" ON "crm_deal_tracking"("ctwaclid");

-- CreateIndex
CREATE INDEX "crm_deal_tracking_metaAdId_idx" ON "crm_deal_tracking"("metaAdId");

-- CreateIndex
CREATE UNIQUE INDEX "org_organizations_slug_key" ON "org_organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "org_organizations_asaasCustomerId_key" ON "org_organizations"("asaasCustomerId");

-- CreateIndex
CREATE INDEX "crm_projects_organizationId_idx" ON "crm_projects"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_projects_organizationId_slug_key" ON "crm_projects"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "org_profiles_organizationId_key" ON "org_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_profiles_cpf_key" ON "org_profiles"("cpf");

-- CreateIndex
CREATE INDEX "org_members_organizationId_role_idx" ON "org_members"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "org_members_organizationId_userId_key" ON "org_members"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "org_roles_organizationId_idx" ON "org_roles"("organizationId");

-- CreateIndex
CREATE INDEX "org_roles_isSystem_idx" ON "org_roles"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_organizationId_key_key" ON "org_roles"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_organizationId_name_key" ON "org_roles"("organizationId", "name");

-- CreateIndex
CREATE INDEX "org_role_permissions_organizationRoleId_idx" ON "org_role_permissions"("organizationRoleId");

-- CreateIndex
CREATE INDEX "org_role_permissions_permissionKey_idx" ON "org_role_permissions"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "org_role_permissions_organizationRoleId_permissionKey_key" ON "org_role_permissions"("organizationRoleId", "permissionKey");

-- CreateIndex
CREATE INDEX "org_member_permission_overrides_memberId_idx" ON "org_member_permission_overrides"("memberId");

-- CreateIndex
CREATE INDEX "org_member_permission_overrides_permissionKey_idx" ON "org_member_permission_overrides"("permissionKey");

-- CreateIndex
CREATE INDEX "org_member_permission_overrides_effect_idx" ON "org_member_permission_overrides"("effect");

-- CreateIndex
CREATE UNIQUE INDEX "org_member_permission_overrides_memberId_permissionKey_key" ON "org_member_permission_overrides"("memberId", "permissionKey");

-- CreateIndex
CREATE INDEX "crm_leads_organizationId_idx" ON "crm_leads"("organizationId");

-- CreateIndex
CREATE INDEX "crm_leads_organizationId_phone_idx" ON "crm_leads"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "crm_leads_projectId_idx" ON "crm_leads"("projectId");

-- CreateIndex
CREATE INDEX "crm_leads_organizationId_projectId_idx" ON "crm_leads"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_leads_sourceId_idx" ON "crm_leads"("sourceId");

-- CreateIndex
CREATE INDEX "crm_leads_isActive_idx" ON "crm_leads"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "crm_leads_organizationId_remote_jid_key" ON "crm_leads"("organizationId", "remote_jid");

-- CreateIndex
CREATE INDEX "crm_conversations_organizationId_idx" ON "crm_conversations"("organizationId");

-- CreateIndex
CREATE INDEX "crm_conversations_projectId_idx" ON "crm_conversations"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_conversations_leadId_instanceId_key" ON "crm_conversations"("leadId", "instanceId");

-- CreateIndex
CREATE INDEX "crm_deals_organizationId_idx" ON "crm_deals"("organizationId");

-- CreateIndex
CREATE INDEX "crm_deals_projectId_idx" ON "crm_deals"("projectId");

-- CreateIndex
CREATE INDEX "crm_deals_organizationId_projectId_idx" ON "crm_deals"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_deals_conversationId_idx" ON "crm_deals"("conversationId");

-- CreateIndex
CREATE INDEX "crm_deals_statusId_idx" ON "crm_deals"("statusId");

-- CreateIndex
CREATE INDEX "crm_deals_leadId_idx" ON "crm_deals"("leadId");

-- CreateIndex
CREATE INDEX "crm_deals_stageId_idx" ON "crm_deals"("stageId");

-- CreateIndex
CREATE INDEX "crm_deal_stages_organizationId_projectId_order_idx" ON "crm_deal_stages"("organizationId", "projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "crm_deal_stages_organizationId_projectId_name_key" ON "crm_deal_stages"("organizationId", "projectId", "name");

-- CreateIndex
CREATE INDEX "crm_sales_organizationId_idx" ON "crm_sales"("organizationId");

-- CreateIndex
CREATE INDEX "crm_sales_projectId_idx" ON "crm_sales"("projectId");

-- CreateIndex
CREATE INDEX "crm_sales_organizationId_projectId_idx" ON "crm_sales"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_sales_createdAt_idx" ON "crm_sales"("createdAt");

-- CreateIndex
CREATE INDEX "crm_sales_dealId_idx" ON "crm_sales"("dealId");

-- CreateIndex
CREATE INDEX "crm_sale_items_organizationId_idx" ON "crm_sale_items"("organizationId");

-- CreateIndex
CREATE INDEX "crm_sale_items_saleId_idx" ON "crm_sale_items"("saleId");

-- CreateIndex
CREATE INDEX "crm_sale_items_itemId_idx" ON "crm_sale_items"("itemId");

-- CreateIndex
CREATE INDEX "crm_items_organizationId_idx" ON "crm_items"("organizationId");

-- CreateIndex
CREATE INDEX "crm_items_projectId_idx" ON "crm_items"("projectId");

-- CreateIndex
CREATE INDEX "crm_items_organizationId_projectId_idx" ON "crm_items"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_items_active_idx" ON "crm_items"("active");

-- CreateIndex
CREATE UNIQUE INDEX "crm_items_organizationId_name_key" ON "crm_items"("organizationId", "name");

-- CreateIndex
CREATE INDEX "crm_item_categories_organizationId_idx" ON "crm_item_categories"("organizationId");

-- CreateIndex
CREATE INDEX "crm_item_categories_projectId_idx" ON "crm_item_categories"("projectId");

-- CreateIndex
CREATE INDEX "crm_item_categories_organizationId_projectId_idx" ON "crm_item_categories"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_item_categories_active_idx" ON "crm_item_categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "crm_item_categories_organizationId_name_key" ON "crm_item_categories"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "org_companies_organizationId_key" ON "org_companies"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_companies_cnpj_key" ON "org_companies"("cnpj");

-- CreateIndex
CREATE INDEX "org_companies_cnaeCode_idx" ON "org_companies"("cnaeCode");

-- CreateIndex
CREATE INDEX "org_companies_porte_idx" ON "org_companies"("porte");

-- CreateIndex
CREATE INDEX "org_companies_uf_idx" ON "org_companies"("uf");

-- CreateIndex
CREATE INDEX "org_companies_situacao_idx" ON "org_companies"("situacao");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_configs_phoneId_key" ON "whatsapp_configs"("phoneId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_connectionId_idx" ON "whatsapp_configs"("connectionId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_projectId_idx" ON "whatsapp_configs"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_organizationId_projectId_idx" ON "whatsapp_configs"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_processed_idx" ON "whatsapp_configs"("processed");

-- CreateIndex
CREATE INDEX "whatsapp_configs_historySyncStatus_idx" ON "whatsapp_configs"("historySyncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_onboarding_trackingCode_key" ON "whatsapp_onboarding"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_projectId_idx" ON "whatsapp_onboarding"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_organizationId_projectId_idx" ON "whatsapp_onboarding"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_organizationId_idx" ON "whatsapp_onboarding"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_trackingCode_idx" ON "whatsapp_onboarding"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_status_idx" ON "whatsapp_onboarding"("status");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_expiresAt_idx" ON "whatsapp_onboarding"("expiresAt");

-- CreateIndex
CREATE INDEX "whatsapp_connections_projectId_idx" ON "whatsapp_connections"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_connections_organizationId_projectId_idx" ON "whatsapp_connections"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections"("status");

-- CreateIndex
CREATE INDEX "whatsapp_connections_phoneNumberId_idx" ON "whatsapp_connections"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_organizationId_wabaId_key" ON "whatsapp_connections"("organizationId", "wabaId");

-- CreateIndex
CREATE INDEX "whatsapp_health_organizationId_idx" ON "whatsapp_health"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_health_connectionId_idx" ON "whatsapp_health"("connectionId");

-- CreateIndex
CREATE INDEX "whatsapp_health_status_idx" ON "whatsapp_health"("status");

-- CreateIndex
CREATE INDEX "whatsapp_health_lastCheck_idx" ON "whatsapp_health"("lastCheck");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_organizationId_idx" ON "whatsapp_webhook_logs"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_processed_idx" ON "whatsapp_webhook_logs"("processed");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_createdAt_idx" ON "whatsapp_webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_processed_createdAt_idx" ON "whatsapp_webhook_logs"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_organizationId_idx" ON "whatsapp_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_action_idx" ON "whatsapp_audit_logs"("action");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_createdAt_idx" ON "whatsapp_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_organizationId_createdAt_idx" ON "whatsapp_audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_trackingCode_idx" ON "whatsapp_audit_logs"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_connectionId_idx" ON "whatsapp_audit_logs"("connectionId");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_organizationId_idx" ON "whatsapp_campaigns"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_projectId_idx" ON "whatsapp_campaigns"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_organizationId_projectId_idx" ON "whatsapp_campaigns"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_status_idx" ON "whatsapp_campaigns"("status");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_scheduledAt_idx" ON "whatsapp_campaigns"("scheduledAt");

-- CreateIndex
CREATE INDEX "crm_lead_tags_organizationId_idx" ON "crm_lead_tags"("organizationId");

-- CreateIndex
CREATE INDEX "crm_lead_tags_projectId_idx" ON "crm_lead_tags"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_tags_organizationId_projectId_name_key" ON "crm_lead_tags"("organizationId", "projectId", "name");

-- CreateIndex
CREATE INDEX "crm_lead_tag_assignments_leadId_idx" ON "crm_lead_tag_assignments"("leadId");

-- CreateIndex
CREATE INDEX "crm_lead_tag_assignments_tagId_idx" ON "crm_lead_tag_assignments"("tagId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_lists_organizationId_idx" ON "whatsapp_contact_lists"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_lists_projectId_idx" ON "whatsapp_contact_lists"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_list_members_listId_idx" ON "whatsapp_contact_list_members"("listId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_list_members_normalizedPhone_idx" ON "whatsapp_contact_list_members"("normalizedPhone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contact_list_members_listId_normalizedPhone_key" ON "whatsapp_contact_list_members"("listId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_audience_segments_organizationId_idx" ON "whatsapp_audience_segments"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_audience_segments_projectId_idx" ON "whatsapp_audience_segments"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_events_campaignId_idx" ON "whatsapp_campaign_events"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_events_type_idx" ON "whatsapp_campaign_events"("type");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_variants_dispatchGroupId_key" ON "whatsapp_campaign_variants"("dispatchGroupId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_variants_campaignId_idx" ON "whatsapp_campaign_variants"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_dispatch_groups_campaignId_idx" ON "whatsapp_campaign_dispatch_groups"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_dispatch_groups_configId_idx" ON "whatsapp_campaign_dispatch_groups"("configId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_dispatch_groups_status_idx" ON "whatsapp_campaign_dispatch_groups"("status");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_campaignId_idx" ON "whatsapp_campaign_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_dispatchGroupId_idx" ON "whatsapp_campaign_recipients"("dispatchGroupId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_leadId_idx" ON "whatsapp_campaign_recipients"("leadId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_phone_idx" ON "whatsapp_campaign_recipients"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_normalizedPhone_idx" ON "whatsapp_campaign_recipients"("normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_status_idx" ON "whatsapp_campaign_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_recipients_campaignId_normalizedPhone_key" ON "whatsapp_campaign_recipients"("campaignId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_opt_outs_organizationId_idx" ON "whatsapp_opt_outs"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_opt_outs_organizationId_createdAt_idx" ON "whatsapp_opt_outs"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_opt_outs_organizationId_phone_key" ON "whatsapp_opt_outs"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_wamid_key" ON "whatsapp_messages"("wamid");

-- CreateIndex
CREATE INDEX "whatsapp_messages_leadId_idx" ON "whatsapp_messages"("leadId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_instanceId_idx" ON "whatsapp_messages"("instanceId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_app_conversation_id_idx" ON "whatsapp_messages"("app_conversation_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_dealId_idx" ON "whatsapp_messages"("dealId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_directionId_idx" ON "whatsapp_messages"("directionId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_source_idx" ON "whatsapp_messages"("source");

-- CreateIndex
CREATE INDEX "whatsapp_messages_timestamp_idx" ON "whatsapp_messages"("timestamp");

-- CreateIndex
CREATE INDEX "whatsapp_messages_meta_conversation_id_idx" ON "whatsapp_messages"("meta_conversation_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_campaignRecipientId_idx" ON "whatsapp_messages"("campaignRecipientId");

-- CreateIndex
CREATE INDEX "meta_connections_organizationId_projectId_idx" ON "meta_connections"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_connections_projectId_fbUserId_key" ON "meta_connections"("projectId", "fbUserId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_connections_organizationId_fbUserId_key" ON "meta_connections"("organizationId", "fbUserId");

-- CreateIndex
CREATE INDEX "meta_ad_accounts_projectId_idx" ON "meta_ad_accounts"("projectId");

-- CreateIndex
CREATE INDEX "meta_ad_accounts_organizationId_projectId_idx" ON "meta_ad_accounts"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ad_accounts_projectId_adAccountId_key" ON "meta_ad_accounts"("projectId", "adAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ad_accounts_organizationId_adAccountId_key" ON "meta_ad_accounts"("organizationId", "adAccountId");

-- CreateIndex
CREATE INDEX "meta_pixels_projectId_idx" ON "meta_pixels"("projectId");

-- CreateIndex
CREATE INDEX "meta_pixels_organizationId_projectId_idx" ON "meta_pixels"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_pixels_projectId_pixelId_key" ON "meta_pixels"("projectId", "pixelId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_pixels_organizationId_pixelId_key" ON "meta_pixels"("organizationId", "pixelId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_event_types_name_key" ON "meta_event_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_deal_stage_meta_rules_stageId_pixelId_eventName_key" ON "crm_deal_stage_meta_rules"("stageId", "pixelId", "eventName");

-- CreateIndex
CREATE UNIQUE INDEX "meta_conversion_events_eventId_key" ON "meta_conversion_events"("eventId");

-- CreateIndex
CREATE INDEX "meta_conversion_events_projectId_idx" ON "meta_conversion_events"("projectId");

-- CreateIndex
CREATE INDEX "meta_conversion_events_organizationId_projectId_idx" ON "meta_conversion_events"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "meta_conversion_events_organizationId_idx" ON "meta_conversion_events"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_conversion_events_dealId_pixelId_eventName_key" ON "meta_conversion_events"("dealId", "pixelId", "eventName");

-- CreateIndex
CREATE INDEX "meta_attribution_history_dealId_idx" ON "meta_attribution_history"("dealId");

-- CreateIndex
CREATE INDEX "analytics_meta_insight_sync_runs_organizationId_projectId_idx" ON "analytics_meta_insight_sync_runs"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "analytics_meta_insight_sync_runs_status_idx" ON "analytics_meta_insight_sync_runs"("status");

-- CreateIndex
CREATE INDEX "analytics_meta_insight_sync_runs_completedAt_idx" ON "analytics_meta_insight_sync_runs"("completedAt" DESC);

-- CreateIndex
CREATE INDEX "analytics_meta_ad_insights_daily_organizationId_projectId_d_idx" ON "analytics_meta_ad_insights_daily"("organizationId", "projectId", "date");

-- CreateIndex
CREATE INDEX "analytics_meta_ad_insights_daily_date_idx" ON "analytics_meta_ad_insights_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_meta_ad_insights_daily_organizationId_projectId_d_key" ON "analytics_meta_ad_insights_daily"("organizationId", "projectId", "date", "entityKey");

-- CreateIndex
CREATE INDEX "analytics_currency_exchange_rates_daily_organizationId_date_idx" ON "analytics_currency_exchange_rates_daily"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_currency_exchange_rates_daily_organizationId_date_key" ON "analytics_currency_exchange_rates_daily"("organizationId", "date", "baseCurrency", "quoteCurrency");

-- CreateIndex
CREATE INDEX "analytics_dashboard_metric_refresh_runs_organizationId_proj_idx" ON "analytics_dashboard_metric_refresh_runs"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "analytics_dashboard_metric_refresh_runs_status_idx" ON "analytics_dashboard_metric_refresh_runs"("status");

-- CreateIndex
CREATE INDEX "analytics_dashboard_metric_refresh_runs_completedAt_idx" ON "analytics_dashboard_metric_refresh_runs"("completedAt" DESC);

-- CreateIndex
CREATE INDEX "analytics_dashboard_daily_metrics_organizationId_projectId__idx" ON "analytics_dashboard_daily_metrics"("organizationId", "projectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_dashboard_daily_metrics_organizationId_projectId__key" ON "analytics_dashboard_daily_metrics"("organizationId", "projectId", "date");

-- CreateIndex
CREATE INDEX "analytics_dashboard_origin_daily_metrics_organizationId_pro_idx" ON "analytics_dashboard_origin_daily_metrics"("organizationId", "projectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_dashboard_origin_daily_metrics_organizationId_pro_key" ON "analytics_dashboard_origin_daily_metrics"("organizationId", "projectId", "date", "originKey");

-- CreateIndex
CREATE INDEX "analytics_dashboard_meta_entity_daily_metrics_organizationI_idx" ON "analytics_dashboard_meta_entity_daily_metrics"("organizationId", "projectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_dashboard_meta_entity_daily_metrics_organizationI_key" ON "analytics_dashboard_meta_entity_daily_metrics"("organizationId", "projectId", "date", "entityKey");

-- CreateIndex
CREATE INDEX "org_audit_logs_organizationId_idx" ON "org_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "org_audit_logs_userId_idx" ON "org_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "org_audit_logs_createdAt_idx" ON "org_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "org_audit_logs_requestId_idx" ON "org_audit_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscription_statuses_name_key" ON "billing_subscription_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "billing_failure_reasons_name_key" ON "billing_failure_reasons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_statuses_name_key" ON "billing_invoice_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_methods_name_key" ON "billing_payment_methods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycles_name_key" ON "billing_cycles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "billing_audit_actors_name_key" ON "billing_audit_actors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_organizationId_key" ON "billing_subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_asaasId_key" ON "billing_subscriptions"("asaasId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_pixAutomaticAuthId_key" ON "billing_subscriptions"("pixAutomaticAuthId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_organizationId_idx" ON "billing_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_offerId_idx" ON "billing_subscriptions"("offerId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_currentPlanId_idx" ON "billing_subscriptions"("currentPlanId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_asaasId_idx" ON "billing_subscriptions"("asaasId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_status_idx" ON "billing_subscriptions"("status");

-- CreateIndex
CREATE INDEX "billing_subscriptions_isActive_idx" ON "billing_subscriptions"("isActive");

-- CreateIndex
CREATE INDEX "billing_subscriptions_expiresAt_idx" ON "billing_subscriptions"("expiresAt");

-- CreateIndex
CREATE INDEX "billing_subscriptions_trialEndsAt_idx" ON "billing_subscriptions"("trialEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_code_key" ON "billing_plans"("code");

-- CreateIndex
CREATE INDEX "billing_plans_isActive_idx" ON "billing_plans"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "billing_offers_code_key" ON "billing_offers"("code");

-- CreateIndex
CREATE INDEX "billing_offers_planId_idx" ON "billing_offers"("planId");

-- CreateIndex
CREATE INDEX "billing_offers_planId_paymentMethod_isActive_idx" ON "billing_offers"("planId", "paymentMethod", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_asaasId_key" ON "billing_invoices"("asaasId");

-- CreateIndex
CREATE INDEX "billing_invoices_organizationId_idx" ON "billing_invoices"("organizationId");

-- CreateIndex
CREATE INDEX "billing_invoices_subscriptionId_idx" ON "billing_invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "billing_invoices_offerId_idx" ON "billing_invoices"("offerId");

-- CreateIndex
CREATE INDEX "billing_invoices_asaasId_idx" ON "billing_invoices"("asaasId");

-- CreateIndex
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices"("status");

-- CreateIndex
CREATE INDEX "billing_plan_history_subscriptionId_idx" ON "billing_plan_history"("subscriptionId");

-- CreateIndex
CREATE INDEX "billing_plan_history_planId_idx" ON "billing_plan_history"("planId");

-- CreateIndex
CREATE INDEX "billing_plan_history_subscriptionId_startedAt_idx" ON "billing_plan_history"("subscriptionId", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "billing_audit_logs_asaasEventId_key" ON "billing_audit_logs"("asaasEventId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_organizationId_idx" ON "billing_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_userId_idx" ON "billing_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_action_idx" ON "billing_audit_logs"("action");

-- CreateIndex
CREATE INDEX "billing_audit_logs_entity_entityId_idx" ON "billing_audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_asaasEventId_idx" ON "billing_audit_logs"("asaasEventId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_logs_wamid_key" ON "whatsapp_template_logs"("wamid");

-- CreateIndex
CREATE INDEX "whatsapp_template_logs_organizationId_templateName_idx" ON "whatsapp_template_logs"("organizationId", "templateName");

-- CreateIndex
CREATE INDEX "whatsapp_template_logs_organizationId_sentAt_idx" ON "whatsapp_template_logs"("organizationId", "sentAt");

