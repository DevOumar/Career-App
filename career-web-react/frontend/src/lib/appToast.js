import Swal from "sweetalert2";

// Alerte au style de l'app (toast en haut à droite), utilisée à la place des
// fenêtres Swal par défaut pour les erreurs, avertissements et confirmations.
export function appToast(icon, title, text = "") {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    text: text || undefined,
    showConfirmButton: false,
    timer: icon === "success" ? 2800 : 5200,
    timerProgressBar: true,
    customClass: { popup: "career-toast", title: "career-toast-title" }
  });
}
