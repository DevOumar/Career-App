// Routes cabinet — même principe que routes/school.js : toutes les
// dépendances sont lues depuis app.locals.ctx, rempli une fois dans
// index.js après l'initialisation complète.
import { registerCabinetOverviewRoutes } from "./cabinet/overview.js";
import { registerCabinetRecruitersRoutes } from "./cabinet/recruiters.js";
import { registerCabinetInvitationsRoutes } from "./cabinet/invitations.js";
import { registerCabinetLicenseRoutes } from "./cabinet/license.js";
import { registerCabinetCandidatesRoutes } from "./cabinet/candidates.js";
import { registerCabinetMissionsRoutes } from "./cabinet/missions.js";
import { registerCabinetAnnouncementsRoutes } from "./cabinet/announcements.js";
import { registerCabinetReportsRoutes } from "./cabinet/reports.js";
import { registerCabinetProfileRoutes } from "./cabinet/profile.js";
import { registerCabinetExtrasRoutes } from "./cabinet/extras.js";

export function registerCabinetRoutes(app) {
  registerCabinetOverviewRoutes(app);
  registerCabinetRecruitersRoutes(app);
  registerCabinetInvitationsRoutes(app);
  registerCabinetLicenseRoutes(app);
  registerCabinetCandidatesRoutes(app);
  registerCabinetMissionsRoutes(app);
  registerCabinetAnnouncementsRoutes(app);
  registerCabinetReportsRoutes(app);
  registerCabinetProfileRoutes(app);
  registerCabinetExtrasRoutes(app);
}
