// Avatar rond (photo si disponible, sinon initiales) — utilisé partout où
// un utilisateur est affiché (topbar, menus, listes admin/école...).
function withInitials(user) {
  const first = user?.firstName?.[0] || "U";
  const last = user?.lastName?.[0] || "X";
  return `${first}${last}`.toUpperCase();
}

export function getAvatarSource(user) {
  return user?.avatarDataUrl || user?.account?.avatarDataUrl || user?.account?.details?.avatarDataUrl || user?.profile?.avatarDataUrl || "";
}

export function AvatarCircle({ user, large = false }) {
  const src = getAvatarSource(user);
  const initials = withInitials(user);

  return (
    <div className={`avatar ${large ? "large" : ""} ${src ? "has-image" : ""}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : initials}
    </div>
  );
}
