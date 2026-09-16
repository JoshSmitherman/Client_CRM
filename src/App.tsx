import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import {
  HomeRedirect,
  RequireAgency,
  RequireAgencyAdmin,
  RequireAuth,
  RequireClient,
} from '@/components/routing/guards';
import { AgencyShell } from '@/components/layout/agency-shell';
import { PortalShell } from '@/components/layout/portal-shell';
import { AuthLayout } from '@/components/layout/auth-layout';
import { NotFoundPage } from '@/pages/not-found';

/**
 * Pages are loaded on demand.
 *
 * A client portal user never downloads the agency workspace, and the sign-in
 * screen does not carry the whole application with it — which matters more here
 * than it would behind a server, since everything is served as static files.
 */
// --- public --------------------------------------------------------------
const SetupPage = lazy(() => import('@/pages/setup').then((m) => ({ default: m.SetupPage })));
const LoginPage = lazy(() => import('@/pages/auth/login').then((m) => ({ default: m.LoginPage })));
const SignUpPage = lazy(() => import('@/pages/auth/signup').then((m) => ({ default: m.SignUpPage })));
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password').then((m) => ({ default: m.ResetPasswordPage })));
const UpdatePasswordPage = lazy(() => import('@/pages/auth/update-password').then((m) => ({ default: m.UpdatePasswordPage })));
const AcceptInvitePage = lazy(() => import('@/pages/auth/accept-invite').then((m) => ({ default: m.AcceptInvitePage })));

// --- agency workspace ----------------------------------------------------
const DashboardPage = lazy(() => import('@/pages/agency/dashboard').then((m) => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import('@/pages/agency/clients').then((m) => ({ default: m.ClientsPage })));
const NewClientPage = lazy(() => import('@/pages/agency/client-new').then((m) => ({ default: m.NewClientPage })));
const ClientDetailPage = lazy(() => import('@/pages/agency/client-detail').then((m) => ({ default: m.ClientDetailPage })));
const EditClientPage = lazy(() => import('@/pages/agency/client-edit').then((m) => ({ default: m.EditClientPage })));
const ProjectsPage = lazy(() => import('@/pages/agency/projects').then((m) => ({ default: m.ProjectsPage })));
const NewProjectPage = lazy(() => import('@/pages/agency/project-new').then((m) => ({ default: m.NewProjectPage })));
const ProjectWorkspace = lazy(() => import('@/pages/agency/project-workspace').then((m) => ({ default: m.ProjectWorkspace })));
const ProjectOverviewTab = lazy(() => import('@/pages/agency/project/overview').then((m) => ({ default: m.ProjectOverviewTab })));
const ProjectPlanningTab = lazy(() => import('@/pages/agency/project/planning').then((m) => ({ default: m.ProjectPlanningTab })));
const ProjectOnboardingTab = lazy(() => import('@/pages/agency/project/onboarding').then((m) => ({ default: m.ProjectOnboardingTab })));
const ProjectTasksTab = lazy(() => import('@/pages/agency/project/tasks').then((m) => ({ default: m.ProjectTasksTab })));
const ProjectContentTab = lazy(() => import('@/pages/agency/project/content').then((m) => ({ default: m.ProjectContentTab })));
const ProjectPageEditor = lazy(() => import('@/pages/agency/project/content-page').then((m) => ({ default: m.ProjectPageEditor })));
const ProjectFilesTab = lazy(() => import('@/pages/agency/project/files').then((m) => ({ default: m.ProjectFilesTab })));
const ProjectChangesTab = lazy(() => import('@/pages/agency/project/changes').then((m) => ({ default: m.ProjectChangesTab })));
const ProjectSupportTab = lazy(() => import('@/pages/agency/project/support').then((m) => ({ default: m.ProjectSupportTab })));
const ProjectHandoverTab = lazy(() => import('@/pages/agency/project/handover').then((m) => ({ default: m.ProjectHandoverTab })));
const ProjectMaintenanceTab = lazy(() => import('@/pages/agency/project/maintenance').then((m) => ({ default: m.ProjectMaintenanceTab })));
const ProjectCommentsTab = lazy(() => import('@/pages/agency/project/comments').then((m) => ({ default: m.ProjectCommentsTab })));
const ProjectActivityTab = lazy(() => import('@/pages/agency/project/activity').then((m) => ({ default: m.ProjectActivityTab })));
const ProjectSettingsTab = lazy(() => import('@/pages/agency/project/settings').then((m) => ({ default: m.ProjectSettingsTab })));
const ChangeRequestsPage = lazy(() => import('@/pages/agency/change-requests').then((m) => ({ default: m.ChangeRequestsPage })));
const ChangeRequestDetailPage = lazy(() => import('@/pages/agency/change-request-detail').then((m) => ({ default: m.ChangeRequestDetailPage })));
const SupportPage = lazy(() => import('@/pages/agency/support').then((m) => ({ default: m.SupportPage })));
const SupportDetailPage = lazy(() => import('@/pages/agency/support-detail').then((m) => ({ default: m.SupportDetailPage })));
const MaintenancePage = lazy(() => import('@/pages/agency/maintenance').then((m) => ({ default: m.MaintenancePage })));
const SubscriptionDetailPage = lazy(() => import('@/pages/agency/subscription-detail').then((m) => ({ default: m.SubscriptionDetailPage })));
const TasksPage = lazy(() => import('@/pages/agency/tasks').then((m) => ({ default: m.TasksPage })));
const FilesPage = lazy(() => import('@/pages/agency/files').then((m) => ({ default: m.FilesPage })));
const NotificationsPage = lazy(() => import('@/pages/agency/notifications').then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/pages/agency/settings').then((m) => ({ default: m.SettingsPage })));
const AccountPage = lazy(() => import('@/pages/account').then((m) => ({ default: m.AccountPage })));

// --- client portal -------------------------------------------------------
const PortalHomePage = lazy(() => import('@/pages/portal/home').then((m) => ({ default: m.PortalHomePage })));
const PortalProjectsPage = lazy(() => import('@/pages/portal/projects').then((m) => ({ default: m.PortalProjectsPage })));
const PortalProjectPage = lazy(() => import('@/pages/portal/project').then((m) => ({ default: m.PortalProjectPage })));
const PortalOnboardingPage = lazy(() => import('@/pages/portal/onboarding').then((m) => ({ default: m.PortalOnboardingPage })));
const PortalSectionPage = lazy(() => import('@/pages/portal/onboarding-section').then((m) => ({ default: m.PortalSectionPage })));
const PortalContentPage = lazy(() => import('@/pages/portal/content').then((m) => ({ default: m.PortalContentPage })));
const PortalPageEditor = lazy(() => import('@/pages/portal/content-page').then((m) => ({ default: m.PortalPageEditor })));
const PortalHandoverPage = lazy(() => import('@/pages/portal/handover').then((m) => ({ default: m.PortalHandoverPage })));
const PortalRequestsPage = lazy(() => import('@/pages/portal/requests').then((m) => ({ default: m.PortalRequestsPage })));
const PortalNewRequestPage = lazy(() => import('@/pages/portal/request-new').then((m) => ({ default: m.PortalNewRequestPage })));
const PortalRequestDetailPage = lazy(() => import('@/pages/portal/request-detail').then((m) => ({ default: m.PortalRequestDetailPage })));
const PortalSupportPage = lazy(() => import('@/pages/portal/support').then((m) => ({ default: m.PortalSupportPage })));
const PortalNewSupportPage = lazy(() => import('@/pages/portal/support-new').then((m) => ({ default: m.PortalNewSupportPage })));
const PortalSupportDetailPage = lazy(() => import('@/pages/portal/support-detail').then((m) => ({ default: m.PortalSupportDetailPage })));
const PortalFilesPage = lazy(() => import('@/pages/portal/files').then((m) => ({ default: m.PortalFilesPage })));
const PortalMaintenancePage = lazy(() => import('@/pages/portal/maintenance').then((m) => ({ default: m.PortalMaintenancePage })));
const PortalMessagesPage = lazy(() => import('@/pages/portal/messages').then((m) => ({ default: m.PortalMessagesPage })));

/** Shown while a route's code is on its way. */
function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <p className="text-sm text-[var(--text-secondary)]" role="status">
        Loading…
      </p>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/setup" element={<SetupPage />} />

        {/* Public */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/invite/accept" element={<AcceptInvitePage />} />
        </Route>

        {/* Signed in */}
        <Route element={<RequireAuth />}>
          {/* Agency workspace */}
          <Route element={<RequireAgency />}>
            <Route element={<AgencyShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/new" element={<NewClientPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/clients/:id/edit" element={<EditClientPage />} />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<NewProjectPage />} />
              <Route path="/projects/:id" element={<ProjectWorkspace />}>
                <Route index element={<ProjectOverviewTab />} />
                <Route path="planning" element={<ProjectPlanningTab />} />
                <Route path="onboarding" element={<ProjectOnboardingTab />} />
                <Route path="tasks" element={<ProjectTasksTab />} />
                <Route path="content" element={<ProjectContentTab />} />
                <Route path="content/:pageId" element={<ProjectPageEditor />} />
                <Route path="files" element={<ProjectFilesTab />} />
                <Route path="changes" element={<ProjectChangesTab />} />
                <Route path="support" element={<ProjectSupportTab />} />
                <Route path="handover" element={<ProjectHandoverTab />} />
                <Route path="maintenance" element={<ProjectMaintenanceTab />} />
                <Route path="comments" element={<ProjectCommentsTab />} />
                <Route path="activity" element={<ProjectActivityTab />} />
                <Route path="settings" element={<ProjectSettingsTab />} />
              </Route>

              <Route path="/change-requests" element={<ChangeRequestsPage />} />
              <Route
                path="/change-requests/:id"
                element={<ChangeRequestDetailPage />}
              />

              <Route path="/support" element={<SupportPage />} />
              <Route path="/support/:id" element={<SupportDetailPage />} />

              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route
                path="/maintenance/:id"
                element={<SubscriptionDetailPage />}
              />

              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings/account" element={<AccountPage />} />

              <Route element={<RequireAgencyAdmin />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Client portal */}
          <Route element={<RequireClient />}>
            <Route element={<PortalShell />}>
              <Route path="/portal" element={<PortalHomePage />} />
              <Route path="/portal/projects" element={<PortalProjectsPage />} />
              <Route
                path="/portal/projects/:id"
                element={<PortalProjectPage />}
              />
              <Route
                path="/portal/projects/:id/onboarding"
                element={<PortalOnboardingPage />}
              />
              <Route
                path="/portal/projects/:id/onboarding/:section"
                element={<PortalSectionPage />}
              />
              <Route
                path="/portal/projects/:id/content"
                element={<PortalContentPage />}
              />
              <Route
                path="/portal/projects/:id/content/:pageId"
                element={<PortalPageEditor />}
              />
              <Route
                path="/portal/projects/:id/handover"
                element={<PortalHandoverPage />}
              />

              <Route path="/portal/requests" element={<PortalRequestsPage />} />
              <Route
                path="/portal/requests/new"
                element={<PortalNewRequestPage />}
              />
              <Route
                path="/portal/requests/:id"
                element={<PortalRequestDetailPage />}
              />

              <Route path="/portal/support" element={<PortalSupportPage />} />
              <Route
                path="/portal/support/new"
                element={<PortalNewSupportPage />}
              />
              <Route
                path="/portal/support/:id"
                element={<PortalSupportDetailPage />}
              />

              <Route path="/portal/files" element={<PortalFilesPage />} />
              <Route
                path="/portal/maintenance"
                element={<PortalMaintenancePage />}
              />
              <Route path="/portal/messages" element={<PortalMessagesPage />} />
              <Route path="/portal/account" element={<AccountPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
