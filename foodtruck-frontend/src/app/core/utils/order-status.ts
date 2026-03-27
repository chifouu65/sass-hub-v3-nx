/**
 * Source unique de vérité pour les libellés et icônes de statut de commande.
 * À importer dans tous les composants qui affichent un statut.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:   'En attente',
  confirmed: 'En préparation',
  ready:     'Prête à récupérer',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export const ORDER_STATUS_ICONS: Record<string, string> = {
  pending:   'schedule',
  confirmed: 'restaurant',
  ready:     'check_circle',
  completed: 'done_all',
  cancelled: 'cancel',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function orderStatusIcon(status: string): string {
  return ORDER_STATUS_ICONS[status] ?? 'info';
}
