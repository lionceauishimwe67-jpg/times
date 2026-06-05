import { Translations, Language } from '../types';

export const translations: Translations = {
  currentSessions: {
    en: 'Current Sessions',
    fr: 'Sessions Actuelles',
    sw: 'Vipindi vya Sasa',
  },
  class: {
    en: 'Class',
    fr: 'Classe',
    sw: 'Darasa',
  },
  subject: {
    en: 'Subject',
    fr: 'Matière',
    sw: 'Somo',
  },
  teacher: {
    en: 'Teacher',
    fr: 'Professeur',
    sw: 'Mwalimu',
  },
  classroom: {
    en: 'Classroom',
    fr: 'Salle de Classe',
    sw: 'Chumba cha Darasa',
  },
  time: {
    en: 'Time',
    fr: 'Heure',
    sw: 'Wakati',
  },
  temporary: {
    en: 'Temporary',
    fr: 'Temporaire',
    sw: 'Ya Muda',
  },
  noSessions: {
    en: 'No active sessions at this time',
    fr: 'Aucune session active pour le moment',
    sw: 'Hakuna vipindi vinavyoendelea kwa sasa',
  },
  announcements: {
    en: 'Announcements',
    fr: 'Annonces',
    sw: 'Matangazo',
  },
  loading: {
    en: 'Loading...',
    fr: 'Chargement...',
    sw: 'Inapakia...',
  },
  error: {
    en: 'Error loading data',
    fr: 'Erreur de chargement des données',
    sw: 'Kosa katika kupakia data',
  },
  login: {
    en: 'Login',
    fr: 'Connexion',
    sw: 'Ingia',
  },
  username: {
    en: 'Username',
    fr: "Nom d'utilisateur",
    sw: 'Jina la Mtumiaji',
  },
  password: {
    en: 'Password',
    fr: 'Mot de passe',
    sw: 'Nenosiri',
  },
  dashboard: {
    en: 'Dashboard',
    fr: 'Tableau de Bord',
    sw: 'Dashibodi',
  },
  timetable: {
    en: 'Timetable',
    fr: 'Emploi du Temps',
    sw: 'Ratiba',
  },
  manageAnnouncements: {
    en: 'Manage Announcements',
    fr: 'Gérer les Annonces',
    sw: 'Simamia Matangazo',
  },
  logout: {
    en: 'Logout',
    fr: 'Déconnexion',
    sw: 'Ondoka',
  },
  add: {
    en: 'Add',
    fr: 'Ajouter',
    sw: 'Ongeza',
  },
  edit: {
    en: 'Edit',
    fr: 'Modifier',
    sw: 'Hariri',
  },
  delete: {
    en: 'Delete',
    fr: 'Supprimer',
    sw: 'Futa',
  },
  save: {
    en: 'Save',
    fr: 'Sauvegarder',
    sw: 'Hifadhi',
  },
  cancel: {
    en: 'Cancel',
    fr: 'Annuler',
    sw: 'Ghairi',
  },
  confirm: {
    en: 'Confirm',
    fr: 'Confirmer',
    sw: 'Thibitisha',
  },
  allClasses: {
    en: 'All Classes',
    fr: 'Toutes les Classes',
    sw: 'Madarasa Yote',
  },
  filterByClass: {
    en: 'Filter by Class',
    fr: 'Filtrer par Classe',
    sw: 'Chuja kwa Darasa',
  },
  lastUpdated: {
    en: 'Last updated',
    fr: 'Dernière mise à jour',
    sw: 'Mwisho kusasishwa',
  },
  connectionError: {
    en: 'Connection error. Retrying...',
    fr: 'Erreur de connexion. Nouvelle tentative...',
    sw: 'Kosa la muunganiko. Inajaribu tena...',
  },
};

export function t(key: keyof Translations, lang: Language = 'en'): string {
  return (translations[key]?.[lang] || translations[key]?.['en'] || key) as string;
}
