import Swal from "sweetalert2";

// Confirmation d'action uniforme dans tout l'espace Cabinet — un toast en
// haut à droite (même pattern que le reste de l'app côté candidat), jamais
// un texte statique laissé affiché sous un formulaire, jamais une popup
// centrée qui interrompt le flux.
export function cabinetToast({ title, text = "", icon = "success" }) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    text,
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    customClass: { popup: "career-toast", title: "career-toast-title" }
  });
}
