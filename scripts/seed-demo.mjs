#!/usr/bin/env node
/**
 * Creates demo logins and a realistic book of work in your Supabase project.
 *
 *   node scripts/seed-demo.mjs                 # demo agency + clients + projects
 *   node scripts/seed-demo.mjs --reset         # remove demo rows first, then re-seed
 *   node scripts/seed-demo.mjs --admin-only --email you@youragency.com
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * The service role key is used only here and never reaches the browser.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- env -------------------------------------------------------------------
function loadEnvLocal() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '\nMissing configuration.\n\n' +
      '  VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.\n' +
      '  Find both at: Supabase Dashboard > Project Settings > API\n\n' +
      '  See docs/SETUP.md step 4.\n',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const ADMIN_ONLY = args.includes('--admin-only');
const ADMIN_EMAIL =
  args[args.indexOf('--email') + 1] && args.includes('--email')
    ? args[args.indexOf('--email') + 1]
    : 'admin@northpoint.test';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'PortalDemo2026!';

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- helpers ---------------------------------------------------------------
const log = (msg) => console.log(`  ${msg}`);
const step = (msg) => console.log(`\n${msg}`);

function fail(context, error) {
  if (!error) return;
  console.error(`\nFailed while ${context}:\n  ${error.message}\n`);
  process.exit(1);
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgo(days) {
  return daysFromNow(-days);
}

/**
 * Creates (or finds) an auth user and promotes their profile. The
 * handle_new_user trigger creates an inactive profile with no organisation
 * when there is no invitation, which is exactly right for real signups — here
 * we promote it the way accepting an invitation would.
 */
async function ensureUser({ email, fullName, role, organisationId, jobTitle }) {
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  let userId = created?.user?.id;

  if (error) {
    if (!/already been registered|already exists/i.test(error.message)) {
      fail(`creating the user ${email}`, error);
    }
    // Already there — find them.
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (!userId) fail(`finding the existing user ${email}`, new Error('not found'));
  }

  const { error: profileError } = await db.from('users').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role,
      organisation_id: organisationId,
      job_title: jobTitle ?? null,
      is_active: true,
    },
    { onConflict: 'id' },
  );
  fail(`saving the profile for ${email}`, profileError);

  log(`${email.padEnd(34)} ${role}`);
  return userId;
}

async function upsertOrganisation(slug, name, kind = 'client') {
  const { data: existing } = await db
    .from('organisations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await db
    .from('organisations')
    .insert({ kind, name, slug })
    .select('id')
    .single();
  fail(`creating the organisation ${name}`, error);
  return data.id;
}

async function stageId(key) {
  const { data } = await db.from('lifecycle_stages').select('id').eq('key', key).maybeSingle();
  if (!data) {
    console.error(
      `\nLifecycle stage "${key}" is missing. Run supabase/seed.sql first (docs/SETUP.md step 3).\n`,
    );
    process.exit(1);
  }
  return data.id;
}

async function planId(slug) {
  const { data } = await db.from('maintenance_plans').select('*').eq('slug', slug).maybeSingle();
  if (!data) {
    console.error(
      `\nMaintenance plan "${slug}" is missing. Run supabase/seed.sql first (docs/SETUP.md step 3).\n`,
    );
    process.exit(1);
  }
  return data;
}

// --- reset -----------------------------------------------------------------
async function reset() {
  step('Removing existing demo data…');

  const { data: orgs } = await db
    .from('organisations')
    .select('id, slug')
    .in('slug', ['northshore-plumbing', 'harbourside-dental', 'verity-legal', 'kestrel-fitness']);

  for (const org of orgs ?? []) {
    // Cascades take care of clients, projects and everything below them.
    await db.from('organisations').delete().eq('id', org.id);
    log(`removed ${org.slug}`);
  }

  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of list?.users ?? []) {
    if (user.email && /@(northpoint|northshore|harbourside|verity|kestrel)\.test$/.test(user.email)) {
      await db.auth.admin.deleteUser(user.id);
      log(`removed ${user.email}`);
    }
  }
}

// --- main ------------------------------------------------------------------
async function main() {
  console.log('\nSeeding demo data into', SUPABASE_URL);

  // Confirm the schema is actually there before doing anything else.
  const { error: probe } = await db.from('lifecycle_stages').select('id').limit(1);
  if (probe) {
    console.error(
      '\nCould not read lifecycle_stages. Has the schema been pushed?\n' +
        '  npx supabase db push        (docs/SETUP.md step 3)\n\n' +
        `  Underlying error: ${probe.message}\n`,
    );
    process.exit(1);
  }

  if (RESET) await reset();

  const agencyOrgId = await upsertOrganisation(
    'northpoint-digital',
    'Northpoint Digital',
    'agency',
  );

  step('Agency logins');
  const adminId = await ensureUser({
    email: ADMIN_EMAIL,
    fullName: 'Alex Mercer',
    role: 'agency_admin',
    organisationId: agencyOrgId,
    jobTitle: 'Agency director',
  });

  if (ADMIN_ONLY) {
    done([[ADMIN_EMAIL, 'Agency administrator']]);
    return;
  }

  const pmId = await ensureUser({
    email: 'priya@northpoint.test',
    fullName: 'Priya Raman',
    role: 'project_manager',
    organisationId: agencyOrgId,
    jobTitle: 'Project manager',
  });
  const devId = await ensureUser({
    email: 'sam@northpoint.test',
    fullName: 'Sam Okafor',
    role: 'developer',
    organisationId: agencyOrgId,
    jobTitle: 'Senior developer',
  });
  const designerId = await ensureUser({
    email: 'nina@northpoint.test',
    fullName: 'Nina Alvarez',
    role: 'designer',
    organisationId: agencyOrgId,
    jobTitle: 'Designer',
  });

  // --- clients -------------------------------------------------------------
  step('Clients');

  const clientSpecs = [
    {
      slug: 'northshore-plumbing',
      company: 'Northshore Plumbing Ltd',
      trading: 'Northshore Plumbing',
      industry: 'Trades and home services',
      contact: 'Dave Whitcombe',
      email: 'dave@northshore.test',
      phone: '0161 496 0142',
      website: 'https://northshoreplumbing.test',
      city: 'Stockport',
      postcode: 'SK1 3AZ',
      description:
        'Family-run plumbing and heating firm covering Greater Manchester, established 1998. Strong emergency call-out business.',
      existing: true,
      accountManager: pmId,
      userName: 'Dave Whitcombe',
    },
    {
      slug: 'harbourside-dental',
      company: 'Harbourside Dental Care',
      trading: null,
      industry: 'Healthcare',
      contact: 'Dr Amara Osei',
      email: 'amara@harbourside.test',
      phone: '0117 925 8831',
      website: 'https://harboursidedental.test',
      city: 'Bristol',
      postcode: 'BS1 5TR',
      description: 'Private dental practice with three surgeries, focused on cosmetic dentistry.',
      existing: false,
      accountManager: adminId,
      userName: 'Amara Osei',
    },
    {
      slug: 'verity-legal',
      company: 'Verity Legal LLP',
      trading: null,
      industry: 'Legal services',
      contact: 'Tom Brackenbury',
      email: 'tom@verity.test',
      phone: '0113 244 7710',
      website: 'https://veritylegal.test',
      city: 'Leeds',
      postcode: 'LS1 4DY',
      description: 'Commercial law firm specialising in employment and contract disputes.',
      existing: true,
      accountManager: pmId,
      userName: 'Tom Brackenbury',
    },
    {
      slug: 'kestrel-fitness',
      company: 'Kestrel Fitness',
      trading: 'Kestrel Gyms',
      industry: 'Health and fitness',
      contact: 'Ruby Kaur',
      email: 'ruby@kestrel.test',
      phone: '0121 663 0094',
      website: 'https://kestrelfitness.test',
      city: 'Birmingham',
      postcode: 'B3 2TA',
      description: 'Independent gym chain with four sites across the West Midlands.',
      existing: false,
      accountManager: adminId,
      userName: 'Ruby Kaur',
    },
  ];

  const clients = {};

  for (const spec of clientSpecs) {
    const orgId = await upsertOrganisation(spec.slug, spec.company);

    const { data: existingClient } = await db
      .from('clients')
      .select('id')
      .eq('organisation_id', orgId)
      .maybeSingle();

    let clientId = existingClient?.id;

    if (!clientId) {
      const { data, error } = await db
        .from('clients')
        .insert({
          organisation_id: orgId,
          company_name: spec.company,
          trading_name: spec.trading,
          primary_contact_name: spec.contact,
          email: spec.email,
          phone: spec.phone,
          website: spec.website,
          address_line1: '1 High Street',
          city: spec.city,
          postcode: spec.postcode,
          country: 'United Kingdom',
          industry: spec.industry,
          description: spec.description,
          is_existing_client: spec.existing,
          account_manager_id: spec.accountManager,
          created_by: adminId,
        })
        .select('id')
        .single();
      fail(`creating the client ${spec.company}`, error);
      clientId = data.id;
    }

    // Agency-only text lives in its own table, which clients cannot read.
    if (spec.slug === 'northshore-plumbing') {
      await db.from('internal_notes').upsert(
        {
          entity_type: 'client',
          entity_id: clientId,
          client_id: clientId,
          body: 'Long-standing client. Dave prefers a phone call over email for anything urgent.',
        },
        { onConflict: 'entity_type,entity_id' },
      );
    }

    clients[spec.slug] = { id: clientId, orgId, spec };
    log(spec.company);
  }

  step('Client portal logins');
  for (const spec of clientSpecs) {
    await ensureUser({
      email: spec.email,
      fullName: spec.userName,
      role: 'client_owner',
      organisationId: clients[spec.slug].orgId,
      jobTitle: 'Owner',
    });
  }

  // --- projects ------------------------------------------------------------
  step('Projects');

  const projectSpecs = [
    {
      key: 'northshore',
      client: 'northshore-plumbing',
      name: 'Website Redesign',
      type: 'website_redesign',
      stage: 'development',
      completion: 68,
      health: 'on_track',
      start: daysAgo(54),
      launch: daysFromNow(26),
      description:
        'Full redesign of the Northshore Plumbing website with a stronger emergency call-out journey and online booking.',
      members: [pmId, devId, designerId],
    },
    {
      key: 'harbourside',
      client: 'harbourside-dental',
      name: 'New Practice Website',
      type: 'new_website',
      stage: 'awaiting_content',
      completion: 34,
      health: 'at_risk',
      start: daysAgo(21),
      launch: daysFromNow(48),
      description:
        'Brand new website for the practice, including treatment pages, pricing and online enquiry.',
      members: [adminId, designerId],
    },
    {
      key: 'verity',
      client: 'verity-legal',
      name: 'Website Maintenance',
      type: 'website_maintenance',
      stage: 'maintenance',
      completion: 100,
      health: 'on_track',
      start: daysAgo(400),
      launch: daysAgo(330),
      description: 'Ongoing maintenance, security updates and monthly content changes.',
      members: [pmId, devId],
    },
    {
      key: 'kestrel',
      client: 'kestrel-fitness',
      name: 'Membership Landing Page',
      type: 'landing_page',
      stage: 'client_review',
      completion: 82,
      health: 'on_track',
      start: daysAgo(18),
      launch: daysFromNow(9),
      description: 'January membership campaign landing page with sign-up funnel.',
      members: [adminId, designerId],
    },
  ];

  const projects = {};

  for (const spec of projectSpecs) {
    const client = clients[spec.client];

    const { data: existing } = await db
      .from('projects')
      .select('id')
      .eq('client_id', client.id)
      .eq('name', spec.name)
      .maybeSingle();

    let projectId = existing?.id;

    if (!projectId) {
      const { data, error } = await db
        .from('projects')
        .insert({
          client_id: client.id,
          name: spec.name,
          project_type: spec.type,
          description: spec.description,
          stage_id: await stageId(spec.stage),
          health: spec.health,
          target_start_date: spec.start,
          target_launch_date: spec.launch,
          completion_percentage: spec.completion,
          created_by: adminId,
        })
        .select('id')
        .single();
      fail(`creating the project ${spec.name}`, error);
      projectId = data.id;

      await db.from('project_plans').insert({ project_id: projectId, updated_by: pmId });
    }

    for (const userId of spec.members) {
      await db
        .from('project_members')
        .upsert(
          { project_id: projectId, user_id: userId, can_edit: true, added_by: adminId },
          { onConflict: 'project_id,user_id' },
        );
    }

    projects[spec.key] = { id: projectId, clientId: client.id };
    log(`${spec.name} — ${clients[spec.client].spec.company}`);
  }

  await seedProjectDetail({ projects, clients, adminId, pmId, devId, designerId });

  done([
    [ADMIN_EMAIL, 'Agency administrator'],
    ['priya@northpoint.test', 'Project manager'],
    ['sam@northpoint.test', 'Developer'],
    ['nina@northpoint.test', 'Designer'],
    ['dave@northshore.test', 'Client — Northshore Plumbing'],
    ['amara@harbourside.test', 'Client — Harbourside Dental'],
    ['tom@verity.test', 'Client — Verity Legal'],
    ['ruby@kestrel.test', 'Client — Kestrel Fitness'],
  ]);
}


// --- project detail --------------------------------------------------------
/**
 * Fills the projects out with the things an agency actually looks at:
 * milestones, tasks, onboarding progress, files, change requests, support
 * tickets, maintenance subscriptions with real usage, and a handover pack.
 */
async function seedProjectDetail({ projects, clients, adminId, pmId, devId, designerId }) {
  const northshore = projects.northshore;
  const harbourside = projects.harbourside;
  const verity = projects.verity;
  const kestrel = projects.kestrel;

  // --- milestones ----------------------------------------------------------
  step('Milestones');
  await seedMilestones(northshore.id, [
    ['Discovery complete', daysAgo(46), true],
    ['Sitemap approved', daysAgo(38), true],
    ['Content received', daysAgo(24), true],
    ['Design approved', daysAgo(15), true],
    ['Development complete', daysFromNow(8), false],
    ['QA complete', daysFromNow(15), false],
    ['Client acceptance', daysFromNow(21), false],
    ['Launch', daysFromNow(26), false],
    ['Handover', daysFromNow(30), false],
  ]);
  await seedMilestones(harbourside.id, [
    ['Discovery complete', daysAgo(14), true],
    ['Sitemap approved', daysAgo(6), true],
    ['Content received', daysFromNow(7), false],
    ['Design approved', daysFromNow(18), false],
    ['Development complete', daysFromNow(34), false],
    ['Launch', daysFromNow(48), false],
  ]);
  await seedMilestones(kestrel.id, [
    ['Design approved', daysAgo(8), true],
    ['Development complete', daysAgo(2), true],
    ['QA complete', daysAgo(1), true],
    ['Client acceptance', daysFromNow(3), false],
    ['Launch', daysFromNow(9), false],
  ]);

  // --- plans ---------------------------------------------------------------
  await db
    .from('project_plans')
    .update({
      scope:
        'Redesign of all 14 existing pages, a new emergency call-out landing page, and an online booking journey for non-urgent work. Excludes copywriting for the blog archive.',
      objectives:
        '1. Increase emergency call-out enquiries.\n2. Reduce time spent answering routine booking questions by phone.\n3. Present the team as established and trustworthy.',
      client_responsibilities:
        'Supply photography of the team and recent jobs. Approve designs within five working days. Provide access to the existing hosting account via the secure link.',
      agency_responsibilities:
        'Design, build, test and launch the site. Migrate existing content. Configure analytics and Search Console. Provide two hours of training.',
      updated_by: pmId,
    })
    .eq('project_id', northshore.id);

  const { data: northshorePlan } = await db
    .from('project_plans')
    .select('id')
    .eq('project_id', northshore.id)
    .maybeSingle();

  if (northshorePlan) {
    await db.from('internal_notes').upsert(
      {
        entity_type: 'project_plan',
        entity_id: northshorePlan.id,
        project_id: northshore.id,
        body: 'Dave is the only decision maker. Avoid scheduling calls before 9am.',
      },
      { onConflict: 'entity_type,entity_id' },
    );
  }

  await seedDeliverables(northshore.id, [
    ['Responsive redesign of all templates', 'agency', daysFromNow(8)],
    ['Emergency call-out landing page', 'agency', daysFromNow(8)],
    ['Online booking journey', 'agency', daysFromNow(12)],
    ['Team and job photography', 'client', daysAgo(20)],
    ['Analytics and Search Console configuration', 'agency', daysFromNow(20)],
    ['Two hours of CMS training', 'agency', daysFromNow(28)],
  ]);

  await seedRisks(northshore.id, [
    [
      'Photography may arrive late',
      'The client has not yet booked a photographer for the team shots.',
      'high',
      'medium',
      'Agreed a fallback of stock imagery for launch, replaced post-launch at no cost.',
      pmId,
    ],
    [
      'Existing hosting may not support the new stack',
      'Current shared hosting runs an outdated PHP version.',
      'medium',
      'high',
      'Quoted a migration to our managed hosting as part of the maintenance plan.',
      devId,
    ],
  ]);

  // --- tasks ---------------------------------------------------------------
  step('Tasks');
  await seedTasks(northshore.id, [
    ['Build the emergency call-out landing page', 'agency', devId, 'development', 'in_progress', 'high', daysFromNow(4)],
    ['Implement the booking form and validation', 'agency', devId, 'development', 'to_do', 'high', daysFromNow(7)],
    ['Responsive pass on the services templates', 'agency', designerId, 'design', 'complete', 'medium', daysAgo(6)],
    ['Migrate blog archive content', 'agency', devId, 'content', 'complete', 'low', daysAgo(10)],
    ['Cross-browser testing', 'agency', pmId, 'qa', 'to_do', 'medium', daysFromNow(12)],
    ['Accessibility review', 'agency', designerId, 'qa', 'to_do', 'medium', daysFromNow(13)],
    ['Send team and job photography', 'client', null, null, 'waiting', 'high', daysAgo(4)],
    ['Confirm the new phone number for the header', 'client', null, null, 'to_do', 'medium', daysFromNow(2)],
  ]);

  await seedTasks(harbourside.id, [
    ['Write treatment page copy', 'client', null, null, 'in_progress', 'high', daysFromNow(5)],
    ['Supply practice photography', 'client', null, null, 'to_do', 'high', daysFromNow(7)],
    ['Confirm pricing for the fee page', 'client', null, null, 'to_do', 'urgent', daysAgo(2)],
    ['Draft homepage design concepts', 'agency', designerId, 'design', 'in_progress', 'medium', daysFromNow(10)],
  ]);

  await seedTasks(kestrel.id, [
    ['Review the staging landing page', 'client', null, null, 'to_do', 'high', daysFromNow(2)],
    ['Hook up the sign-up form to Mailchimp', 'agency', devId, 'development', 'complete', 'high', daysAgo(3)],
    ['Final QA pass', 'agency', adminId, 'qa', 'complete', 'medium', daysAgo(1)],
  ]);

  // --- onboarding ----------------------------------------------------------
  step('Onboarding');
  await seedOnboarding(northshore.id, {
    company_information: ['approved', {
      company_name: 'Northshore Plumbing Ltd',
      trading_name: 'Northshore Plumbing',
      primary_contact: 'Dave Whitcombe',
      email: 'dave@northshore.test',
      telephone: '0161 496 0142',
      description:
        'Family-run plumbing and heating firm covering Greater Manchester, established 1998.',
      services_offered: 'Emergency plumbing\nBoiler installation and servicing\nBathroom fitting\nLeak detection',
      target_audience: 'Homeowners and small landlords across Greater Manchester.',
      service_area: 'Greater Manchester, within 20 miles of Stockport',
      usps: '24/7 emergency call-out, Gas Safe registered, fixed-price quotes.',
    }],
    project_requirements: ['approved', {
      main_objective: 'Get more emergency call-out enquiries from mobile searches.',
      problems_to_solve:
        'The current site is not mobile friendly and the phone number is hard to find.',
      desired_actions: 'Call us, or book a non-urgent appointment online.',
      required_features: 'Click-to-call header, online booking, service area map, reviews.',
      contact_forms: 'yes',
      booking: 'yes',
      ecommerce: 'no',
      websites_liked: 'pimlicoplumbers.test — clear pricing and very easy to contact.',
    }],
    branding: ['approved', {
      has_logo: 'yes',
      colour_primary: '#0B4F8C',
      colour_secondary: '#F2A413',
      brand_fonts: 'Source Sans Pro',
      preferred_style: 'Clean and practical. Not corporate. Photographs of real staff, not stock.',
    }],
    website_content: ['approved', {
      content_source: 'mixed',
      tone_of_voice: 'Straightforward and reassuring. No jargon.',
    }],
    pages_structure: ['approved', { required_pages: 'Home\nServices\nEmergency call-out\nAbout\nReviews\nContact' }],
    images_media: ['needs_changes', { has_photography: 'no', photography_needs: 'Team photos and recent bathroom installs.' }],
    domain_hosting: ['approved', {
      domain_name: 'northshoreplumbing.co.uk',
      registrar: '123-reg',
      hosting_provider: 'Shared hosting with 123-reg',
      existing_platform: 'WordPress',
      email_provider: 'Microsoft 365',
      migration_requirements: 'Move hosting to the agency managed platform at launch.',
    }],
    technical_integrations: ['approved', { google_analytics: 'G-4RJ2KL90XZ', google_search_console: 'Verified' }],
    social_media: ['not_required', {}],
    seo: ['submitted', {
      target_services: 'Emergency plumber\nBoiler repair\nBathroom fitting',
      target_locations: 'Stockport, Manchester, Altrincham, Sale',
      keywords: 'emergency plumber stockport, boiler repair manchester',
      google_business_profile: 'yes',
    }],
    legal_compliance: ['approved', {
      privacy_policy: 'yes',
      cookie_policy: 'yes',
      gdpr_consent: 'yes',
      accessibility_statement: 'unsure',
    }],
    final_review: ['approved', { confirm_accurate: true, decision_makers: 'Dave Whitcombe signs everything off.' }],
  });

  await seedOnboarding(harbourside.id, {
    company_information: ['approved', {
      company_name: 'Harbourside Dental Care',
      primary_contact: 'Dr Amara Osei',
      email: 'amara@harbourside.test',
      description: 'Private dental practice with three surgeries.',
    }],
    project_requirements: ['submitted', {
      main_objective: 'Attract private cosmetic dentistry patients in central Bristol.',
      desired_actions: 'Book a consultation.',
    }],
    branding: ['in_progress', { has_logo: 'yes', colour_primary: '#0E7C7B' }],
    website_content: ['needs_changes', { content_source: 'client' }],
    pages_structure: ['in_progress', {}],
    images_media: ['not_started', {}],
    domain_hosting: ['not_started', {}],
    technical_integrations: ['not_started', {}],
    social_media: ['not_started', {}],
    seo: ['not_started', {}],
    legal_compliance: ['not_started', {}],
    final_review: ['not_started', {}],
  });

  // --- maintenance ---------------------------------------------------------
  step('Maintenance');
  const professional = await planId('professional');
  const essential = await planId('essential');

  const northshoreSub = await seedSubscription({
    clientId: northshore.clientId,
    projectId: northshore.id,
    plan: professional,
    status: 'active',
    startDate: daysAgo(96),
    renewalDate: daysFromNow(269),
    websiteUrl: 'https://northshoreplumbing.test',
    createdBy: adminId,
  });

  const veritySub = await seedSubscription({
    clientId: verity.clientId,
    projectId: verity.id,
    plan: essential,
    status: 'renewal_due',
    startDate: daysAgo(340),
    renewalDate: daysFromNow(18),
    websiteUrl: 'https://veritylegal.test',
    createdBy: adminId,
  });

  await seedUsage(northshoreSub, northshore.clientId, adminId, [
    ['change', 45, 'Updated opening hours across the site', daysAgo(22)],
    ['change', 35, 'Swapped the homepage hero image', daysAgo(11)],
    ['support', 20, 'Investigated a contact form delivery issue', daysAgo(6)],
  ]);

  await seedReminders(verity.clientId, veritySub, verity.id, adminId);

  // --- change requests -----------------------------------------------------
  step('Change requests');
  const { data: dave } = await db.from('users').select('id').eq('email', 'dave@northshore.test').maybeSingle();
  const { data: tom } = await db.from('users').select('id').eq('email', 'tom@verity.test').maybeSingle();

  await seedChangeRequest({
    clientId: northshore.clientId,
    projectId: northshore.id,
    subscriptionId: northshoreSub,
    submittedBy: dave?.id ?? adminId,
    assignedTo: devId,
    title: 'Update emergency plumbing landing page',
    category: 'existing_page_update',
    description:
      'The emergency page still lists the old 24-hour number and the response time text is out of date. We now guarantee a 60-minute response within Stockport.',
    desiredOutcome:
      'New number shown prominently, response time updated to 60 minutes, and a note that we cover bank holidays.',
    affectedUrl: 'https://northshoreplumbing.test/emergency',
    priority: 'high',
    status: 'in_progress',
    billing: 'included_in_plan',
    submittedAt: daysAgo(5),
    loggedMinutes: 40,
    clientNotes: 'We are on this — should be live by the end of the week.',
    internalNotes: 'Covered by the Professional allowance. Sam is picking it up.',
  });

  await seedChangeRequest({
    clientId: verity.clientId,
    projectId: verity.id,
    subscriptionId: veritySub,
    submittedBy: tom?.id ?? adminId,
    assignedTo: null,
    title: 'Add a case studies section',
    category: 'new_feature',
    description:
      'We would like a case studies area with filtering by practice area, plus a template we can add to ourselves.',
    desiredOutcome: 'A listing page, a detail template, and the ability to add new entries in the CMS.',
    priority: 'medium',
    status: 'quotation_required',
    billing: 'requires_quotation',
    submittedAt: daysAgo(3),
    loggedMinutes: 0,
    internalNotes: 'Well beyond the Essential allowance. Estimate around a day and a half.',
  });

  // --- support -------------------------------------------------------------
  step('Support tickets');
  await seedSupport({
    clientId: northshore.clientId,
    projectId: northshore.id,
    subscriptionId: northshoreSub,
    submittedBy: dave?.id ?? adminId,
    subject: 'Contact form emails not arriving',
    category: 'broken_functionality',
    description:
      'Two customers said they filled in the contact form yesterday and we never received anything.',
    urgency: 'high',
    status: 'resolved',
    covered: true,
    assignedTo: devId,
    minutes: 20,
    submittedAt: daysAgo(6),
    resolution:
      'SPF record was missing the new mail relay. Added and confirmed delivery with a test submission.',
  });

  await seedSupport({
    clientId: verity.clientId,
    projectId: verity.id,
    subscriptionId: veritySub,
    submittedBy: tom?.id ?? adminId,
    subject: 'SSL certificate warning in Chrome',
    category: 'security_concern',
    description: 'Staff are seeing a "not secure" warning this morning on the members area.',
    urgency: 'critical',
    status: 'in_progress',
    covered: true,
    assignedTo: devId,
    minutes: 15,
    submittedAt: daysAgo(1),
  });

  // --- handover ------------------------------------------------------------
  step('Handover');
  await seedHandover(kestrel.id, adminId);

  // --- comments and activity ----------------------------------------------
  step('Comments');
  await seedComments(northshore.id, northshore.clientId, [
    [pmId, 'Designs are signed off — Sam, the build can start on the emergency page whenever you are ready.', false],
    [dave?.id ?? adminId, 'Looks great. One thing: can we make the phone number bigger on mobile?', false],
    [devId, 'Bumped it to 22px on small screens and made the whole bar tappable.', false],
    [pmId, 'Photography is still outstanding. If it has not landed by Friday we go with the stock fallback.', true],
  ]);
}

async function seedMilestones(projectId, rows) {
  const { count } = await db
    .from('project_milestones')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (count && count > 0) return;

  await db.from('project_milestones').insert(
    rows.map(([title, targetDate, complete], index) => ({
      project_id: projectId,
      title,
      target_date: targetDate,
      completed_at: complete ? new Date(`${targetDate}T12:00:00Z`).toISOString() : null,
      position: index + 1,
    })),
  );
}

async function seedDeliverables(projectId, rows) {
  const { count } = await db
    .from('project_deliverables')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (count && count > 0) return;

  await db.from('project_deliverables').insert(
    rows.map(([title, ownerSide, dueDate], index) => ({
      project_id: projectId,
      title,
      owner_side: ownerSide,
      due_date: dueDate,
      position: index + 1,
    })),
  );
}

async function seedRisks(projectId, rows) {
  const { count } = await db
    .from('project_risks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (count && count > 0) return;

  await db.from('project_risks').insert(
    rows.map(([title, description, likelihood, impact, mitigation, ownerId]) => ({
      project_id: projectId,
      title,
      description,
      likelihood,
      impact,
      mitigation,
      owner_id: ownerId,
    })),
  );
}

async function seedTasks(projectId, rows) {
  const { count } = await db
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (count && count > 0) return;

  await db.from('tasks').insert(
    rows.map(([title, responsibility, assigneeId, workStream, status, priority, dueDate], index) => ({
      project_id: projectId,
      title,
      responsibility,
      assignee_id: assigneeId,
      work_stream: workStream,
      status,
      priority,
      due_date: dueDate,
      is_client_visible: true,
      position: index + 1,
      completed_at: status === 'complete' ? new Date().toISOString() : null,
    })),
  );
}

async function seedOnboarding(projectId, sections) {
  const keys = Object.keys(sections);
  const { count } = await db
    .from('onboarding_sections')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const titles = {
    company_information: 'Company Information',
    project_requirements: 'Project Requirements',
    branding: 'Branding',
    website_content: 'Website Content',
    pages_structure: 'Pages and Structure',
    images_media: 'Images and Media',
    domain_hosting: 'Domain and Hosting',
    technical_integrations: 'Technical Integrations',
    social_media: 'Social Media',
    seo: 'SEO',
    legal_compliance: 'Legal and Compliance',
    final_review: 'Final Review',
  };

  if (!count) {
    await db.from('onboarding_sections').insert(
      keys.map((key, index) => ({
        project_id: projectId,
        key,
        title: titles[key] ?? key,
        position: index + 1,
        status: sections[key][0],
        responses: sections[key][1],
        agency_feedback:
          sections[key][0] === 'needs_changes'
            ? 'Thanks for this — we still need a little more before we can sign it off.'
            : null,
        submitted_at: ['submitted', 'approved', 'needs_changes'].includes(sections[key][0])
          ? new Date().toISOString()
          : null,
      })),
    );
  } else {
    for (const [index, key] of keys.entries()) {
      await db
        .from('onboarding_sections')
        .update({ status: sections[key][0], responses: sections[key][1], position: index + 1 })
        .eq('project_id', projectId)
        .eq('key', key);
    }
  }
}

async function seedSubscription({ clientId, projectId, plan, status, startDate, renewalDate, websiteUrl, createdBy }) {
  const { data: existing } = await db
    .from('maintenance_subscriptions')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await db
    .from('maintenance_subscriptions')
    .insert({
      client_id: clientId,
      project_id: projectId,
      plan_id: plan.id,
      status,
      start_date: startDate,
      renewal_date: renewalDate,
      website_url: websiteUrl,
      billing_cycle: 'monthly',
      price: plan.monthly_price,
      currency: plan.currency,
      included_change_minutes: plan.included_change_minutes,
      included_support_minutes: plan.included_support_minutes,
      auto_renew: true,
      created_by: createdBy,
    })
    .select('id')
    .single();
  fail('creating a maintenance subscription', error);

  await db.from('maintenance_events').insert({
    subscription_id: data.id,
    event_type: 'created',
    to_plan_id: plan.id,
    effective_date: startDate,
    notes: `Subscription started on the ${plan.name} plan.`,
    actor_id: createdBy,
  });

  return data.id;
}

async function seedUsage(subscriptionId, clientId, recordedBy, rows) {
  const { count } = await db
    .from('maintenance_usage')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId);
  if (count && count > 0) return;

  const { data: period } = await db.rpc('subscription_period', {
    p_subscription_id: subscriptionId,
  });
  const current = Array.isArray(period) ? period[0] : null;

  await db.from('maintenance_usage').insert(
    rows.map(([usageType, minutes, description, occurredOn]) => ({
      subscription_id: subscriptionId,
      client_id: clientId,
      period_start: current?.period_start ?? occurredOn,
      period_end: current?.period_end ?? occurredOn,
      usage_type: usageType,
      minutes,
      description,
      occurred_on: occurredOn,
      recorded_by: recordedBy,
    })),
  );
}

async function seedReminders(clientId, subscriptionId, projectId, createdBy) {
  const { count } = await db
    .from('renewal_reminders')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);
  if (count && count > 0) return;

  await db.from('renewal_reminders').insert([
    {
      client_id: clientId,
      subscription_id: subscriptionId,
      project_id: projectId,
      reminder_type: 'subscription_renewal',
      title: 'Verity Legal — maintenance renewal',
      due_date: daysFromNow(18),
      status: 'due',
      created_by: createdBy,
    },
    {
      client_id: clientId,
      project_id: projectId,
      reminder_type: 'ssl_expiry',
      title: 'Verity Legal — SSL certificate expires',
      due_date: daysFromNow(41),
      status: 'scheduled',
      created_by: createdBy,
    },
    {
      client_id: clientId,
      project_id: projectId,
      reminder_type: 'domain_renewal',
      title: 'veritylegal.co.uk domain renewal',
      due_date: daysFromNow(88),
      status: 'scheduled',
      created_by: createdBy,
    },
  ]);
}

async function seedChangeRequest(spec) {
  const { data: existing } = await db
    .from('change_requests')
    .select('id')
    .eq('project_id', spec.projectId)
    .eq('title', spec.title)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await db
    .from('change_requests')
    .insert({
      client_id: spec.clientId,
      project_id: spec.projectId,
      subscription_id: spec.subscriptionId,
      title: spec.title,
      category: spec.category,
      description: spec.description,
      desired_outcome: spec.desiredOutcome ?? null,
      affected_url: spec.affectedUrl ?? null,
      priority: spec.priority,
      status: spec.status,
      billing_treatment: spec.billing,
      assigned_to: spec.assignedTo,
      submitted_by: spec.submittedBy,
      submitted_at: new Date(`${spec.submittedAt}T09:00:00Z`).toISOString(),
      logged_minutes: spec.loggedMinutes ?? 0,
      client_notes: spec.clientNotes ?? null,
    })
    .select('id, reference')
    .single();
  fail(`creating the change request "${spec.title}"`, error);

  if (spec.internalNotes) {
    await db.from('internal_notes').upsert(
      {
        entity_type: 'change_request',
        entity_id: data.id,
        project_id: spec.projectId,
        client_id: spec.clientId,
        body: spec.internalNotes,
      },
      { onConflict: 'entity_type,entity_id' },
    );
  }

  await db.from('activity_logs').insert([
    {
      project_id: spec.projectId,
      client_id: spec.clientId,
      action: 'change_request.created',
      summary: `Change request ${data.reference} "${spec.title}" was submitted`,
      entity_type: 'change_request',
      entity_id: data.id,
      visibility: 'client',
      actor_name: 'Client',
      created_at: new Date(`${spec.submittedAt}T09:00:00Z`).toISOString(),
    },
    {
      project_id: spec.projectId,
      client_id: spec.clientId,
      action: 'change_request.status_changed',
      summary: `${data.reference} was reviewed by the agency`,
      entity_type: 'change_request',
      entity_id: data.id,
      visibility: 'client',
      actor_name: 'Priya Raman',
    },
  ]);

  log(`${data.reference} — ${spec.title}`);
  return data.id;
}

async function seedSupport(spec) {
  const { data: existing } = await db
    .from('support_requests')
    .select('id')
    .eq('client_id', spec.clientId)
    .eq('subject', spec.subject)
    .maybeSingle();
  if (existing) return existing.id;

  const submittedAt = new Date(`${spec.submittedAt}T08:30:00Z`).toISOString();

  const { data, error } = await db
    .from('support_requests')
    .insert({
      client_id: spec.clientId,
      project_id: spec.projectId,
      subscription_id: spec.subscriptionId,
      subject: spec.subject,
      category: spec.category,
      description: spec.description,
      urgency: spec.urgency,
      status: spec.status,
      assigned_to: spec.assignedTo,
      submitted_by: spec.submittedBy,
      submitted_at: submittedAt,
      covered_by_plan: spec.covered,
      coverage_note: spec.covered ? 'Covered by your maintenance plan.' : null,
      time_spent_minutes: spec.minutes ?? 0,
      first_response_at: submittedAt,
      resolved_at: spec.status === 'resolved' ? new Date().toISOString() : null,
      resolution_summary: spec.resolution ?? null,
    })
    .select('id, reference')
    .single();
  fail(`creating the support ticket "${spec.subject}"`, error);

  log(`${data.reference} — ${spec.subject}`);
  return data.id;
}

async function seedHandover(projectId, preparedBy) {
  const { data: existing } = await db
    .from('handovers')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: handover, error } = await db
    .from('handovers')
    .insert({
      project_id: projectId,
      status: 'draft',
      website_url: 'https://kestrelfitness.test/join',
      admin_url: 'https://kestrelfitness.test/wp-admin',
      cms_platform: 'WordPress 6.x',
      hosting_provider: 'Northpoint managed hosting',
      domain_registrar: 'Cloudflare',
      dns_provider: 'Cloudflare',
      ssl_provider: "Let's Encrypt (auto-renewing)",
      ssl_expiry: daysFromNow(74),
      analytics_notes: 'GA4 property configured, conversion event on form submission.',
      search_console_notes: 'Property verified, sitemap submitted.',
      backup_notes: 'Nightly off-site backups, 30-day retention. Restore tested on 12th.',
      security_notes:
        'WAF enabled, admin login rate limited, two-factor required for all admin accounts. Credentials are shared via the secure link, never stored in this portal.',
      maintenance_notes: 'Recommended plan: Essential, upgradeable if the campaign extends.',
      prepared_by: preparedBy,
    })
    .select('id')
    .single();
  fail('creating the handover record', error);

  const { data: checklist, error: checklistError } = await db
    .from('handover_checklists')
    .insert({
      handover_id: handover.id,
      project_id: projectId,
      name: 'Launch checklist',
      created_by: preparedBy,
    })
    .select('id')
    .single();
  fail('creating the handover checklist', checklistError);

  const { data: templateItems } = await db
    .from('handover_template_items')
    .select('title, description, position')
    .eq('is_active', true)
    .order('position');

  if (templateItems?.length) {
    await db.from('handover_items').insert(
      templateItems.map((item, index) => ({
        checklist_id: checklist.id,
        project_id: projectId,
        title: item.title,
        description: item.description,
        position: item.position,
        // The first eight are done; the rest are still outstanding.
        status: index < 8 ? 'complete' : index === 14 ? 'not_applicable' : 'pending',
        completed_at: index < 8 ? new Date().toISOString() : null,
        completed_by: index < 8 ? preparedBy : null,
      })),
    );
  }

  return handover.id;
}

async function seedComments(projectId, clientId, rows) {
  const { count } = await db
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (count && count > 0) return;

  await db.from('comments').insert(
    rows.map(([authorId, body, isInternal], index) => ({
      entity_type: 'project',
      entity_id: projectId,
      project_id: projectId,
      client_id: clientId,
      author_id: authorId,
      body,
      is_internal: isInternal,
      created_at: new Date(Date.now() - (rows.length - index) * 86_400_000).toISOString(),
    })),
  );
}

function done(logins) {
  console.log('\n─────────────────────────────────────────────────────────');
  console.log(' Demo data ready. Sign in at http://localhost:3000/login');
  console.log('─────────────────────────────────────────────────────────\n');
  for (const [email, role] of logins) {
    console.log(`  ${email.padEnd(34)} ${role}`);
  }
  console.log(`\n  Password for every account: ${DEMO_PASSWORD}\n`);
  console.log('  Change these before exposing the site to anyone.\n');
}

main().catch((error) => {
  console.error('\nUnexpected failure:\n', error);
  process.exit(1);
});
