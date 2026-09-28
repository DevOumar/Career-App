import Swal from "sweetalert2";

// Compte créé par l'administrateur : invite, une fois par session, à
// remplacer le mot de passe provisoire (l'obligation disparaît dès que le
// mot de passe est changé, côté serveur).
export function promptPasswordChange({ user, language, onOpenSecurity }) {
  if (!user?.mustChangePassword) return;
  const key = `career_password_notice_${user.id}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch (_error) {
    // stockage indisponible : l'invitation s'affiche quand même
  }
  const en = language === "en";
  Swal.fire({
    icon: "info",
    title: en ? "Choose your own password" : "Choisissez votre mot de passe",
    text: en
      ? "Your account was created with a temporary password. For your security, replace it now."
      : "Votre compte a été créé avec un mot de passe provisoire. Pour votre sécurité, remplacez-le dès maintenant.",
    confirmButtonText: en ? "Change my password" : "Changer mon mot de passe",
    showCancelButton: true,
    cancelButtonText: en ? "Later" : "Plus tard",
    confirmButtonColor: "#b83309"
  }).then((choice) => {
    if (choice.isConfirmed) onOpenSecurity?.();
  });
}
