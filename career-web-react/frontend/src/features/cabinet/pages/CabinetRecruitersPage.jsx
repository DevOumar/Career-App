import React from "react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getCabinetRecruiters, removeCabinetRecruiter } from "../../../lib/inMemoryDb.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";

export default function CabinetRecruitersPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Recruiters",
          subtitle: "Team members using a seat on your license.",
          search: "Search by name or email…",
          joinedOn: "Joined on",
          remove: "Remove",
          removeConfirmTitle: "Remove this recruiter?",
          removeConfirmText: "This frees up a seat on your license.",
          removeConfirmBtn: "Remove",
          cancel: "Cancel",
          empty: "No recruiter linked to your license yet.",
          emptyHint: "Invite a recruiter to get your team started."
        }
      : {
          title: "Recruteurs",
          subtitle: "Membres de l'équipe qui utilisent un siège de votre licence.",
          search: "Rechercher par nom ou email…",
          joinedOn: "Inscrit le",
          remove: "Retirer",
          removeConfirmTitle: "Retirer ce recruteur ?",
          removeConfirmText: "Cela libère un siège sur votre licence.",
          removeConfirmBtn: "Retirer",
          cancel: "Annuler",
          empty: "Aucun recruteur rattaché à votre licence pour l'instant.",
          emptyHint: "Invitez un recruteur pour démarrer votre équipe."
        };

  const [items, setItems] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  function reload() {
    getCabinetRecruiters(user.id, { search }).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, search]);

  async function handleRemove(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.removeConfirmTitle,
      text: `${item.firstName} ${item.lastName}`,
      showCancelButton: true,
      confirmButtonText: copy.removeConfirmBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    await removeCabinetRecruiter(user.id, item.id);
    reload();
  }

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="profile" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
        {items ? (
          <div className="history-count-badge">
            <strong>{items.length}</strong>
          </div>
        ) : null}
      </div>

      <div className="card block">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      {items?.length ? (
        <div className="history-list">
          {items.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <AvatarCircle user={item} />
                  <div>
                    <h3>{item.firstName} {item.lastName}</h3>
                    <p>{item.email}</p>
                  </div>
                </div>
                <button type="button" className="btn-ghost" onClick={() => handleRemove(item)}>
                  <UiIcon name="trash" /> {copy.remove}
                </button>
              </div>
              <div className="history-card-stats">
                <span className="history-card-stat">{copy.joinedOn} {formatDate(item.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : items ? (
        <CabinetEmptyState icon="profile" title={copy.empty} hint={copy.emptyHint} />
      ) : null}
    </section>
  );
}
