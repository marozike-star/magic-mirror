#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Nerastas Node.js. Įdiekite jį iš https://nodejs.org (LTS versija) ir paleiskite šį failą iš naujo."
  echo
  read -n 1 -s -r -p "  Paspauskite bet kurį klavišą..."
  exit 1
fi
node server.js
