// ---------------------------------------------------------------------------
// GENERATED FILE — do not edit by hand.
// Regenerate with:  node scripts/generate-types.mjs
// (or `npm run db:types` against a linked Supabase project)
// ---------------------------------------------------------------------------

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string;
          project_id: string | null;
          client_id: string | null;
          actor_id: string | null;
          actor_name: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          summary: string;
          metadata: Json;
          visibility: Database['public']['Enums']['activity_visibility'];
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          client_id?: string | null;
          actor_id?: string | null;
          actor_name?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          summary: string;
          metadata?: Json;
          visibility?: Database['public']['Enums']['activity_visibility'];
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          client_id?: string | null;
          actor_id?: string | null;
          actor_name?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          summary?: string;
          metadata?: Json;
          visibility?: Database['public']['Enums']['activity_visibility'];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_logs_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_logs_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      agency_settings: {
        Row: {
          id: boolean;
          agency_name: string;
          tagline: string;
          support_email: string | null;
          support_phone: string | null;
          brand_primary: string;
          logo_url: string | null;
          currency: string;
          allow_client_plan_selection: boolean;
          allow_client_colleague_invites: boolean;
          default_reminder_offsets: number[];
          legal_advice_disclaimer: string;
          credential_sharing_guidance: string;
          created_at: string;
          updated_at: string;
          staff_email_domains: string[];
          staff_signup_mode: string;
          staff_default_role: Database['public']['Enums']['app_role'];
        };
        Insert: {
          id?: boolean;
          agency_name?: string;
          tagline?: string;
          support_email?: string | null;
          support_phone?: string | null;
          brand_primary?: string;
          logo_url?: string | null;
          currency?: string;
          allow_client_plan_selection?: boolean;
          allow_client_colleague_invites?: boolean;
          default_reminder_offsets?: number[];
          legal_advice_disclaimer?: string;
          credential_sharing_guidance?: string;
          created_at?: string;
          updated_at?: string;
          staff_email_domains?: string[];
          staff_signup_mode?: string;
          staff_default_role?: Database['public']['Enums']['app_role'];
        };
        Update: {
          id?: boolean;
          agency_name?: string;
          tagline?: string;
          support_email?: string | null;
          support_phone?: string | null;
          brand_primary?: string;
          logo_url?: string | null;
          currency?: string;
          allow_client_plan_selection?: boolean;
          allow_client_colleague_invites?: boolean;
          default_reminder_offsets?: number[];
          legal_advice_disclaimer?: string;
          credential_sharing_guidance?: string;
          created_at?: string;
          updated_at?: string;
          staff_email_domains?: string[];
          staff_signup_mode?: string;
          staff_default_role?: Database['public']['Enums']['app_role'];
        };
        Relationships: [
        ];
      };
      approvals: {
        Row: {
          id: string;
          project_id: string | null;
          client_id: string | null;
          entity_type: string;
          entity_id: string;
          decision: Database['public']['Enums']['approval_decision'];
          reason: string | null;
          previous_status: string | null;
          new_status: string | null;
          decided_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          client_id?: string | null;
          entity_type: string;
          entity_id: string;
          decision: Database['public']['Enums']['approval_decision'];
          reason?: string | null;
          previous_status?: string | null;
          new_status?: string | null;
          decided_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          client_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          decision?: Database['public']['Enums']['approval_decision'];
          reason?: string | null;
          previous_status?: string | null;
          new_status?: string | null;
          decided_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'approvals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approvals_decided_by_fkey';
            columns: ['decided_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approvals_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          previous_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          previous_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          previous_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      change_request_approvals: {
        Row: {
          id: string;
          change_request_id: string;
          quoted_hours: number | null;
          quoted_cost: number | null;
          quote_notes: string | null;
          proposed_completion_date: string | null;
          billing_treatment: Database['public']['Enums']['billing_treatment'];
          offered_by: string | null;
          offered_at: string;
          decision: Database['public']['Enums']['quote_decision'];
          decided_by: string | null;
          decided_at: string | null;
          decision_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          change_request_id: string;
          quoted_hours?: number | null;
          quoted_cost?: number | null;
          quote_notes?: string | null;
          proposed_completion_date?: string | null;
          billing_treatment?: Database['public']['Enums']['billing_treatment'];
          offered_by?: string | null;
          offered_at?: string;
          decision?: Database['public']['Enums']['quote_decision'];
          decided_by?: string | null;
          decided_at?: string | null;
          decision_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          change_request_id?: string;
          quoted_hours?: number | null;
          quoted_cost?: number | null;
          quote_notes?: string | null;
          proposed_completion_date?: string | null;
          billing_treatment?: Database['public']['Enums']['billing_treatment'];
          offered_by?: string | null;
          offered_at?: string;
          decision?: Database['public']['Enums']['quote_decision'];
          decided_by?: string | null;
          decided_at?: string | null;
          decision_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'change_request_approvals_change_request_id_fkey';
            columns: ['change_request_id'];
            isOneToOne: false;
            referencedRelation: 'change_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_request_approvals_decided_by_fkey';
            columns: ['decided_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_request_approvals_offered_by_fkey';
            columns: ['offered_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      change_requests: {
        Row: {
          id: string;
          reference: string;
          client_id: string;
          project_id: string;
          subscription_id: string | null;
          title: string;
          category: Database['public']['Enums']['change_request_category'];
          description: string;
          affected_url: string | null;
          desired_outcome: string | null;
          priority: Database['public']['Enums']['task_priority'];
          status: Database['public']['Enums']['change_request_status'];
          billing_treatment: Database['public']['Enums']['billing_treatment'] | null;
          estimated_hours: number | null;
          estimated_cost: number | null;
          estimated_completion_date: string | null;
          assigned_to: string | null;
          submitted_by: string | null;
          submitted_at: string;
          internal_notes: string | null;
          client_notes: string | null;
          logged_minutes: number;
          completed_at: string | null;
          rejected_reason: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          reference?: string;
          client_id: string;
          project_id: string;
          subscription_id?: string | null;
          title: string;
          category?: Database['public']['Enums']['change_request_category'];
          description: string;
          affected_url?: string | null;
          desired_outcome?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['change_request_status'];
          billing_treatment?: Database['public']['Enums']['billing_treatment'] | null;
          estimated_hours?: number | null;
          estimated_cost?: number | null;
          estimated_completion_date?: string | null;
          assigned_to?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          internal_notes?: string | null;
          client_notes?: string | null;
          logged_minutes?: number;
          completed_at?: string | null;
          rejected_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          reference?: string;
          client_id?: string;
          project_id?: string;
          subscription_id?: string | null;
          title?: string;
          category?: Database['public']['Enums']['change_request_category'];
          description?: string;
          affected_url?: string | null;
          desired_outcome?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['change_request_status'];
          billing_treatment?: Database['public']['Enums']['billing_treatment'] | null;
          estimated_hours?: number | null;
          estimated_cost?: number | null;
          estimated_completion_date?: string | null;
          assigned_to?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          internal_notes?: string | null;
          client_notes?: string | null;
          logged_minutes?: number;
          completed_at?: string | null;
          rejected_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'change_requests_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_requests_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_requests_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_requests_submitted_by_fkey';
            columns: ['submitted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_requests_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      client_acceptances: {
        Row: {
          id: string;
          project_id: string;
          handover_id: string | null;
          approved_by: string | null;
          approved_by_name: string;
          accepted_at: string;
          project_version: string | null;
          statement: string;
          website_reviewed: boolean;
          requested_changes_completed: boolean;
          approved_for_launch: boolean;
          handover_materials_received: boolean;
          training_received: boolean;
          training_not_applicable: boolean;
          maintenance_understood: boolean;
          signature_name: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          handover_id?: string | null;
          approved_by?: string | null;
          approved_by_name: string;
          accepted_at?: string;
          project_version?: string | null;
          statement: string;
          website_reviewed?: boolean;
          requested_changes_completed?: boolean;
          approved_for_launch?: boolean;
          handover_materials_received?: boolean;
          training_received?: boolean;
          training_not_applicable?: boolean;
          maintenance_understood?: boolean;
          signature_name: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          handover_id?: string | null;
          approved_by?: string | null;
          approved_by_name?: string;
          accepted_at?: string;
          project_version?: string | null;
          statement?: string;
          website_reviewed?: boolean;
          requested_changes_completed?: boolean;
          approved_for_launch?: boolean;
          handover_materials_received?: boolean;
          training_received?: boolean;
          training_not_applicable?: boolean;
          maintenance_understood?: boolean;
          signature_name?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_acceptances_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_acceptances_handover_id_fkey';
            columns: ['handover_id'];
            isOneToOne: false;
            referencedRelation: 'handovers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_acceptances_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          organisation_id: string;
          company_name: string;
          trading_name: string | null;
          registration_number: string | null;
          primary_contact_name: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          region: string | null;
          postcode: string | null;
          country: string | null;
          industry: string | null;
          description: string | null;
          is_existing_client: boolean;
          account_manager_id: string | null;
          internal_notes: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          company_name: string;
          trading_name?: string | null;
          registration_number?: string | null;
          primary_contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          region?: string | null;
          postcode?: string | null;
          country?: string | null;
          industry?: string | null;
          description?: string | null;
          is_existing_client?: boolean;
          account_manager_id?: string | null;
          internal_notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          company_name?: string;
          trading_name?: string | null;
          registration_number?: string | null;
          primary_contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          region?: string | null;
          postcode?: string | null;
          country?: string | null;
          industry?: string | null;
          description?: string | null;
          is_existing_client?: boolean;
          account_manager_id?: string | null;
          internal_notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_account_manager_id_fkey';
            columns: ['account_manager_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'clients_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'clients_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: true;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          entity_type: Database['public']['Enums']['comment_entity'];
          entity_id: string;
          project_id: string | null;
          client_id: string | null;
          parent_id: string | null;
          author_id: string | null;
          body: string;
          is_internal: boolean;
          edited_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          entity_type: Database['public']['Enums']['comment_entity'];
          entity_id: string;
          project_id?: string | null;
          client_id?: string | null;
          parent_id?: string | null;
          author_id?: string | null;
          body: string;
          is_internal?: boolean;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          entity_type?: Database['public']['Enums']['comment_entity'];
          entity_id?: string;
          project_id?: string | null;
          client_id?: string | null;
          parent_id?: string | null;
          author_id?: string | null;
          body?: string;
          is_internal?: boolean;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      files: {
        Row: {
          id: string;
          project_id: string | null;
          client_id: string;
          website_page_id: string | null;
          onboarding_section_id: string | null;
          change_request_id: string | null;
          support_request_id: string | null;
          bucket: string;
          storage_path: string;
          file_name: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          checksum: string | null;
          category: Database['public']['Enums']['file_category'];
          description: string | null;
          approval_status: Database['public']['Enums']['file_approval_status'];
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          is_client_visible: boolean;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          client_id: string;
          website_page_id?: string | null;
          onboarding_section_id?: string | null;
          change_request_id?: string | null;
          support_request_id?: string | null;
          bucket?: string;
          storage_path: string;
          file_name: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          checksum?: string | null;
          category?: Database['public']['Enums']['file_category'];
          description?: string | null;
          approval_status?: Database['public']['Enums']['file_approval_status'];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          is_client_visible?: boolean;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          client_id?: string;
          website_page_id?: string | null;
          onboarding_section_id?: string | null;
          change_request_id?: string | null;
          support_request_id?: string | null;
          bucket?: string;
          storage_path?: string;
          file_name?: string;
          original_name?: string;
          mime_type?: string;
          size_bytes?: number;
          checksum?: string | null;
          category?: Database['public']['Enums']['file_category'];
          description?: string | null;
          approval_status?: Database['public']['Enums']['file_approval_status'];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          is_client_visible?: boolean;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'files_change_request_id_fkey';
            columns: ['change_request_id'];
            isOneToOne: false;
            referencedRelation: 'change_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'files_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'files_onboarding_section_id_fkey';
            columns: ['onboarding_section_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_sections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'files_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'files_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'files_support_request_id_fkey';
            columns: ['support_request_id'];
            isOneToOne: false;
            referencedRelation: 'support_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'files_website_page_id_fkey';
            columns: ['website_page_id'];
            isOneToOne: false;
            referencedRelation: 'website_pages';
            referencedColumns: ['id'];
          },
        ];
      };
      handover_checklists: {
        Row: {
          id: string;
          handover_id: string;
          project_id: string;
          name: string;
          description: string | null;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          handover_id: string;
          project_id: string;
          name?: string;
          description?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          handover_id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'handover_checklists_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_checklists_handover_id_fkey';
            columns: ['handover_id'];
            isOneToOne: false;
            referencedRelation: 'handovers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_checklists_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      handover_documents: {
        Row: {
          id: string;
          handover_id: string;
          project_id: string;
          file_id: string | null;
          title: string;
          doc_type: string;
          description: string | null;
          external_url: string | null;
          visible_to_client: boolean;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          handover_id: string;
          project_id: string;
          file_id?: string | null;
          title: string;
          doc_type?: string;
          description?: string | null;
          external_url?: string | null;
          visible_to_client?: boolean;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          handover_id?: string;
          project_id?: string;
          file_id?: string | null;
          title?: string;
          doc_type?: string;
          description?: string | null;
          external_url?: string | null;
          visible_to_client?: boolean;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'handover_documents_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_documents_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'files';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_documents_handover_id_fkey';
            columns: ['handover_id'];
            isOneToOne: false;
            referencedRelation: 'handovers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_documents_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      handover_items: {
        Row: {
          id: string;
          checklist_id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: Database['public']['Enums']['handover_item_status'];
          position: number;
          notes: string | null;
          completed_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: Database['public']['Enums']['handover_item_status'];
          position?: number;
          notes?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          checklist_id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          status?: Database['public']['Enums']['handover_item_status'];
          position?: number;
          notes?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'handover_items_checklist_id_fkey';
            columns: ['checklist_id'];
            isOneToOne: false;
            referencedRelation: 'handover_checklists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_items_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_items_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      handover_template_items: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          position: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          position?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          position?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      handovers: {
        Row: {
          id: string;
          project_id: string;
          status: Database['public']['Enums']['handover_status'];
          website_url: string | null;
          admin_url: string | null;
          cms_platform: string | null;
          hosting_provider: string | null;
          hosting_notes: string | null;
          domain_registrar: string | null;
          domain_expiry: string | null;
          dns_provider: string | null;
          ssl_provider: string | null;
          ssl_expiry: string | null;
          analytics_notes: string | null;
          search_console_notes: string | null;
          backup_notes: string | null;
          security_notes: string | null;
          third_party_services: Json;
          licence_notes: string | null;
          documentation_notes: string | null;
          training_notes: string | null;
          maintenance_notes: string | null;
          prepared_by: string | null;
          delivered_at: string | null;
          delivered_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          status?: Database['public']['Enums']['handover_status'];
          website_url?: string | null;
          admin_url?: string | null;
          cms_platform?: string | null;
          hosting_provider?: string | null;
          hosting_notes?: string | null;
          domain_registrar?: string | null;
          domain_expiry?: string | null;
          dns_provider?: string | null;
          ssl_provider?: string | null;
          ssl_expiry?: string | null;
          analytics_notes?: string | null;
          search_console_notes?: string | null;
          backup_notes?: string | null;
          security_notes?: string | null;
          third_party_services?: Json;
          licence_notes?: string | null;
          documentation_notes?: string | null;
          training_notes?: string | null;
          maintenance_notes?: string | null;
          prepared_by?: string | null;
          delivered_at?: string | null;
          delivered_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          status?: Database['public']['Enums']['handover_status'];
          website_url?: string | null;
          admin_url?: string | null;
          cms_platform?: string | null;
          hosting_provider?: string | null;
          hosting_notes?: string | null;
          domain_registrar?: string | null;
          domain_expiry?: string | null;
          dns_provider?: string | null;
          ssl_provider?: string | null;
          ssl_expiry?: string | null;
          analytics_notes?: string | null;
          search_console_notes?: string | null;
          backup_notes?: string | null;
          security_notes?: string | null;
          third_party_services?: Json;
          licence_notes?: string | null;
          documentation_notes?: string | null;
          training_notes?: string | null;
          maintenance_notes?: string | null;
          prepared_by?: string | null;
          delivered_at?: string | null;
          delivered_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'handovers_delivered_by_fkey';
            columns: ['delivered_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handovers_prepared_by_fkey';
            columns: ['prepared_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handovers_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      integrations: {
        Row: {
          id: string;
          project_id: string;
          provider: string;
          label: string;
          status: Database['public']['Enums']['integration_status'];
          account_reference: string | null;
          notes: string | null;
          configured_by: string | null;
          configured_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          provider: string;
          label: string;
          status?: Database['public']['Enums']['integration_status'];
          account_reference?: string | null;
          notes?: string | null;
          configured_by?: string | null;
          configured_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          provider?: string;
          label?: string;
          status?: Database['public']['Enums']['integration_status'];
          account_reference?: string | null;
          notes?: string | null;
          configured_by?: string | null;
          configured_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'integrations_configured_by_fkey';
            columns: ['configured_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'integrations_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: Database['public']['Enums']['app_role'];
          organisation_id: string | null;
          client_id: string | null;
          token: string;
          invited_by: string | null;
          message: string | null;
          expires_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string;
          role: Database['public']['Enums']['app_role'];
          organisation_id?: string | null;
          client_id?: string | null;
          token?: string;
          invited_by?: string | null;
          message?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: Database['public']['Enums']['app_role'];
          organisation_id?: string | null;
          client_id?: string | null;
          token?: string;
          invited_by?: string | null;
          message?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      lifecycle_stages: {
        Row: {
          id: string;
          key: string;
          label: string;
          description: string | null;
          position: number;
          colour: string;
          is_active: boolean;
          is_terminal: boolean;
          counts_toward_progress: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          description?: string | null;
          position: number;
          colour?: string;
          is_active?: boolean;
          is_terminal?: boolean;
          counts_toward_progress?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          description?: string | null;
          position?: number;
          colour?: string;
          is_active?: boolean;
          is_terminal?: boolean;
          counts_toward_progress?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      maintenance_events: {
        Row: {
          id: string;
          subscription_id: string;
          event_type: Database['public']['Enums']['maintenance_event_type'];
          from_plan_id: string | null;
          to_plan_id: string | null;
          effective_date: string;
          notes: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          event_type: Database['public']['Enums']['maintenance_event_type'];
          from_plan_id?: string | null;
          to_plan_id?: string | null;
          effective_date?: string;
          notes?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          event_type?: Database['public']['Enums']['maintenance_event_type'];
          from_plan_id?: string | null;
          to_plan_id?: string | null;
          effective_date?: string;
          notes?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_events_from_plan_id_fkey';
            columns: ['from_plan_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_events_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_events_to_plan_id_fkey';
            columns: ['to_plan_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_plan_requests: {
        Row: {
          id: string;
          client_id: string;
          subscription_id: string | null;
          requested_type: Database['public']['Enums']['plan_request_type'];
          requested_plan_id: string | null;
          message: string | null;
          status: Database['public']['Enums']['plan_request_status'];
          requested_by: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          response_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          subscription_id?: string | null;
          requested_type: Database['public']['Enums']['plan_request_type'];
          requested_plan_id?: string | null;
          message?: string | null;
          status?: Database['public']['Enums']['plan_request_status'];
          requested_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          response_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          subscription_id?: string | null;
          requested_type?: Database['public']['Enums']['plan_request_type'];
          requested_plan_id?: string | null;
          message?: string | null;
          status?: Database['public']['Enums']['plan_request_status'];
          requested_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          response_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_plan_requests_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_plan_requests_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_plan_requests_requested_plan_id_fkey';
            columns: ['requested_plan_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_plan_requests_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_plan_requests_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_plans: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          monthly_price: number | null;
          annual_price: number | null;
          currency: string;
          included_services: string[];
          included_change_minutes: number;
          included_support_minutes: number;
          response_time_hours: number | null;
          priority_level: number;
          billing_frequency: Database['public']['Enums']['billing_frequency'];
          renewal_period_months: number;
          is_active: boolean;
          is_public: boolean;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          monthly_price?: number | null;
          annual_price?: number | null;
          currency?: string;
          included_services?: string[];
          included_change_minutes?: number;
          included_support_minutes?: number;
          response_time_hours?: number | null;
          priority_level?: number;
          billing_frequency?: Database['public']['Enums']['billing_frequency'];
          renewal_period_months?: number;
          is_active?: boolean;
          is_public?: boolean;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          monthly_price?: number | null;
          annual_price?: number | null;
          currency?: string;
          included_services?: string[];
          included_change_minutes?: number;
          included_support_minutes?: number;
          response_time_hours?: number | null;
          priority_level?: number;
          billing_frequency?: Database['public']['Enums']['billing_frequency'];
          renewal_period_months?: number;
          is_active?: boolean;
          is_public?: boolean;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_plans_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_subscriptions: {
        Row: {
          id: string;
          client_id: string;
          project_id: string | null;
          plan_id: string;
          status: Database['public']['Enums']['subscription_status'];
          website_url: string | null;
          start_date: string;
          renewal_date: string;
          end_date: string | null;
          billing_cycle: Database['public']['Enums']['billing_frequency'];
          price: number;
          currency: string;
          included_change_minutes: number;
          included_support_minutes: number;
          auto_renew: boolean;
          internal_notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id?: string | null;
          plan_id: string;
          status?: Database['public']['Enums']['subscription_status'];
          website_url?: string | null;
          start_date?: string;
          renewal_date: string;
          end_date?: string | null;
          billing_cycle?: Database['public']['Enums']['billing_frequency'];
          price?: number;
          currency?: string;
          included_change_minutes?: number;
          included_support_minutes?: number;
          auto_renew?: boolean;
          internal_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string | null;
          plan_id?: string;
          status?: Database['public']['Enums']['subscription_status'];
          website_url?: string | null;
          start_date?: string;
          renewal_date?: string;
          end_date?: string | null;
          billing_cycle?: Database['public']['Enums']['billing_frequency'];
          price?: number;
          currency?: string;
          included_change_minutes?: number;
          included_support_minutes?: number;
          auto_renew?: boolean;
          internal_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_subscriptions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_subscriptions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_subscriptions_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_usage: {
        Row: {
          id: string;
          subscription_id: string;
          client_id: string;
          period_start: string;
          period_end: string;
          usage_type: Database['public']['Enums']['usage_type'];
          minutes: number;
          description: string;
          change_request_id: string | null;
          support_request_id: string | null;
          is_manual_adjustment: boolean;
          occurred_on: string;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          client_id: string;
          period_start: string;
          period_end: string;
          usage_type: Database['public']['Enums']['usage_type'];
          minutes: number;
          description: string;
          change_request_id?: string | null;
          support_request_id?: string | null;
          is_manual_adjustment?: boolean;
          occurred_on?: string;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          client_id?: string;
          period_start?: string;
          period_end?: string;
          usage_type?: Database['public']['Enums']['usage_type'];
          minutes?: number;
          description?: string;
          change_request_id?: string | null;
          support_request_id?: string | null;
          is_manual_adjustment?: boolean;
          occurred_on?: string;
          recorded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_usage_change_request_id_fkey';
            columns: ['change_request_id'];
            isOneToOne: false;
            referencedRelation: 'change_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_usage_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_usage_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_usage_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_usage_support_request_id_fkey';
            columns: ['support_request_id'];
            isOneToOne: false;
            referencedRelation: 'support_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database['public']['Enums']['notification_type'];
          title: string;
          body: string | null;
          url: string | null;
          entity_type: string | null;
          entity_id: string | null;
          project_id: string | null;
          client_id: string | null;
          actor_id: string | null;
          is_read: boolean;
          read_at: string | null;
          delivered_email_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database['public']['Enums']['notification_type'];
          title: string;
          body?: string | null;
          url?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          project_id?: string | null;
          client_id?: string | null;
          actor_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          delivered_email_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['notification_type'];
          title?: string;
          body?: string | null;
          url?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          project_id?: string | null;
          client_id?: string | null;
          actor_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          delivered_email_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_items: {
        Row: {
          id: string;
          section_id: string;
          project_id: string;
          key: string;
          label: string;
          help_text: string | null;
          is_required: boolean;
          status: Database['public']['Enums']['onboarding_status'];
          value: Json | null;
          file_id: string | null;
          notes: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          project_id: string;
          key: string;
          label: string;
          help_text?: string | null;
          is_required?: boolean;
          status?: Database['public']['Enums']['onboarding_status'];
          value?: Json | null;
          file_id?: string | null;
          notes?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          project_id?: string;
          key?: string;
          label?: string;
          help_text?: string | null;
          is_required?: boolean;
          status?: Database['public']['Enums']['onboarding_status'];
          value?: Json | null;
          file_id?: string | null;
          notes?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_items_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'files';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_items_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_items_section_id_fkey';
            columns: ['section_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_sections';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_sections: {
        Row: {
          id: string;
          project_id: string;
          key: string;
          title: string;
          description: string | null;
          position: number;
          status: Database['public']['Enums']['onboarding_status'];
          responses: Json;
          agency_feedback: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          key: string;
          title: string;
          description?: string | null;
          position?: number;
          status?: Database['public']['Enums']['onboarding_status'];
          responses?: Json;
          agency_feedback?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          key?: string;
          title?: string;
          description?: string | null;
          position?: number;
          status?: Database['public']['Enums']['onboarding_status'];
          responses?: Json;
          agency_feedback?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_sections_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_sections_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_sections_submitted_by_fkey';
            columns: ['submitted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_template_sections: {
        Row: {
          id: string;
          template_id: string;
          key: string;
          title: string;
          description: string | null;
          position: number;
          is_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          key: string;
          title: string;
          description?: string | null;
          position?: number;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          key?: string;
          title?: string;
          description?: string | null;
          position?: number;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_template_sections_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          project_type: Database['public']['Enums']['project_type'] | null;
          is_default: boolean;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          project_type?: Database['public']['Enums']['project_type'] | null;
          is_default?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          project_type?: Database['public']['Enums']['project_type'] | null;
          is_default?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_templates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      organisations: {
        Row: {
          id: string;
          kind: Database['public']['Enums']['organisation_kind'];
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          kind: Database['public']['Enums']['organisation_kind'];
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          kind?: Database['public']['Enums']['organisation_kind'];
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
        ];
      };
      project_deliverables: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          owner_side: Database['public']['Enums']['responsibility'];
          due_date: string | null;
          is_complete: boolean;
          completed_at: string | null;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          owner_side?: Database['public']['Enums']['responsibility'];
          due_date?: string | null;
          is_complete?: boolean;
          completed_at?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          owner_side?: Database['public']['Enums']['responsibility'];
          due_date?: string | null;
          is_complete?: boolean;
          completed_at?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_deliverables_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_deliverables_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          project_role: string;
          can_edit: boolean;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          project_role?: string;
          can_edit?: boolean;
          added_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          project_role?: string;
          can_edit?: boolean;
          added_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_members_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      project_milestones: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          target_date: string | null;
          completed_at: string | null;
          completed_by: string | null;
          position: number;
          depends_on_id: string | null;
          owner_side: Database['public']['Enums']['responsibility'];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          target_date?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          position?: number;
          depends_on_id?: string | null;
          owner_side?: Database['public']['Enums']['responsibility'];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          target_date?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          position?: number;
          depends_on_id?: string | null;
          owner_side?: Database['public']['Enums']['responsibility'];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_milestones_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_milestones_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_milestones_depends_on_id_fkey';
            columns: ['depends_on_id'];
            isOneToOne: false;
            referencedRelation: 'project_milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_milestones_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_plans: {
        Row: {
          id: string;
          project_id: string;
          scope: string | null;
          objectives: string | null;
          client_responsibilities: string | null;
          agency_responsibilities: string | null;
          notes: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          scope?: string | null;
          objectives?: string | null;
          client_responsibilities?: string | null;
          agency_responsibilities?: string | null;
          notes?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          scope?: string | null;
          objectives?: string | null;
          client_responsibilities?: string | null;
          agency_responsibilities?: string | null;
          notes?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_plans_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_plans_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      project_risks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          likelihood: string;
          impact: string;
          mitigation: string | null;
          status: string;
          owner_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          likelihood?: string;
          impact?: string;
          mitigation?: string | null;
          status?: string;
          owner_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          likelihood?: string;
          impact?: string;
          mitigation?: string | null;
          status?: string;
          owner_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_risks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_risks_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_risks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          reference: string;
          name: string;
          project_type: Database['public']['Enums']['project_type'];
          description: string | null;
          stage_id: string | null;
          health: Database['public']['Enums']['project_health'];
          target_start_date: string | null;
          target_launch_date: string | null;
          actual_launch_date: string | null;
          completion_percentage: number;
          internal_notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          reference?: string;
          name: string;
          project_type: Database['public']['Enums']['project_type'];
          description?: string | null;
          stage_id?: string | null;
          health?: Database['public']['Enums']['project_health'];
          target_start_date?: string | null;
          target_launch_date?: string | null;
          actual_launch_date?: string | null;
          completion_percentage?: number;
          internal_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          reference?: string;
          name?: string;
          project_type?: Database['public']['Enums']['project_type'];
          description?: string | null;
          stage_id?: string | null;
          health?: Database['public']['Enums']['project_health'];
          target_start_date?: string | null;
          target_launch_date?: string | null;
          actual_launch_date?: string | null;
          completion_percentage?: number;
          internal_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_stage_id_fkey';
            columns: ['stage_id'];
            isOneToOne: false;
            referencedRelation: 'lifecycle_stages';
            referencedColumns: ['id'];
          },
        ];
      };
      renewal_reminders: {
        Row: {
          id: string;
          client_id: string;
          subscription_id: string | null;
          project_id: string | null;
          reminder_type: Database['public']['Enums']['reminder_type'];
          title: string;
          due_date: string;
          offsets: number[];
          status: Database['public']['Enums']['reminder_status'];
          assigned_to: string | null;
          notes: string | null;
          last_notified_at: string | null;
          last_offset_sent: number | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          subscription_id?: string | null;
          project_id?: string | null;
          reminder_type: Database['public']['Enums']['reminder_type'];
          title: string;
          due_date: string;
          offsets?: number[];
          status?: Database['public']['Enums']['reminder_status'];
          assigned_to?: string | null;
          notes?: string | null;
          last_notified_at?: string | null;
          last_offset_sent?: number | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          subscription_id?: string | null;
          project_id?: string | null;
          reminder_type?: Database['public']['Enums']['reminder_type'];
          title?: string;
          due_date?: string;
          offsets?: number[];
          status?: Database['public']['Enums']['reminder_status'];
          assigned_to?: string | null;
          notes?: string | null;
          last_notified_at?: string | null;
          last_offset_sent?: number | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'renewal_reminders_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'renewal_reminders_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'renewal_reminders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'renewal_reminders_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'renewal_reminders_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      support_requests: {
        Row: {
          id: string;
          reference: string;
          client_id: string;
          project_id: string | null;
          subscription_id: string | null;
          subject: string;
          category: Database['public']['Enums']['support_category'];
          description: string;
          affected_url: string | null;
          urgency: Database['public']['Enums']['urgency'];
          status: Database['public']['Enums']['support_status'];
          assigned_to: string | null;
          submitted_by: string | null;
          submitted_at: string;
          covered_by_plan: boolean | null;
          coverage_note: string | null;
          response_due_at: string | null;
          first_response_at: string | null;
          resolved_at: string | null;
          resolution_summary: string | null;
          time_spent_minutes: number;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          reference?: string;
          client_id: string;
          project_id?: string | null;
          subscription_id?: string | null;
          subject: string;
          category?: Database['public']['Enums']['support_category'];
          description: string;
          affected_url?: string | null;
          urgency?: Database['public']['Enums']['urgency'];
          status?: Database['public']['Enums']['support_status'];
          assigned_to?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          covered_by_plan?: boolean | null;
          coverage_note?: string | null;
          response_due_at?: string | null;
          first_response_at?: string | null;
          resolved_at?: string | null;
          resolution_summary?: string | null;
          time_spent_minutes?: number;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          reference?: string;
          client_id?: string;
          project_id?: string | null;
          subscription_id?: string | null;
          subject?: string;
          category?: Database['public']['Enums']['support_category'];
          description?: string;
          affected_url?: string | null;
          urgency?: Database['public']['Enums']['urgency'];
          status?: Database['public']['Enums']['support_status'];
          assigned_to?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          covered_by_plan?: boolean | null;
          coverage_note?: string | null;
          response_due_at?: string | null;
          first_response_at?: string | null;
          resolved_at?: string | null;
          resolution_summary?: string | null;
          time_spent_minutes?: number;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'support_requests_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_requests_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_requests_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_requests_submitted_by_fkey';
            columns: ['submitted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_requests_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          assignee_id: string | null;
          responsibility: Database['public']['Enums']['responsibility'];
          due_date: string | null;
          priority: Database['public']['Enums']['task_priority'];
          status: Database['public']['Enums']['task_status'];
          onboarding_section_id: string | null;
          milestone_id: string | null;
          work_stream: string | null;
          is_client_visible: boolean;
          position: number;
          completed_at: string | null;
          completed_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          assignee_id?: string | null;
          responsibility?: Database['public']['Enums']['responsibility'];
          due_date?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['task_status'];
          onboarding_section_id?: string | null;
          milestone_id?: string | null;
          work_stream?: string | null;
          is_client_visible?: boolean;
          position?: number;
          completed_at?: string | null;
          completed_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          assignee_id?: string | null;
          responsibility?: Database['public']['Enums']['responsibility'];
          due_date?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['task_status'];
          onboarding_section_id?: string | null;
          milestone_id?: string | null;
          work_stream?: string | null;
          is_client_visible?: boolean;
          position?: number;
          completed_at?: string | null;
          completed_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'project_milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_onboarding_section_id_fkey';
            columns: ['onboarding_section_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_sections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: Database['public']['Enums']['app_role'];
          organisation_id: string | null;
          job_title: string | null;
          phone: string | null;
          is_active: boolean;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['app_role'];
          organisation_id?: string | null;
          job_title?: string | null;
          phone?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['app_role'];
          organisation_id?: string | null;
          job_title?: string | null;
          phone?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      website_pages: {
        Row: {
          id: string;
          project_id: string;
          parent_id: string | null;
          title: string;
          slug: string | null;
          page_kind: Database['public']['Enums']['page_kind'];
          in_navigation: boolean;
          position: number;
          status: Database['public']['Enums']['page_status'];
          purpose: string | null;
          main_heading: string | null;
          body_copy: string | null;
          calls_to_action: Json;
          seo_title: string | null;
          meta_description: string | null;
          notes: string | null;
          agency_feedback: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          approved_at: string | null;
          approved_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_id?: string | null;
          title: string;
          slug?: string | null;
          page_kind?: Database['public']['Enums']['page_kind'];
          in_navigation?: boolean;
          position?: number;
          status?: Database['public']['Enums']['page_status'];
          purpose?: string | null;
          main_heading?: string | null;
          body_copy?: string | null;
          calls_to_action?: Json;
          seo_title?: string | null;
          meta_description?: string | null;
          notes?: string | null;
          agency_feedback?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          parent_id?: string | null;
          title?: string;
          slug?: string | null;
          page_kind?: Database['public']['Enums']['page_kind'];
          in_navigation?: boolean;
          position?: number;
          status?: Database['public']['Enums']['page_status'];
          purpose?: string | null;
          main_heading?: string | null;
          body_copy?: string | null;
          calls_to_action?: Json;
          seo_title?: string | null;
          meta_description?: string | null;
          notes?: string | null;
          agency_feedback?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'website_pages_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'website_pages_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'website_pages_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'website_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'website_pages_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'website_pages_submitted_by_fkey';
            columns: ['submitted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      calculate_project_progress: { Args: { p_project_id: string }; Returns: Json };
      recalculate_project_completion: { Args: { p_project_id: string }; Returns: number };
      subscription_period: {
        Args: { p_subscription_id: string; p_on?: string };
        Returns: { period_start: string; period_end: string }[];
      };
      subscription_usage: {
        Args: { p_subscription_id: string; p_on?: string };
        Returns: {
          period_start: string;
          period_end: string;
          change_minutes: number;
          support_minutes: number;
        }[];
      };
      sweep_maintenance_state: { Args: Record<PropertyKey, never>; Returns: Json };
      record_audit: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_previous_value?: Json;
          p_new_value?: Json;
          p_ip_address?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      activity_visibility: 'internal' | 'client';
      app_role: 'agency_admin' | 'project_manager' | 'account_manager' | 'developer' | 'designer' | 'qa' | 'support_agent' | 'client_owner' | 'client_member';
      approval_decision: 'approved' | 'rejected' | 'changes_requested';
      billing_frequency: 'monthly' | 'quarterly' | 'annual';
      billing_treatment: 'included_in_plan' | 'additional_charge' | 'requires_quotation' | 'out_of_scope';
      change_request_category: 'content_change' | 'image_change' | 'new_page' | 'existing_page_update' | 'design_change' | 'bug' | 'new_feature' | 'integration_change' | 'seo_change' | 'technical_request' | 'other';
      change_request_status: 'submitted' | 'awaiting_review' | 'more_information_required' | 'quotation_required' | 'awaiting_client_approval' | 'approved' | 'scheduled' | 'in_progress' | 'internal_qa' | 'client_review' | 'completed' | 'rejected' | 'cancelled';
      comment_entity: 'project' | 'task' | 'file' | 'website_page' | 'change_request' | 'support_request' | 'onboarding_section' | 'handover_item' | 'milestone';
      file_approval_status: 'pending' | 'approved' | 'rejected' | 'needs_replacement';
      file_category: 'image' | 'logo' | 'video' | 'document' | 'spreadsheet' | 'pdf' | 'brand_asset' | 'contract' | 'other';
      handover_item_status: 'pending' | 'in_progress' | 'complete' | 'not_applicable';
      handover_status: 'draft' | 'ready' | 'delivered' | 'accepted';
      integration_status: 'not_required' | 'requested' | 'pending' | 'configured';
      maintenance_event_type: 'created' | 'activated' | 'renewed' | 'upgraded' | 'downgraded' | 'suspended' | 'reactivated' | 'cancelled' | 'expired' | 'allowance_adjusted';
      notification_type: 'onboarding_submitted' | 'onboarding_needs_changes' | 'change_request_submitted' | 'change_request_updated' | 'change_request_quote_ready' | 'support_request_opened' | 'support_request_updated' | 'comment_added' | 'approval_received' | 'changes_requested' | 'file_uploaded' | 'task_assigned' | 'task_overdue' | 'project_ready_for_handover' | 'handover_accepted' | 'maintenance_renewal_due' | 'maintenance_allowance_low' | 'subscription_expired' | 'plan_request_submitted' | 'invitation_accepted';
      onboarding_status: 'not_started' | 'in_progress' | 'submitted' | 'needs_changes' | 'approved' | 'not_required';
      organisation_kind: 'agency' | 'client';
      page_kind: 'standard' | 'landing' | 'footer' | 'hidden';
      page_status: 'draft' | 'submitted' | 'needs_changes' | 'approved';
      plan_request_status: 'pending' | 'approved' | 'declined' | 'withdrawn';
      plan_request_type: 'upgrade' | 'downgrade' | 'cancellation' | 'renewal_discussion';
      project_health: 'on_track' | 'at_risk' | 'off_track' | 'on_hold';
      project_type: 'new_website' | 'website_redesign' | 'ecommerce' | 'landing_page' | 'website_maintenance' | 'branding' | 'social_media_rebrand' | 'seo' | 'it_consultancy' | 'custom_development';
      quote_decision: 'pending' | 'approved' | 'rejected' | 'clarification_requested';
      reminder_status: 'scheduled' | 'due' | 'acknowledged' | 'completed' | 'dismissed';
      reminder_type: 'subscription_renewal' | 'payment_due' | 'maintenance_review' | 'domain_renewal' | 'hosting_renewal' | 'ssl_expiry' | 'licence_renewal' | 'backup_check' | 'security_review' | 'monthly_report';
      responsibility: 'agency' | 'client';
      subscription_status: 'trial' | 'active' | 'renewal_due' | 'suspended' | 'cancelled' | 'expired';
      support_category: 'website_down' | 'broken_functionality' | 'email_issue' | 'domain_issue' | 'hosting_issue' | 'security_concern' | 'performance_problem' | 'general_support' | 'other';
      support_status: 'open' | 'triaged' | 'awaiting_client' | 'in_progress' | 'resolved' | 'closed';
      task_priority: 'low' | 'medium' | 'high' | 'urgent';
      task_status: 'to_do' | 'in_progress' | 'waiting' | 'complete';
      urgency: 'low' | 'normal' | 'high' | 'critical';
      usage_type: 'change' | 'support';
    };
    CompositeTypes: { [_ in never]: never };
  };
}

// Convenience aliases ---------------------------------------------------------
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
