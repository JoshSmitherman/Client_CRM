-- ===========================================================================
-- Reference data seed
-- ===========================================================================
-- Idempotent. Safe to run repeatedly against a real project.
-- Contains only agency-configurable reference data: settings, lifecycle
-- stages, the default onboarding template, example maintenance tiers and the
-- default handover checklist. Demo clients/projects live in
-- `node scripts/seed-demo.mjs`, which also provisions the demo logins.
-- ===========================================================================

-- --- Agency settings (singleton) --------------------------------------------
insert into public.agency_settings (id, agency_name, tagline, support_email, currency)
values (true, 'Northpoint Digital', 'Web design, development and support', 'hello@northpointdigital.test', 'GBP')
on conflict (id) do nothing;

-- --- The agency organisation -------------------------------------------------
insert into public.organisations (id, kind, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'agency', 'Northpoint Digital', 'northpoint-digital')
on conflict (slug) do nothing;

-- --- Project lifecycle -------------------------------------------------------
-- Editable by an agency administrator; the application never hard-codes these.
insert into public.lifecycle_stages (key, label, description, position, colour, is_terminal, counts_toward_progress)
values
  ('lead_converted',    'Lead Converted',    'Won the work; not yet started.',                 1,  '#64748b', false, true),
  ('onboarding',        'Onboarding',        'Gathering requirements and company details.',    2,  '#6366f1', false, true),
  ('planning',          'Planning',          'Scope, milestones and deliverables agreed.',     3,  '#8b5cf6', false, true),
  ('awaiting_content',  'Awaiting Content',  'Waiting on copy, imagery or assets.',            4,  '#f59e0b', false, true),
  ('design',            'Design',            'Visual design in progress.',                     5,  '#ec4899', false, true),
  ('development',       'Development',       'Build in progress.',                             6,  '#3b82f6', false, true),
  ('internal_qa',       'Internal QA',       'Agency testing before client review.',           7,  '#06b6d4', false, true),
  ('client_review',     'Client Review',     'With the client for feedback.',                  8,  '#14b8a6', false, true),
  ('changes_requested', 'Changes Requested', 'Client feedback being actioned.',                9,  '#f97316', false, true),
  ('final_approval',    'Final Approval',    'Awaiting sign-off to launch.',                  10,  '#22c55e', false, true),
  ('launch_prep',       'Launch Preparation','DNS, hosting and go-live checks.',              11,  '#10b981', false, true),
  ('live',              'Live',              'Website is published.',                         12,  '#16a34a', false, true),
  ('handover',          'Handover',          'Documentation and training being delivered.',   13,  '#0ea5e9', false, true),
  ('maintenance',       'Maintenance',       'Ongoing support and updates.',                  14,  '#0284c7', false, true),
  ('archived',          'Archived',          'Closed; retained for reference.',               15,  '#94a3b8', true,  false)
on conflict (key) do nothing;

-- --- Default onboarding template --------------------------------------------
insert into public.onboarding_templates (id, name, description, is_default, is_active)
values (
  '00000000-0000-4000-8000-000000000010',
  'Standard website onboarding',
  'The twelve-section questionnaire used for new websites and redesigns.',
  true, true
)
on conflict (id) do nothing;

insert into public.onboarding_template_sections (template_id, key, title, description, position, is_required)
values
  ('00000000-0000-4000-8000-000000000010', 'company_information',  'Company Information',   'Who you are, what you do and who you serve.',                 1,  true),
  ('00000000-0000-4000-8000-000000000010', 'project_requirements', 'Project Requirements',  'What the website needs to achieve.',                          2,  true),
  ('00000000-0000-4000-8000-000000000010', 'branding',             'Branding',              'Logos, colours, fonts and visual style.',                     3,  true),
  ('00000000-0000-4000-8000-000000000010', 'website_content',      'Website Content',       'Copy and imagery for each page.',                             4,  true),
  ('00000000-0000-4000-8000-000000000010', 'pages_structure',      'Pages and Structure',   'The sitemap and navigation.',                                 5,  true),
  ('00000000-0000-4000-8000-000000000010', 'images_media',         'Images and Media',      'Photography, video and other media.',                         6,  true),
  ('00000000-0000-4000-8000-000000000010', 'domain_hosting',       'Domain and Hosting',    'Where the site lives and who controls it.',                   7,  true),
  ('00000000-0000-4000-8000-000000000010', 'technical_integrations','Technical Integrations','Analytics, payments, CRM and other services.',               8,  true),
  ('00000000-0000-4000-8000-000000000010', 'social_media',         'Social Media',          'Profiles, tone of voice and content requirements.',           9,  false),
  ('00000000-0000-4000-8000-000000000010', 'seo',                  'SEO',                   'Keywords, locations and existing search performance.',       10,  false),
  ('00000000-0000-4000-8000-000000000010', 'legal_compliance',     'Legal and Compliance',  'Policies, consent and accessibility requirements.',          11,  true),
  ('00000000-0000-4000-8000-000000000010', 'final_review',         'Final Review',          'Confirm everything before we begin.',                        12,  true)
on conflict (template_id, key) do nothing;

-- --- Example maintenance tiers ----------------------------------------------
-- EXAMPLES ONLY. Nothing in the application depends on these names, prices or
-- allowances; an administrator can add, edit, reorder or retire tiers freely.
insert into public.maintenance_plans (
  slug, name, description, monthly_price, annual_price, currency,
  included_services, included_change_minutes, included_support_minutes,
  response_time_hours, priority_level, billing_frequency, renewal_period_months,
  is_active, is_public, position
)
values
  (
    'essential', 'Essential',
    'Keeps the website secure, backed up and monitored.',
    45.00, 486.00, 'GBP',
    array['Website uptime monitoring','Security updates','Plugin and package updates','Routine backups','Basic technical support'],
    0, 60, 48, 3, 'monthly', 12, true, true, 1
  ),
  (
    'professional', 'Professional',
    'Everything in Essential, plus a monthly allowance for website changes.',
    95.00, 1026.00, 'GBP',
    array['Everything in Essential','Monthly website changes','Performance monitoring','Priority support','Monthly health report'],
    120, 120, 24, 2, 'monthly', 12, true, true, 2
  ),
  (
    'premium', 'Premium',
    'A larger change allowance with priority development and SEO checks.',
    185.00, 1998.00, 'GBP',
    array['Everything in Professional','Larger monthly change allowance','Priority development queue','Content updates','Monthly SEO checks','Monthly consultation call','Enhanced monitoring'],
    300, 240, 8, 1, 'monthly', 12, true, true, 3
  )
on conflict (slug) do nothing;

-- --- Default handover checklist ---------------------------------------------
insert into public.handover_template_items (title, description, position)
values
  ('Domain confirmed',            'Ownership and renewal date verified with the client.',       1),
  ('DNS configured',              'Records point to production and are documented.',            2),
  ('SSL active',                  'Certificate issued, valid and auto-renewing.',               3),
  ('Production hosting configured','Plan, resources and access confirmed.',                     4),
  ('Backups configured',          'Schedule, retention and restore process tested.',            5),
  ('Analytics configured',        'Tracking installed and reporting correctly.',                6),
  ('Search Console configured',   'Property verified and sitemap submitted.',                   7),
  ('Contact forms tested',        'Every form submits and routes to the right inbox.',          8),
  ('Email delivery tested',       'Transactional email arrives and passes SPF/DKIM.',           9),
  ('Mobile testing complete',     'Checked across common phone and tablet sizes.',             10),
  ('Browser testing complete',    'Checked in current Chrome, Safari, Firefox and Edge.',      11),
  ('Accessibility review complete','Keyboard, contrast and semantics reviewed.',               12),
  ('Performance review complete', 'Core Web Vitals measured and acceptable.',                  13),
  ('Client approval received',    'Formal acceptance recorded in the portal.',                 14),
  ('Training completed',          'Walkthrough delivered or recorded for the client.',         15),
  ('Maintenance plan confirmed',  'Ongoing arrangement agreed and activated.',                 16)
on conflict do nothing;
