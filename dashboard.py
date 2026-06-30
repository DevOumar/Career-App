import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import json

# ─── CONFIG ────────────────────────────────────────────────
st.set_page_config(
    page_title="Career_App · Dashboard",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ─── PALETTE ───────────────────────────────────────────────
C1  = '#3B82F6'   # bleu principal
C2  = '#06B6D4'   # cyan
C3  = '#6366F1'   # indigo
C4  = '#10B981'   # vert
C5  = '#F59E0B'   # ambre
C6  = '#EC4899'   # rose
COLORS = [C1, C2, C3, C4, C5, C6, '#94A3B8']

# ─── STYLE ─────────────────────────────────────────────────
st.markdown("""
<style>
html, body, [class*="css"] {
    font-family: system-ui, -apple-system, sans-serif;
    color: #0F172A;
}

.stApp {
    background: linear-gradient(160deg, #EFF6FF 0%, #F0FDFF 40%, #F5F3FF 100%);
    min-height: 100vh;
}

#MainMenu, footer, header { visibility: hidden; }
.block-container { padding: 3rem 4rem; max-width: 1200px; }

[data-testid="metric-container"] {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.9);
    border-radius: 20px;
    padding: 24px 20px;
    box-shadow: 0 4px 24px rgba(59,130,246,0.06);
}
[data-testid="metric-container"] label {
    font-size: 0.68rem !important;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94A3B8 !important;
    font-weight: 600 !important;
}
[data-testid="stMetricValue"] {
    font-size: 2rem !important;
    font-weight: 800 !important;
    color: #0F172A !important;
}

hr { border: none; border-top: 1px solid rgba(148,163,184,0.2); margin: 3rem 0; }
.js-plotly-plot .plotly { background: transparent !important; }
</style>
""", unsafe_allow_html=True)

# ─── HELPERS ───────────────────────────────────────────────
def pct(val, total):
    return round(val / total * 100) if total else 0

def section_title(emoji, title, color=C1):
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;margin-top:0.5rem">
      <span style="font-size:1.4rem">{emoji}</span>
      <span style="font-size:1.4rem;font-weight:800;color:#0F172A;letter-spacing:-0.02em">{title}</span>
      <div style="flex:1;height:1px;background:linear-gradient(to right,{color}44,transparent)"></div>
    </div>""", unsafe_allow_html=True)

def light_fig(fig):
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(family='system-ui', color='#64748B', size=12),
        margin=dict(l=10, r=10, t=36, b=10),
        legend=dict(bgcolor='rgba(0,0,0,0)', font=dict(size=11, color='#64748B')),
        title_font=dict(size=13, color='#0F172A', family='system-ui'),
    )
    fig.update_xaxes(gridcolor='rgba(148,163,184,0.15)', showline=False, zeroline=False, tickfont=dict(color='#94A3B8'))
    fig.update_yaxes(gridcolor='rgba(148,163,184,0.15)', showline=False, zeroline=False, tickfont=dict(color='#94A3B8'))
    return fig

# ─── SIDEBAR ───────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚡ Career_App")
    json_path = st.text_input("Chemin du JSON", value="C:\\Users\\Benzemma\\OneDrive\\Bureau\\Projets HETIC\\Career_app\\data\\career_app_stats.json")
    st.markdown("---")
    st.caption("Sections")
    st.markdown("👤 Profil  \n🚨 Problème  \n📄 Compétences  \n✅ Validation  \n💬 Verbatims")

# ─── LOAD ──────────────────────────────────────────────────
@st.cache_data
def load(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

try:
    s = load(json_path)
except:
    st.error(f"❌ Impossible de charger `{json_path}`")
    st.stop()

N = s['total']
util_vals = s['utiliserait_app']
oui_util  = sum(v for k, v in util_vals.items() if 'oui' in k.lower())
wtp_oui   = s['willingness_to_pay'].get('Oui', 0)
pas_test  = s['test_orientation'].get('NON', s['test_orientation'].get('Non', 0))

# ─── HEADER ────────────────────────────────────────────────
st.markdown(f"""
<div style="padding:3rem 0 2rem">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:2rem">
    <div style="font-size:1.1rem;font-weight:700;letter-spacing:-0.01em;color:#0F172A">
      Career<span style="color:{C1}">_App</span>
    </div>
    <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;
      padding:6px 16px;border-radius:100px;background:rgba(59,130,246,0.08);
      border:1px solid rgba(59,130,246,0.2);color:{C1}">
      {N} répondants · Étude terrain 2026
    </div>
  </div>
  <div style="font-size:clamp(2rem,4vw,3.2rem);font-weight:900;line-height:1.05;
    letter-spacing:-0.03em;color:#0F172A;margin-bottom:16px">
    Les jeunes ne savent pas<br/>
    <span style="background:linear-gradient(135deg,{C1},{C2});-webkit-background-clip:text;
      -webkit-text-fill-color:transparent;background-clip:text">où ils vont.</span>
  </div>
  <div style="font-size:1rem;color:#64748B;max-width:500px;line-height:1.75">
    On a interrogé <strong style="color:#0F172A">{N} jeunes actifs et étudiants</strong>
    sur leur rapport à l'orientation professionnelle. Les résultats parlent d'eux-mêmes.
  </div>
</div>
""", unsafe_allow_html=True)

# ─── KPIs ──────────────────────────────────────────────────
c1,c2,c3,c4,c5,c6 = st.columns(6)
c1.metric("Répondants",        f"{N}")
c2.metric("Score perdu",       f"{s['score_perdu_moyen']}/10")
c3.metric("Intérêt app",       f"{pct(oui_util, N)}%")
c4.metric("Prêts à payer",     f"{pct(wtp_oui, N)}%")
c5.metric("Jamais orientés",   f"{pct(pas_test, N)}%")
c6.metric("Moy. candidatures", f"{round(s['nb_candidatures_moyen'])}")

st.markdown("---")

# ─── PROFIL ────────────────────────────────────────────────
section_title("👤", "Qui a répondu ?", C1)

col1, col2 = st.columns(2, gap="large")
with col1:
    ordre = ['18–20', '21–23', '24-25', '+ 25']
    age_data = {k: s['age'][k] for k in ordre if k in s['age']}
    fig = px.bar(
        x=list(age_data.values()), y=list(age_data.keys()),
        orientation='h',
        color=list(age_data.keys()), color_discrete_sequence=COLORS,
        title="Tranche d'âge"
    )
    fig.update_traces(marker_cornerradius=8)
    fig.update_layout(showlegend=False)
    st.plotly_chart(light_fig(fig), use_container_width=True)

with col2:
    sit_data = s['situation']
    fig = px.pie(names=list(sit_data.keys()), values=list(sit_data.values()),
        color_discrete_sequence=COLORS, hole=0.65, title="Situation actuelle")
    fig.update_traces(textposition='outside', textinfo='percent+label')
    st.plotly_chart(light_fig(fig), use_container_width=True)

col3, col4 = st.columns(2, gap="large")
with col3:
    niv = dict(sorted(s['niveau_etudes'].items(), key=lambda x: x[1]))
    fig = px.bar(x=list(niv.values()), y=list(niv.keys()), orientation='h',
        color=list(niv.keys()), color_discrete_sequence=COLORS, title="Niveau d'études")
    fig.update_traces(marker_cornerradius=8)
    fig.update_layout(showlegend=False)
    st.plotly_chart(light_fig(fig), use_container_width=True)

with col4:
    dom = dict(sorted(s['domaine'].items(), key=lambda x: x[1], reverse=True))
    fig = px.pie(names=list(dom.keys()), values=list(dom.values()),
        color_discrete_sequence=COLORS, hole=0.65, title="Domaine d'activité")
    fig.update_traces(textposition='outside', textinfo='percent+label')
    st.plotly_chart(light_fig(fig), use_container_width=True)

st.markdown("---")

# ─── PROBLÈME ──────────────────────────────────────────────
section_title( "L'ampleur du problème", '#EF4444')

st.markdown(f"""
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:2rem">
  <div style="background:linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02));
    border:1px solid rgba(239,68,68,0.15);border-radius:16px;padding:24px;text-align:center">
    <div style="font-size:2.8rem;font-weight:900;color:#EF4444;letter-spacing:-0.03em">
      {s['score_perdu_moyen']}<span style="font-size:1.2rem">/10</span>
    </div>
    <div style="font-size:0.78rem;color:#64748B;margin-top:6px;line-height:1.5">Score moyen<br/>"je me sens perdu(e)"</div>
  </div>
  <div style="background:linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02));
    border:1px solid rgba(245,158,11,0.15);border-radius:16px;padding:24px;text-align:center">
    <div style="font-size:2.8rem;font-weight:900;color:{C5};letter-spacing:-0.03em">{pct(pas_test,N)}%</div>
    <div style="font-size:0.78rem;color:#64748B;margin-top:6px;line-height:1.5">N'ont jamais passé<br/>de test d'orientation</div>
  </div>
  <div style="background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(99,102,241,0.02));
    border:1px solid rgba(99,102,241,0.15);border-radius:16px;padding:24px;text-align:center">
    <div style="font-size:2.8rem;font-weight:900;color:{C3};letter-spacing:-0.03em">{round(s['nb_candidatures_moyen'])}</div>
    <div style="font-size:0.78rem;color:#64748B;margin-top:6px;line-height:1.5">Candidatures envoyées<br/>en moyenne</div>
  </div>
</div>
""", unsafe_allow_html=True)

col1, col2 = st.columns(2, gap="large")
with col1:
    cl = s['clarte_metier']
    fig = px.pie(names=list(cl.keys()), values=list(cl.values()),
        color_discrete_sequence=[C4, C5, '#EF4444'],
        hole=0.65, title="Clarté sur le métier voulu")
    fig.update_traces(textposition='outside', textinfo='percent+label')
    st.plotly_chart(light_fig(fig), use_container_width=True)

with col2:
    perdu = dict(sorted(s['score_perdu_distrib'].items(), key=lambda x: int(x[0])))
    cols_p = [C3 if int(k)<5 else C1 if int(k)<7 else '#EF4444' for k in perdu]
    fig = px.bar(x=list(perdu.keys()), y=list(perdu.values()),
        color=list(perdu.keys()), color_discrete_sequence=cols_p,
        title=f"Distribution score 'perdu(e)' — moy. {s['score_perdu_moyen']}/10")
    fig.update_traces(marker_cornerradius=6)
    fig.update_layout(showlegend=False)
    st.plotly_chart(light_fig(fig), use_container_width=True)

bloc = dict(sorted(s['blocage'].items(), key=lambda x: x[1], reverse=True))
fig = px.bar(x=list(bloc.values()), y=list(bloc.keys()), orientation='h',
    color=list(bloc.keys()), color_discrete_sequence=COLORS,
    title="Ce qui bloque le plus")
fig.update_traces(marker_cornerradius=8)
fig.update_layout(showlegend=False, height=320)
st.plotly_chart(light_fig(fig), use_container_width=True)

st.markdown("---")

# ─── COMPÉTENCES ───────────────────────────────────────────
section_title( "Compétences déclarées", C3)

comp_cand = {
    'Rédiger un CV':        s['comp_cv'],
    'Lettre de motivation': s['comp_lm'],
    'Adapter CV à offre':   s['comp_adapter_cv'],
    'Préparer entretien':   s['comp_entretien'],
}
comp_marche = {
    'Compétences recherchées': s['connaissance_competences'],
    'Salaires du domaine':     s['connaissance_salaires'],
    'Débouchés réels':         s['connaissance_debouches'],
    'Évolutions carrière':     s['connaissance_evolutions'],
}

col1, col2 = st.columns(2, gap="large")
with col1:
    fig = go.Figure(go.Bar(
        x=list(comp_cand.values()), y=list(comp_cand.keys()),
        orientation='h',
        marker=dict(color=[C1,C2,C3,C4], cornerradius=8),
        text=[f"  {v}/5" for v in comp_cand.values()],
        textposition='outside', textfont=dict(color='#0F172A', size=12)
    ))
    fig.update_layout(title="Outils de candidature /5", xaxis=dict(range=[0,5.5]))
    st.plotly_chart(light_fig(fig), use_container_width=True)

with col2:
    fig = go.Figure(go.Bar(
        x=list(comp_marche.values()), y=list(comp_marche.keys()),
        orientation='h',
        marker=dict(color=[C3,C5,C2,C6], cornerradius=8),
        text=[f"  {v}/5" for v in comp_marche.values()],
        textposition='outside', textfont=dict(color='#0F172A', size=12)
    ))
    fig.update_layout(title="Connaissance du marché /5", xaxis=dict(range=[0,5.5]))
    st.plotly_chart(light_fig(fig), use_container_width=True)

all_comp = {**comp_cand, **comp_marche}
cats = list(all_comp.keys())
vals = list(all_comp.values()) + [list(all_comp.values())[0]]
fig = go.Figure(go.Scatterpolar(
    r=vals, theta=cats + [cats[0]],
    fill='toself',
    fillcolor='rgba(59,130,246,0.08)',
    line=dict(color=C1, width=2),
))
fig.update_layout(
    polar=dict(
        bgcolor='rgba(0,0,0,0)',
        radialaxis=dict(visible=True, range=[0,5],
            gridcolor='rgba(148,163,184,0.2)', color='#CBD5E1',
            tickfont=dict(color='#94A3B8')),
        angularaxis=dict(gridcolor='rgba(148,163,184,0.15)', color='#64748B')
    ),
    title="Vue radar — toutes les compétences",
    showlegend=False, height=400
)
st.plotly_chart(light_fig(fig), use_container_width=True)

st.markdown("---")

# ─── VALIDATION MARCHÉ ─────────────────────────────────────
section_title( "Validation du marché", C4)

st.markdown(f"""
<div style="background:linear-gradient(135deg,rgba(59,130,246,0.07),rgba(6,182,212,0.05));
  border:1px solid rgba(59,130,246,0.18);border-radius:20px;
  padding:2.5rem 3rem;display:flex;align-items:center;gap:3rem;
  flex-wrap:wrap;margin-bottom:2rem;
  box-shadow:0 8px 32px rgba(59,130,246,0.08)">
  <div style="font-size:5rem;font-weight:900;letter-spacing:-0.04em;
    background:linear-gradient(135deg,{C1},{C2});
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    background-clip:text;line-height:1">
    {pct(oui_util,N)}%
  </div>
  <div>
    <div style="font-size:1.4rem;font-weight:800;color:#0F172A;margin-bottom:8px;letter-spacing:-0.02em">
      utiliseraient Career_App si elle existait demain
    </div>
    <div style="color:#64748B;font-size:.92rem;max-width:460px;line-height:1.7">
      Des jeunes prêts à utiliser une app qui analyse leur profil, génère un CV optimisé,
      simule des entretiens et crée un plan d'apprentissage sur mesure.
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

col1, col2 = st.columns(2, gap="large")
with col1:
    wtp = dict(sorted(s['willingness_to_pay'].items(), key=lambda x: x[1], reverse=True))
    fig = px.pie(names=list(wtp.keys()), values=list(wtp.values()),
        color_discrete_sequence=[C4, C1, '#CBD5E1', '#E2E8F0'],
        hole=0.65, title="Prêt(e) à payer 5–10€/mois ?")
    fig.update_traces(textposition='outside', textinfo='percent+label')
    st.plotly_chart(light_fig(fig), use_container_width=True)

with col2:
    feat = dict(sorted(s['feature_utile'].items(), key=lambda x: x[1], reverse=True))
    fig = px.bar(x=list(feat.values()), y=list(feat.keys()), orientation='h',
        color=list(feat.keys()), color_discrete_sequence=COLORS,
        title="Fonctionnalité la plus attendue")
    fig.update_traces(marker_cornerradius=8)
    fig.update_layout(showlegend=False)
    st.plotly_chart(light_fig(fig), use_container_width=True)

int_data = dict(sorted(s['interet_app'].items(), key=lambda x: x[1], reverse=True))
fig = px.bar(x=list(int_data.keys()), y=list(int_data.values()),
    color=list(int_data.keys()),
    color_discrete_sequence=[C4, C1, C5, '#EF4444'],
    title="Niveau d'intérêt pour l'application")
fig.update_traces(marker_cornerradius=8)
fig.update_layout(showlegend=False)
st.plotly_chart(light_fig(fig), use_container_width=True)

st.markdown("---")

# ─── VERBATIMS ─────────────────────────────────────────────
section_title("💬", "Ce qu'ils disent vraiment", C6)

def show_quotes(quotes, accent_colors, max_q=6):
    picks = [q for q in quotes if q and len(str(q).strip()) > 5][:max_q]
    cols = st.columns(3, gap="medium")
    for i, q in enumerate(picks):
        with cols[i % 3]:
            st.markdown(f"""
            <div style="background:rgba(255,255,255,0.7);backdrop-filter:blur(8px);
              border:1px solid rgba(255,255,255,0.9);border-radius:16px;padding:20px;
              border-left:3px solid {accent_colors[i % len(accent_colors)]};
              font-size:.85rem;line-height:1.7;color:#334155;
              box-shadow:0 2px 12px rgba(0,0,0,0.04);margin-bottom:12px">
              <span style="font-size:1.4rem;opacity:0.25;line-height:0">"</span> {q}
            </div>""", unsafe_allow_html=True)

st.markdown("<div style='font-size:.8rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.12em;margin-bottom:1rem'>Stress professionnel actuel</div>", unsafe_allow_html=True)
show_quotes(s['stress_pro'], COLORS)

st.markdown("<div style='font-size:.8rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.12em;margin:1.5rem 0 1rem'>Ce qui manque aux solutions actuelles</div>", unsafe_allow_html=True)
show_quotes(s['manque_solutions'], COLORS[::-1])

st.markdown("---")

# ─── FOOTER ────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;justify-content:space-between;align-items:center;
  flex-wrap:wrap;gap:12px;color:#94A3B8;font-size:.78rem;padding-bottom:2rem">
  <div>Career_App · Questionnaire Terrain · 40 répondants · 2024</div>
  <div style="font-weight:700;background:linear-gradient(135deg,{C1},{C2});
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
    Le projet tient la route. Les chiffres parlent.
  </div>
</div>
""", unsafe_allow_html=True)