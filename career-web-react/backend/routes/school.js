// Routes school — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
import { registerSchoolOverviewRoutes } from "./school/overview.js";
import { registerSchoolStudentsRoutes } from "./school/students.js";
import { registerSchoolLicenseRoutes } from "./school/license.js";
import { registerSchoolInsightsRoutes } from "./school/insights.js";
import { registerSchoolInvitationsRoutes } from "./school/invitations.js";
import { registerSchoolProfileRoutes } from "./school/profile.js";
import { registerSchoolNotificationsRoutes } from "./school/notifications.js";
import { registerSchoolPromotionsRoutes } from "./school/promotions.js";
import { registerSchoolReportsRoutes } from "./school/reports.js";

export function registerSchoolRoutes(app) {
  registerSchoolOverviewRoutes(app);
  registerSchoolStudentsRoutes(app);
  registerSchoolLicenseRoutes(app);
  registerSchoolInsightsRoutes(app);
  registerSchoolInvitationsRoutes(app);
  registerSchoolProfileRoutes(app);
  registerSchoolNotificationsRoutes(app);
  registerSchoolPromotionsRoutes(app);
  registerSchoolReportsRoutes(app);
}
