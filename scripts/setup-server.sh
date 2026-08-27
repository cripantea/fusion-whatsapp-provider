#!/usr/bin/env bash
#
# Prima preparazione di una VPS Ubuntu/Debian per ospitare Fusion WhatsApp Provider.
#
# Uso (come root o con sudo):
#   bash scripts/setup-server.sh
#
# Esegue:
#   1. Installazione di Docker Engine + plugin Docker Compose
#   2. Creazione dell'utente di deploy e della cartella dell'applicazione
#   3. Clonazione del repository e creazione di .env da .env.example
#   4. Generazione di una chiave SSH dedicata per GitHub Actions
#   5. Firewall di base (UFW): SSH, HTTP, HTTPS
#
# Non avvia i container: il primo deploy va fatto manualmente (vedi il messaggio
# finale) oppure lasciando che sia il workflow .github/workflows/deploy.yml a farlo
# dopo aver configurato i secrets del repository GitHub.

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/fusion-whatsapp-provider}"
REPO_URL="${REPO_URL:-https://github.com/cripantea/fusion-whatsapp-provider.git}"
SSH_KEY_COMMENT="${SSH_KEY_COMMENT:-github-actions-deploy}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Questo script va eseguito come root (o con sudo)." >&2
  exit 1
fi

echo "==> Aggiornamento pacchetti di sistema"
apt-get update -y
apt-get upgrade -y

echo "==> Installazione dipendenze di base"
apt-get install -y ca-certificates curl gnupg git ufw

echo "==> Installazione Docker Engine"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  ARCH="$(dpkg --print-architecture)"
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo \
    "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Docker già installato, salto."
fi

echo "==> Creazione utente di deploy \"${DEPLOY_USER}\""
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"

echo "==> Preparazione cartella applicazione: ${DEPLOY_PATH}"
mkdir -p "${DEPLOY_PATH}"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_PATH}"

if [[ ! -d "${DEPLOY_PATH}/.git" ]]; then
  echo "==> Clonazione del repository"
  sudo -u "${DEPLOY_USER}" git clone "${REPO_URL}" "${DEPLOY_PATH}"
else
  echo "Repository già presente in ${DEPLOY_PATH}, salto il clone."
fi

if [[ ! -f "${DEPLOY_PATH}/.env" && -f "${DEPLOY_PATH}/.env.example" ]]; then
  echo "==> Creo ${DEPLOY_PATH}/.env da .env.example (DA COMPILARE con i valori reali)"
  sudo -u "${DEPLOY_USER}" cp "${DEPLOY_PATH}/.env.example" "${DEPLOY_PATH}/.env"
  chmod 600 "${DEPLOY_PATH}/.env"
fi

SSH_DIR="/home/${DEPLOY_USER}/.ssh"
DEPLOY_KEY_PATH="${SSH_DIR}/id_ed25519_github_actions"
if [[ ! -f "${DEPLOY_KEY_PATH}" ]]; then
  echo "==> Genero una chiave SSH dedicata per GitHub Actions"
  sudo -u "${DEPLOY_USER}" mkdir -p "${SSH_DIR}"
  sudo -u "${DEPLOY_USER}" ssh-keygen -t ed25519 -N "" -C "${SSH_KEY_COMMENT}" -f "${DEPLOY_KEY_PATH}"
  sudo -u "${DEPLOY_USER}" touch "${SSH_DIR}/authorized_keys"
  cat "${DEPLOY_KEY_PATH}.pub" >>"${SSH_DIR}/authorized_keys"
  chmod 700 "${SSH_DIR}"
  chmod 600 "${SSH_DIR}/authorized_keys" "${DEPLOY_KEY_PATH}"
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${SSH_DIR}"
else
  echo "Chiave SSH per GitHub Actions già presente, salto la generazione."
fi

echo "==> Configurazione firewall (UFW)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cat <<EOF

============================================================
Setup completato.

Prossimi passi:

1. Compila ${DEPLOY_PATH}/.env con i valori reali (POSTGRES_PASSWORD,
   REDIS_PASSWORD, ENCRYPTION_SECRET, NEXTAUTH_SECRET, chiavi
   Facebook/Stripe, ecc.). DATABASE_URL e REDIS_URL vengono ricostruiti
   automaticamente da docker-compose.prod.yml per puntare ai servizi
   Docker interni: non serve modificarli.

2. Aggiungi questi secrets al repository GitHub
   (Settings > Secrets and variables > Actions):
     SERVER_HOST     = IP o hostname di questo server
     SERVER_USER     = ${DEPLOY_USER}
     SERVER_PORT     = 22 (o la porta SSH in uso)
     SSH_PRIVATE_KEY = contenuto di ${DEPLOY_KEY_PATH}

3. Primo avvio manuale (facoltativo: il workflow di deploy lo esegue comunque
   al primo push su main):
     su - ${DEPLOY_USER}
     cd ${DEPLOY_PATH}
     docker compose -f docker-compose.prod.yml up -d --build
============================================================
EOF
