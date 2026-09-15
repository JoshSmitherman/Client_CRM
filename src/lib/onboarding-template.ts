/**
 * The default onboarding questionnaire.
 *
 * Section definitions live in TypeScript because they drive both the rendered
 * form and the server-side validation; answers are stored in
 * `onboarding_sections.responses` as jsonb. The section list itself is also
 * seeded into `onboarding_templates` so an administrator can reorder, rename or
 * mark sections not required without a deploy.
 *
 * Deliberately absent: any field that would invite a client to type a password.
 * The Domain and Hosting section instead explains how to share credentials
 * securely.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'colour'
  | 'date';

export interface OnboardingField {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
  /** Renders full width in the two-column grid. */
  wide?: boolean;
}

export interface OnboardingSectionDef {
  key: string;
  title: string;
  description: string;
  /** Shown above the fields — used for the credential and legal notices. */
  notice?: { variant: 'info' | 'warning'; title: string; body: string };
  fields: OnboardingField[];
}

const YES_NO_UNSURE = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure yet' },
];

export const ONBOARDING_SECTIONS: OnboardingSectionDef[] = [
  {
    key: 'company_information',
    title: 'Company Information',
    description: 'Who you are, what you do and who you serve.',
    fields: [
      { key: 'company_name', label: 'Company name', type: 'text', required: true },
      { key: 'trading_name', label: 'Trading name', type: 'text', hint: 'If different from the registered name.' },
      { key: 'registration_number', label: 'Company registration number', type: 'text' },
      { key: 'primary_contact', label: 'Primary contact', type: 'text', required: true },
      { key: 'email', label: 'Email address', type: 'email', required: true },
      { key: 'telephone', label: 'Telephone number', type: 'tel' },
      { key: 'address', label: 'Company address', type: 'textarea', wide: true },
      { key: 'description', label: 'Company description', type: 'textarea', wide: true, hint: 'A short paragraph about what you do.' },
      { key: 'services_offered', label: 'Services offered', type: 'textarea', wide: true, hint: 'One per line is fine.' },
      { key: 'target_audience', label: 'Target audience', type: 'textarea', wide: true },
      { key: 'service_area', label: 'Geographic service area', type: 'text', hint: 'e.g. Greater Manchester, UK-wide, worldwide.' },
      { key: 'competitors', label: 'Competitors', type: 'textarea', wide: true, hint: 'Names or website addresses.' },
      { key: 'usps', label: 'Unique selling points', type: 'textarea', wide: true, hint: 'Why do customers choose you?' },
    ],
  },
  {
    key: 'project_requirements',
    title: 'Project Requirements',
    description: 'What the website needs to achieve.',
    fields: [
      { key: 'main_objective', label: 'Main objective', type: 'textarea', wide: true, required: true },
      { key: 'problems_to_solve', label: 'Problems the website should solve', type: 'textarea', wide: true },
      { key: 'target_audience', label: 'Target audience', type: 'textarea', wide: true },
      { key: 'desired_actions', label: 'What should visitors do?', type: 'textarea', wide: true, hint: 'Call, book, buy, enquire, download…' },
      { key: 'required_features', label: 'Required features', type: 'textarea', wide: true },
      { key: 'ecommerce', label: 'Ecommerce required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'booking', label: 'Booking or appointments required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'user_accounts', label: 'Customer accounts required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'contact_forms', label: 'Contact forms required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'payments', label: 'Payment requirements', type: 'textarea', wide: true },
      { key: 'integrations', label: 'Systems to integrate with', type: 'textarea', wide: true },
      { key: 'websites_liked', label: 'Websites you like', type: 'textarea', wide: true, hint: 'Addresses, and what you like about each.' },
      { key: 'websites_disliked', label: 'Websites you dislike', type: 'textarea', wide: true },
      { key: 'additional_requirements', label: 'Anything else', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'branding',
    title: 'Branding',
    description: 'Logos, colours, fonts and visual style. Upload assets in the Files tab.',
    fields: [
      { key: 'has_logo', label: 'Do you have a logo?', type: 'select', options: YES_NO_UNSURE },
      { key: 'logo_variations', label: 'Logo variations available', type: 'textarea', wide: true, hint: 'Dark, light, icon-only, stacked…' },
      { key: 'brand_guidelines', label: 'Do you have brand guidelines?', type: 'select', options: YES_NO_UNSURE },
      { key: 'colour_primary', label: 'Primary brand colour', type: 'colour', hint: 'HEX value, e.g. #1E3A8A' },
      { key: 'colour_secondary', label: 'Secondary colour', type: 'colour' },
      { key: 'colour_accent', label: 'Accent colour', type: 'colour' },
      { key: 'brand_fonts', label: 'Brand fonts', type: 'text', wide: true },
      { key: 'icon_style', label: 'Icon style preference', type: 'text' },
      { key: 'photography', label: 'Photography', type: 'textarea', wide: true, hint: 'Do you have your own, or do we need stock imagery?' },
      { key: 'illustrations', label: 'Illustrations', type: 'textarea', wide: true },
      { key: 'preferred_style', label: 'Preferred style', type: 'textarea', wide: true, hint: 'Modern, traditional, bold, minimal…' },
      { key: 'brand_examples', label: 'Brands you admire', type: 'textarea', wide: true },
      { key: 'competitor_examples', label: 'Competitor branding to avoid looking like', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'website_content',
    title: 'Website Content',
    description: 'Page-by-page copy is collected in the Content section of your project.',
    fields: [
      { key: 'content_source', label: 'Who is writing the copy?', type: 'select', options: [
        { value: 'client', label: 'We will write it' },
        { value: 'agency', label: 'Please write it for us' },
        { value: 'mixed', label: 'A mixture' },
      ] },
      { key: 'existing_content', label: 'Can we reuse existing content?', type: 'select', options: YES_NO_UNSURE },
      { key: 'tone_of_voice', label: 'Tone of voice', type: 'textarea', wide: true },
      { key: 'content_deadline', label: 'When will content be ready?', type: 'date' },
      { key: 'notes', label: 'Content notes', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'pages_structure',
    title: 'Pages and Structure',
    description: 'The sitemap is built in the Content section — this covers the shape of it.',
    fields: [
      { key: 'required_pages', label: 'Pages you know you need', type: 'textarea', wide: true, hint: 'One per line.' },
      { key: 'navigation_notes', label: 'Navigation preferences', type: 'textarea', wide: true },
      { key: 'footer_pages', label: 'Footer links', type: 'textarea', wide: true },
      { key: 'landing_pages', label: 'Campaign or landing pages', type: 'textarea', wide: true },
      { key: 'future_pages', label: 'Pages you may add later', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'images_media',
    title: 'Images and Media',
    description: 'Photography, video and other media.',
    fields: [
      { key: 'has_photography', label: 'Do you have professional photography?', type: 'select', options: YES_NO_UNSURE },
      { key: 'photography_needs', label: 'Photography requirements', type: 'textarea', wide: true },
      { key: 'video', label: 'Video requirements', type: 'textarea', wide: true },
      { key: 'stock_imagery', label: 'Happy to use stock imagery?', type: 'select', options: YES_NO_UNSURE },
      { key: 'media_notes', label: 'Other media notes', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'domain_hosting',
    title: 'Domain and Hosting',
    description: 'Where the site lives and who controls it.',
    notice: {
      variant: 'warning',
      title: 'Never type passwords into this form',
      body:
        'We will never ask for passwords, API secrets or card details in the portal. ' +
        'When we need access, your account manager will send a one-time secure link. ' +
        'Record only the provider names and account references here.',
    },
    fields: [
      { key: 'domain_name', label: 'Domain name', type: 'text', required: true },
      { key: 'registrar', label: 'Domain registrar', type: 'text', hint: 'e.g. GoDaddy, 123-reg, Cloudflare.' },
      { key: 'dns_provider', label: 'DNS provider', type: 'text' },
      { key: 'hosting_provider', label: 'Hosting provider', type: 'text' },
      { key: 'existing_platform', label: 'Existing website platform', type: 'text', hint: 'WordPress, Wix, Squarespace, bespoke…' },
      { key: 'email_provider', label: 'Email provider', type: 'text', hint: 'Microsoft 365, Google Workspace, hosting-provided…' },
      { key: 'cdn_provider', label: 'CDN provider', type: 'text' },
      { key: 'migration_requirements', label: 'Migration requirements', type: 'textarea', wide: true },
      { key: 'transfer_requirements', label: 'Transfer requirements', type: 'textarea', wide: true, hint: 'Does the domain or hosting need to move to us?' },
    ],
  },
  {
    key: 'technical_integrations',
    title: 'Technical Integrations',
    description: 'Analytics, payments, CRM and other services. Record account references, never credentials.',
    notice: {
      variant: 'info',
      title: 'Account references only',
      body:
        'Measurement IDs, container IDs and account names are fine here. ' +
        'Anything secret should come through the secure link your account manager provides.',
    },
    fields: [
      { key: 'google_analytics', label: 'Google Analytics', type: 'text', hint: 'Measurement ID, e.g. G-XXXXXXX' },
      { key: 'google_tag_manager', label: 'Google Tag Manager', type: 'text', hint: 'Container ID, e.g. GTM-XXXXXX' },
      { key: 'google_search_console', label: 'Google Search Console', type: 'text' },
      { key: 'microsoft_clarity', label: 'Microsoft Clarity', type: 'text' },
      { key: 'meta_pixel', label: 'Meta Pixel', type: 'text' },
      { key: 'stripe', label: 'Stripe', type: 'text' },
      { key: 'paypal', label: 'PayPal', type: 'text' },
      { key: 'microsoft_365', label: 'Microsoft 365', type: 'text' },
      { key: 'google_workspace', label: 'Google Workspace', type: 'text' },
      { key: 'crm', label: 'CRM', type: 'text' },
      { key: 'mailchimp', label: 'Mailchimp', type: 'text' },
      { key: 'hubspot', label: 'HubSpot', type: 'text' },
      { key: 'booking_system', label: 'Booking system', type: 'text' },
      { key: 'live_chat', label: 'Live chat', type: 'text' },
      { key: 'existing_apis', label: 'Existing APIs', type: 'textarea', wide: true },
      { key: 'custom_integrations', label: 'Custom integrations', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'social_media',
    title: 'Social Media',
    description: 'Profiles, tone of voice and content requirements.',
    fields: [
      { key: 'facebook', label: 'Facebook', type: 'url' },
      { key: 'instagram', label: 'Instagram', type: 'url' },
      { key: 'linkedin', label: 'LinkedIn', type: 'url' },
      { key: 'tiktok', label: 'TikTok', type: 'url' },
      { key: 'youtube', label: 'YouTube', type: 'url' },
      { key: 'x', label: 'X', type: 'url' },
      { key: 'pinterest', label: 'Pinterest', type: 'url' },
      { key: 'other_platforms', label: 'Other platforms', type: 'textarea', wide: true },
      { key: 'current_branding', label: 'Current social branding', type: 'textarea', wide: true, hint: 'For rebranding projects.' },
      { key: 'desired_tone', label: 'Desired tone', type: 'textarea', wide: true },
      { key: 'current_issues', label: 'Current issues', type: 'textarea', wide: true },
      { key: 'competitor_accounts', label: 'Competitor accounts', type: 'textarea', wide: true },
      { key: 'content_styles', label: 'Preferred content styles', type: 'textarea', wide: true },
      { key: 'brand_voice', label: 'Brand voice', type: 'textarea', wide: true },
      { key: 'posting_frequency', label: 'Posting frequency', type: 'text' },
      { key: 'existing_assets', label: 'Existing assets', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'seo',
    title: 'SEO',
    description: 'Keywords, locations and existing search performance.',
    fields: [
      { key: 'target_services', label: 'Services to be found for', type: 'textarea', wide: true },
      { key: 'target_locations', label: 'Locations to target', type: 'textarea', wide: true },
      { key: 'keywords', label: 'Important keywords', type: 'textarea', wide: true },
      { key: 'competitors', label: 'Search competitors', type: 'textarea', wide: true },
      { key: 'existing_provider', label: 'Existing SEO provider', type: 'text' },
      { key: 'google_business_profile', label: 'Google Business Profile', type: 'select', options: YES_NO_UNSURE },
      { key: 'search_console_status', label: 'Search Console set up?', type: 'select', options: YES_NO_UNSURE },
      { key: 'analytics_status', label: 'Analytics set up?', type: 'select', options: YES_NO_UNSURE },
      { key: 'existing_work', label: 'SEO work already done', type: 'textarea', wide: true },
      { key: 'ranking_problems', label: 'Known ranking problems', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'legal_compliance',
    title: 'Legal and Compliance',
    description: 'Policies, consent and accessibility requirements.',
    notice: {
      variant: 'warning',
      title: 'We do not provide legal advice',
      body:
        'We can build the pages and consent mechanisms your website needs, but we do not ' +
        'write or review legal wording unless that is specifically included in your contract. ' +
        'Please have a qualified adviser confirm your policies.',
    },
    fields: [
      { key: 'privacy_policy', label: 'Privacy Policy required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'cookie_policy', label: 'Cookie Policy required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'terms_conditions', label: 'Terms and Conditions required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'gdpr_consent', label: 'GDPR consent mechanism required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'accessibility_statement', label: 'Accessibility statement required?', type: 'select', options: YES_NO_UNSURE },
      { key: 'industry_disclaimers', label: 'Industry-specific disclaimers', type: 'textarea', wide: true, hint: 'Regulated sectors such as finance, health or legal.' },
      { key: 'notes', label: 'Compliance notes', type: 'textarea', wide: true },
    ],
  },
  {
    key: 'final_review',
    title: 'Final Review',
    description: 'Confirm everything before we begin.',
    fields: [
      { key: 'anything_missed', label: 'Anything we have not asked about?', type: 'textarea', wide: true },
      { key: 'key_dates', label: 'Key dates or deadlines', type: 'textarea', wide: true },
      { key: 'decision_makers', label: 'Who signs work off?', type: 'textarea', wide: true },
      { key: 'confirm_accurate', label: 'I confirm the information provided is accurate', type: 'checkbox', wide: true },
    ],
  },
];

export const SECTION_BY_KEY = new Map(ONBOARDING_SECTIONS.map((s) => [s.key, s]));

/** Requirements tracked as their own items, with an upload and a status each. */
export const SECTION_ITEMS: Record<string, { key: string; label: string; help?: string }[]> = {
  branding: [
    { key: 'primary_logo', label: 'Primary logo', help: 'Vector (SVG, AI or EPS) preferred.' },
    { key: 'logo_variations', label: 'Logo variations', help: 'Dark, light and icon-only versions.' },
    { key: 'brand_guidelines', label: 'Brand guidelines document' },
    { key: 'fonts', label: 'Brand font files or licences' },
    { key: 'photography', label: 'Photography library' },
  ],
  images_media: [
    { key: 'team_photos', label: 'Team photographs' },
    { key: 'product_photos', label: 'Product or service photographs' },
    { key: 'video_assets', label: 'Video assets' },
  ],
  legal_compliance: [
    { key: 'privacy_policy_doc', label: 'Existing privacy policy' },
    { key: 'terms_doc', label: 'Existing terms and conditions' },
  ],
};
