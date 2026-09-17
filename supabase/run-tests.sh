#!/usr/bin/env bash
# ============================================================================
# Tests backend — couche de paiement provider-agnostic (Bictorys) + RBAC.
#
# Runner : Node.js natif (--experimental-strip-types). Aucune dépendance
# externe, aucun appel réseau : logique pure uniquement.
#
# Utilisation :  bash supabase/run-tests.sh
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Tests couche de paiement (Bictorys / providers / webhook / WAF)"
node --test \
  supabase/functions/_shared/payment/payment.test.cjs

echo ""
echo "✔ Tous les tests backend sont passés."
