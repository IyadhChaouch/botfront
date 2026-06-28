"use client";

// Settings surface for the Maghrebia Assistant (design canvas "Settings & Admin").
//
// A shared header sits above a two-pane layout: a left settings navigation
// (Profil · Préférences · Notifications · Confidentialité & données · Sécurité)
// and the active tab's content. The Préférences tab is wired to the shared
// PreferencesProvider, so the language / theme / text-size / reduce-motion
// controls take effect across the whole app immediately and persist.
//
// All visuals use semantic Theme_Token utilities for light/dark parity; status
// pills use the success token and destructive actions use the error token
// (never the gold accent, per the design rationale).

import { useState } from "react";

import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

import { AppHeader } from "@/components/AppHeader";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Segmented, SettingRow, Toggle } from "@/components/SettingControls";
import { usePreferences, useT, type Locale, type TextSize, type ThemeMode } from "@/lib/preferences";

type TabId = "profil" | "preferences" | "notifications" | "privacy" | "security";

const TABS: Array<{ id: TabId; key: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { id: "profil", key: "settings.profil", Icon: UserIcon },
  { id: "preferences", key: "settings.preferences", Icon: AdjustmentsHorizontalIcon },
  { id: "notifications", key: "settings.notifications", Icon: BellIcon },
  { id: "privacy", key: "settings.privacy", Icon: ShieldCheckIcon },
  { id: "security", key: "settings.security", Icon: LockClosedIcon },
];

const card = "rounded-[14px] border border-border bg-surface";

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[22px] font-bold tracking-tight text-text">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
    </div>
  );
}

function ProfilTab() {
  const { locale, setLocale } = usePreferences();
  const [saved, setSaved] = useState(false);

  const field =
    "rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-text";

  return (
    <div className="max-w-[620px]">
      <SectionHeading title="Profil" subtitle="Vos informations personnelles et de contact." />

      <div className={`${card} p-6`}>
        <div className="mb-6 flex items-center gap-[18px] border-b border-border/70 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/15 text-[22px] font-bold text-brand">
            SB
          </div>
          <div>
            <div className="text-base font-semibold text-text">Salah Ben Amor</div>
            <button
              type="button"
              className="mt-1.5 rounded-lg border border-brand/30 px-3 py-1.5 text-[12.5px] font-semibold text-brand transition hover:bg-brand/10"
            >
              Changer la photo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text">Nom complet</span>
            <input type="text" defaultValue="Salah Ben Amor" className={`w-full ${field}`} />
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text">E-mail</span>
            <input
              type="email"
              dir="ltr"
              defaultValue="salah.benamor@example.tn"
              className={`w-full ${field}`}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text">Téléphone</span>
            <input type="tel" dir="ltr" defaultValue="+216 98 123 456" className={`w-full ${field}`} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text">Langue préférée</span>
            <div className="relative">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className={`w-full appearance-none ${field} pe-9`}
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSaved(true)}
            className="rounded-[10px] bg-brand px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-dark"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="px-4 py-2.5 text-[13.5px] font-semibold text-text-muted transition hover:text-text"
          >
            Annuler
          </button>
          {saved ? (
            <span className="ms-auto flex items-center gap-1.5 text-[13px] font-medium text-success">
              <CheckIcon className="h-4 w-4" />
              Modifications enregistrées
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { locale, setLocale, theme, setTheme, textSize, setTextSize, reduceMotion, setReduceMotion } =
    usePreferences();

  return (
    <div className="max-w-[640px]">
      <SectionHeading title="Préférences" subtitle="Langue, apparence et confort de lecture." />

      <div className={`${card} px-6 py-1`}>
        <SettingRow title="Langue" description="Langue de l'interface et des réponses.">
          <Segmented<Locale>
            ariaLabel="Langue"
            value={locale}
            onChange={setLocale}
            options={[
              { value: "fr", label: "Français" },
              { value: "ar", label: "العربية", ariaLabel: "العربية" },
            ]}
          />
        </SettingRow>

        <SettingRow title="Thème" description="Apparence claire ou sombre.">
          <Segmented<ThemeMode>
            ariaLabel="Thème"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: "Clair" },
              { value: "dark", label: "Sombre" },
              { value: "system", label: "Système" },
            ]}
          />
        </SettingRow>

        <div className="border-b border-border/70 py-[18px] last:border-b-0">
          <div className="mb-3.5 flex items-center justify-between gap-5">
            <div>
              <div className="text-sm font-semibold text-text">Taille du texte</div>
              <div className="mt-0.5 text-[12.5px] text-text-muted">
                Pour un meilleur confort de lecture.
              </div>
            </div>
            <Segmented<TextSize>
              ariaLabel="Taille du texte"
              value={textSize}
              onChange={setTextSize}
              options={[
                { value: "sm", label: "Petite" },
                { value: "base", label: "Normale" },
                { value: "lg", label: "Grande" },
                { value: "xl", label: "XL" },
              ]}
            />
          </div>
          <div className="rounded-[10px] border border-dashed border-border bg-bg px-4 py-3.5 text-sm leading-relaxed text-text">
            Aperçu — « La Responsabilité Civile est obligatoire ; vous pouvez ajouter Vol et
            Incendie. »
          </div>
        </div>
      </div>

      <div className={`${card} mt-4 px-6 py-1`}>
        <SettingRow
          title="Réduire les animations"
          description="Limite les transitions et effets de mouvement."
        >
          <Toggle
            label="Réduire les animations"
            checked={reduceMotion}
            onChange={setReduceMotion}
          />
        </SettingRow>
      </div>
    </div>
  );
}

type NotifChannels = { email: boolean; push: boolean };

function NotificationsTab() {
  const [rows, setRows] = useState<Record<string, NotifChannels>>({
    products: { email: true, push: false },
    renewals: { email: true, push: true },
    claims: { email: true, push: true },
  });

  const set = (id: string, channel: keyof NotifChannels, value: boolean) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [channel]: value } }));

  const ROWS: Array<{ id: string; title: string; desc: string }> = [
    { id: "products", title: "Nouveautés produits", desc: "Offres et nouvelles garanties." },
    { id: "renewals", title: "Rappels d'échéance", desc: "Avant l'expiration de vos contrats." },
    {
      id: "claims",
      title: "Réponses à mes réclamations",
      desc: "Suivi de vos dossiers de sinistre.",
    },
  ];

  return (
    <div className="max-w-[680px]">
      <SectionHeading title="Notifications" subtitle="Choisissez ce que vous recevez et où." />

      <div className={`${card} px-6 py-1.5`}>
        <div className="flex items-center border-b border-border/70 py-3">
          <div className="flex-1" />
          <div className="w-[70px] text-center text-[11px] font-semibold tracking-wide text-text-muted">
            E-MAIL
          </div>
          <div className="w-[70px] text-center text-[11px] font-semibold tracking-wide text-text-muted">
            PUSH
          </div>
        </div>

        {ROWS.map((row) => (
          <div key={row.id} className="flex items-center border-b border-border/70 py-[18px] last:border-b-0">
            <div className="flex-1 pe-4">
              <div className="text-sm font-semibold text-text">{row.title}</div>
              <div className="mt-0.5 text-[12.5px] text-text-muted">{row.desc}</div>
            </div>
            <div className="flex w-[70px] justify-center">
              <Toggle
                label={`${row.title} — e-mail`}
                checked={rows[row.id].email}
                onChange={(v) => set(row.id, "email", v)}
              />
            </div>
            <div className="flex w-[70px] justify-center">
              <Toggle
                label={`${row.title} — push`}
                checked={rows[row.id].push}
                onChange={(v) => set(row.id, "push", v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyTab() {
  const [analytics, setAnalytics] = useState(true);
  const [personalization, setPersonalization] = useState(false);

  return (
    <div className="max-w-[680px]">
      <SectionHeading
        title="Confidentialité & données"
        subtitle="Gérez vos données et vos préférences de confidentialité."
      />

      <div className={`${card} mb-4 px-6 py-1`}>
        <SettingRow
          title="Télécharger mes données"
          description="Une archive de vos conversations et informations."
        >
          <button
            type="button"
            className="flex items-center gap-2 rounded-[9px] border border-border px-3.5 py-2.5 text-[13px] font-semibold text-text transition hover:bg-brand/5"
          >
            <ArrowDownTrayIcon className="h-[15px] w-[15px] text-text-muted" />
            Télécharger
          </button>
        </SettingRow>
        <SettingRow
          title="Supprimer l'historique de conversation"
          description="Efface définitivement tous vos échanges."
        >
          <button
            type="button"
            className="flex items-center gap-2 rounded-[9px] border border-error/40 px-3.5 py-2.5 text-[13px] font-semibold text-error transition hover:bg-error/10"
          >
            <TrashIcon className="h-[15px] w-[15px]" />
            Supprimer
          </button>
        </SettingRow>
      </div>

      <div className={`${card} px-6 py-1`}>
        <SettingRow
          title="Analyse anonyme des conversations"
          description="Aide à améliorer la qualité des réponses."
        >
          <Toggle label="Analyse anonyme" checked={analytics} onChange={setAnalytics} />
        </SettingRow>
        <SettingRow
          title="Personnalisation des recommandations"
          description="Suggestions basées sur vos contrats."
        >
          <Toggle
            label="Personnalisation"
            checked={personalization}
            onChange={setPersonalization}
          />
        </SettingRow>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [twoFactor, setTwoFactor] = useState(true);

  const sessions: Array<{
    id: string;
    device: string;
    meta: string;
    current?: boolean;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
  }> = [
    {
      id: "mac",
      device: "MacBook Pro · Chrome",
      meta: "Tunis, TN · maintenant",
      current: true,
      Icon: ComputerDesktopIcon,
    },
    {
      id: "iphone",
      device: "iPhone 14 · App AMI",
      meta: "Tunis, TN · il y a 2 h",
      Icon: DevicePhoneMobileIcon,
    },
    {
      id: "win",
      device: "Windows · Edge",
      meta: "Sfax, TN · il y a 3 j",
      Icon: ComputerDesktopIcon,
    },
  ];

  return (
    <div className="max-w-[680px]">
      <SectionHeading title="Sécurité" subtitle="Protégez l'accès à votre compte." />

      <div className={`${card} mb-4 flex items-center justify-between gap-4 px-6 py-[18px]`}>
        <div>
          <div className="text-sm font-semibold text-text">Mot de passe</div>
          <div className="mt-0.5 text-[12.5px] text-text-muted">Dernière modification il y a 3 mois.</div>
        </div>
        <button
          type="button"
          className="rounded-[9px] border border-border px-3.5 py-2.5 text-[13px] font-semibold text-text transition hover:bg-brand/5"
        >
          Changer le mot de passe
        </button>
      </div>

      <div className={`${card} mb-4 flex items-center justify-between gap-4 px-6 py-[18px]`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">Authentification à deux facteurs</span>
            {twoFactor ? (
              <span className="rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                Activée
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-[12.5px] text-text-muted">
            Un code en plus du mot de passe à chaque connexion.
          </div>
        </div>
        <Toggle label="Authentification à deux facteurs" checked={twoFactor} onChange={setTwoFactor} />
      </div>

      <div className={`${card} px-6 py-1.5`}>
        <div className="py-3.5 text-sm font-semibold text-text">Appareils &amp; sessions actives</div>
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-3.5 border-t border-border/70 py-3.5">
            <s.Icon className="h-[22px] w-[22px] text-text-muted" />
            <div className="flex-1 min-w-0">
              <div className="truncate text-[13.5px] font-semibold text-text">{s.device}</div>
              <div className="text-xs text-text-muted">{s.meta}</div>
            </div>
            {s.current ? (
              <span className="flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Session actuelle
              </span>
            ) : (
              <button type="button" className="text-[12.5px] font-semibold text-brand hover:underline">
                Déconnecter
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 flex w-fit items-center gap-2 rounded-[10px] border border-error/40 px-4 py-2.5 text-[13px] font-semibold text-error transition hover:bg-error/10"
      >
        <ArrowRightStartOnRectangleIcon className="h-[15px] w-[15px]" />
        Se déconnecter partout
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const [tab, setTab] = useState<TabId>("profil");

  return (
    <RouteGuard routeClass="protected">
      <div className="flex h-screen flex-col bg-bg text-text">
      <AppHeader active="settings" />

      <div className="flex min-h-0 flex-1">
        {/* Settings navigation */}
        <aside className="hidden w-[250px] shrink-0 flex-col gap-1 border-e border-border bg-surface p-3.5 md:flex">
          <div className="px-3 pb-3 pt-1 text-[10px] font-semibold tracking-[0.13em] text-text-muted">
            {t("settings.section")}
          </div>
          {TABS.map(({ id, key, Icon }) => {
            const selected = id === tab;
            return (
              <button
                key={id}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => setTab(id)}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  selected
                    ? "bg-brand/10 font-semibold text-brand"
                    : "font-medium text-text hover:bg-brand/5"
                }`}
              >
                <Icon className={`h-[19px] w-[19px] ${selected ? "text-brand" : "text-text-muted"}`} />
                {t(key)}
              </button>
            );
          })}
        </aside>

        {/* Tab content */}
        <main className="scroll-soft min-w-0 flex-1 overflow-y-auto bg-bg px-5 py-7 sm:px-8">
          {/* Mobile tab switcher */}
          <div className="mb-5 flex gap-2 overflow-x-auto md:hidden">
            {TABS.map(({ id, key }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  id === tab
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-text-muted"
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>

          {tab === "profil" ? <ProfilTab /> : null}
          {tab === "preferences" ? <PreferencesTab /> : null}
          {tab === "notifications" ? <NotificationsTab /> : null}
          {tab === "privacy" ? <PrivacyTab /> : null}
          {tab === "security" ? <SecurityTab /> : null}
        </main>
      </div>
      </div>
    </RouteGuard>
  );
}
