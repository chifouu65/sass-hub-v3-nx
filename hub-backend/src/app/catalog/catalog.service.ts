import { Injectable } from '@nestjs/common';

export interface AppDescriptor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  plans: string[];
  category: string;
  url: string;
  comingSoon?: boolean;
}

@Injectable()
export class CatalogService {
  private readonly apps: AppDescriptor[] = [
    {
      id: 'myfoodtruck',
      name: 'MyFoodTruck',
      tagline: 'Gérez votre food truck, trouvez vos clients',
      description: 'Plateforme complète pour les gérants de food trucks : localisation en temps réel, gestion du menu, commandes click & collect, et fidélisation des clients.',
      features: [
        'Localisation GPS en temps réel',
        'Menu & catégories personnalisables',
        'Commandes click & collect',
        'Notifications d\'ouverture aux abonnés',
        'Tableau de bord gérant',
        'Suivi des statuts de commandes',
      ],
      plans: ['free', 'starter', 'pro'],
      category: 'Food & Commerce',
      url: process.env['MYFOODTRUCK_APP_URL'] ?? 'http://localhost:4201',
    },
    {
      id: 'linkedin-ai',
      name: 'LinkedIn AI Messaging',
      tagline: 'Automatise ta prospection LinkedIn avec l\'IA',
      description: 'Génère des messages LinkedIn personnalisés, planifie des campagnes multi-étapes et suis les réponses automatiquement grâce à l\'IA.',
      features: [
        'Génération de messages IA personnalisés',
        'Campagnes de prospection multi-étapes',
        'Suivi des réponses en temps réel',
        'Templates intelligents par secteur',
      ],
      plans: ['free', 'pro', 'team'],
      category: 'Marketing',
      url: 'http://localhost:4300',
    },
    {
      id: 'invoicing',
      name: 'Facturation',
      tagline: 'Factures professionnelles en un clic',
      description: 'Crée, envoie et suis tes factures clients. Intégration Stripe native, export PDF et relances automatiques pour ne jamais oublier un paiement.',
      features: [
        'Création et envoi de factures',
        'Intégration Stripe & paiement en ligne',
        'Export PDF professionnel',
        'Relances automatiques',
        'Tableau de bord revenus',
      ],
      plans: ['free', 'pro'],
      category: 'Finance',
      url: '#',
    },
    {
      id: 'analytics',
      name: 'Analytics',
      tagline: 'Métriques et tableaux de bord en temps réel',
      description: 'Visualise les performances de toutes tes apps avec des dashboards interactifs, des alertes configurables et des rapports exportables.',
      features: [
        'Dashboards temps réel',
        'Alertes et seuils configurables',
        'Export CSV & API',
        'Intégration multi-sources',
        'Rapports automatisés',
      ],
      plans: ['pro', 'team'],
      category: 'Data',
      url: '#',
    },
    {
      id: 'crm',
      name: 'CRM',
      tagline: 'Gestion de contacts et pipeline de vente',
      description: 'Centralise tes prospects, suis toutes les interactions clients et automatise ton pipeline de vente avec des workflows intelligents.',
      features: [
        'Pipeline Kanban visuel',
        'Historique complet des interactions',
        'Automatisations et workflows',
        'Import/Export contacts CSV',
        'Scoring des leads',
      ],
      plans: ['free', 'pro', 'team'],
      category: 'Sales',
      url: '#',
    },
    {
      id: 'scheduler',
      name: 'Planificateur',
      tagline: 'Agenda intelligent et gestion du temps',
      description: 'Synchronise tes calendriers, planifie des réunions sans friction et optimise ton temps avec des suggestions IA.',
      features: [
        'Synchronisation Google & Outlook',
        'Liens de prise de RDV automatique',
        'Suggestions IA de créneaux',
        'Rappels et notifications',
      ],
      plans: ['pro', 'team'],
      category: 'Productivité',
      url: '#',
      comingSoon: true,
    },
  ];

  list(): AppDescriptor[] {
    return this.apps;
  }

  findById(id: string): AppDescriptor | undefined {
    return this.apps.find(a => a.id === id);
  }
}
