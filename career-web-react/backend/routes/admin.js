// Routes admin — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
import { registerAdminOverviewRoutes } from "./admin/overview.js";
import { registerAdminExportRoutes } from "./admin/exports.js";
import { registerAdminPlansRoutes } from "./admin/plans.js";
import { registerAdminUsersRoutes } from "./admin/users.js";
import { registerAdminActivityRoutes } from "./admin/activity.js";
import { registerAdminLicensesRoutes } from "./admin/licenses.js";
import { registerAdminSettingsRoutes } from "./admin/settings.js";
import { registerAdminAnnouncementsRoutes } from "./admin/announcements.js";
import { registerAdminAiRoutes } from "./admin/ai.js";
import { registerAdminCvsAndMatchingRoutes } from "./admin/cvsAndMatching.js";
import { registerAdminFinanceRoutes } from "./admin/finance.js";
import { registerAdminSatisfactionRoutes } from "./admin/satisfaction.js";
import { registerAdminSchoolsRoutes } from "./admin/schools.js";

export function registerAdminRoutes(app) {
  registerAdminOverviewRoutes(app);
  registerAdminExportRoutes(app);
  registerAdminPlansRoutes(app);
  registerAdminUsersRoutes(app);
  registerAdminActivityRoutes(app);
  registerAdminLicensesRoutes(app);
  registerAdminSettingsRoutes(app);
  registerAdminAnnouncementsRoutes(app);
  registerAdminAiRoutes(app);
  registerAdminCvsAndMatchingRoutes(app);
  registerAdminFinanceRoutes(app);
  registerAdminSatisfactionRoutes(app);
  registerAdminSchoolsRoutes(app);
}
