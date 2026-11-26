# Como colocar o StockFlow no ar

Este guia leva o sistema do seu computador para a internet, com endereço próprio e HTTPS (o cadeado).
Cada parte explica **o que é** e **por que** antes de mostrar o comando.

## 1. O quadro geral

```
 celular / computador
        │  https://app.sualoja.com.br
        ▼
┌────────────────────── VPS (um computador alugado, ligado 24h) ──────────────────────┐
│  Docker                                                                               │
│   ┌──────────┐   /api/*    ┌──────────┐        ┌─────────────┐                        │
│   │  web     │ ──────────► │   api    │ ─────► │  postgres   │   (banco de dados)     │
│   │  (Caddy) │             │ (FastAPI)│        │             │                        │
│   └──────────┘             └──────────┘        └─────────────┘                        │
│    site + HTTPS            regras do sistema    só acessível por dentro               │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- **VPS**: um computador alugado na internet, ligado o tempo todo. É onde o sistema roda.
- **Domínio**: o endereço (`app.sualoja.com.br`). Você aponta ele para o IP da VPS.
- **Docker**: empacota cada parte (site, API, banco) numa "caixa" igual em qualquer máquina. O que funcionou no seu computador funciona no servidor.
- **Caddy**: o porteiro. Recebe tudo, entrega o site, repassa `/api` para a API e **consegue o certificado HTTPS sozinho** (e renova).
- **Postgres**: o banco. **Não tem porta aberta para a internet**; só a API conversa com ele.

Os arquivos que montam isso estão no repositório: `docker-compose.prod.yml`, `frontend/Dockerfile`, `frontend/Caddyfile`.

## 2. O que comprar (único gasto)

**VPS**: Ubuntu 24.04 LTS, mínimo **2 GB de RAM**, 1 a 2 vCPU, 20 GB ou mais de disco, IPv4. Se possível com datacenter no Brasil (o sistema fica mais rápido). Pague por mês, não por 3 anos, até confirmar que está feliz.

**Domínio**: no [registro.br](https://registro.br) (`.com.br`, cerca de R$ 40 por ano).

Depois da compra você terá: o **IP** da VPS, a **senha de root** (ou uma chave SSH) e o domínio.

## 3. Apontar o domínio para a VPS (DNS)

No painel do registro.br (ou onde o DNS estiver), crie um registro:

| Tipo | Nome | Valor |
|------|------|-------|
| A | `app` (ou `@` para o domínio raiz) | IP da VPS |

Pode levar de minutos a algumas horas. Teste com `ping app.sualoja.com.br`: deve responder com o IP da VPS.
**O Caddy só consegue o HTTPS depois que o DNS está certo**, então faça isto antes do passo 6.

## 4. Preparar o servidor (uma vez)

Entre na VPS pelo terminal: `ssh root@IP-DA-VPS`.

```bash
# 1. atualizar o sistema
apt update && apt upgrade -y

# 2. criar um usuário normal (não trabalhe como root) e dar permissão de administrador
adduser stockflow
usermod -aG sudo stockflow
```

Copie a sua chave SSH para o novo usuário (no **seu computador**): `ssh-copy-id stockflow@IP-DA-VPS`.
Depois, no servidor, **desligue o login por senha** (só entra quem tem a chave) e o login como root:

```bash
sudo nano /etc/ssh/sshd_config
#   PasswordAuthentication no
#   PermitRootLogin no
sudo systemctl restart ssh
```

> Antes de fechar o terminal, abra **outro** e confirme que `ssh stockflow@IP-DA-VPS` entra. Se errar essa etapa você se tranca para fora.

Firewall (só 3 portas abertas: SSH, site e HTTPS) e proteção contra tentativas de invasão:

```bash
sudo apt install -y ufw fail2ban unattended-upgrades
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

- `ufw` é o firewall: bloqueia tudo que não foi liberado.
- `fail2ban` bloqueia quem erra a senha do SSH várias vezes.
- `unattended-upgrades` instala sozinho as correções de segurança do sistema.

Instalar o Docker (comando oficial):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker stockflow     # depois saia e entre de novo no SSH
```

Se a VPS tiver pouca memória (2 GB), crie um "swap" para a construção do site não falhar:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 5. Colocar o código no servidor

```bash
cd ~
git clone https://github.com/fernanndev/stockflow-api.git
cd stockflow-api
git checkout v1.2.1        # a versão que você testou
```

(O repositório é público, então o `git clone` não pede senha. Se um dia ele virar privado, crie em GitHub → Settings → Deploy keys uma chave de leitura para o servidor.)

## 6. Configurar e subir

```bash
cp .env.production.example .env
nano .env
```

Preencha:
- `DOMAIN`: o domínio do passo 3, **sem** `https://`.
- `POSTGRES_PASSWORD`: gere com `openssl rand -hex 24`.
- `SECRET_KEY`: gere com `openssl rand -hex 32`. **Guarde uma cópia num lugar seguro** (gerenciador de senhas): se perdê-la, todo mundo precisa logar de novo.
- `MAX_STORES`: quantas lojas esta instalação pode ter (o plano do cliente).

Subir tudo:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f      # Ctrl+C sai; os containers continuam
```

Na primeira vez a construção leva alguns minutos. A API cria o banco sozinha (as _migrations_ rodam toda vez que ela inicia). Abra `https://SEU-DOMINIO`: deve aparecer a tela de login com o cadeado.

## 7. Criar o primeiro usuário

O sistema não tem cadastro público (de propósito). O primeiro usuário se cria pelo servidor:

```bash
docker compose -f docker-compose.prod.yml exec api python -m app.create_user --name "Seu Nome" --email voce@exemplo.com
```

Ele pede a senha (mínimo 8 caracteres). Cada pessoa pode depois trocar a própria senha no sistema (ícone da chave no topo, ou "Mais → Senha" no celular). Se alguém **esquecer** a senha, você define uma nova pelo servidor:

```bash
docker compose -f docker-compose.prod.yml exec api python -m app.reset_password --email voce@exemplo.com
```

Entre no sistema, abra o menu da loja (topo) → **Configurações da loja** e coloque nome, logo e cores da primeira loja. Para a segunda: menu da loja → **Nova loja**. Cada pessoa que for usar precisa do próprio usuário (rode o comando de novo).

## 8. Backup (não pule)

Dois arquivos por backup: o banco e as fotos. Teste agora:

```bash
./deploy/backup.sh
ls ~/backups
```

Automatizar toda noite às 3h (`crontab -e`):

```
0 3 * * * cd /home/stockflow/stockflow-api && ./deploy/backup.sh >> /home/stockflow/backup.log 2>&1
```

Guarda os últimos 14 dias. **Um backup só no servidor não é backup**: se a VPS for perdida, ele some junto. Copie a pasta `~/backups` para fora de vez em quando (o seu computador com `scp`, ou um drive na nuvem com `rclone`).

**Restaurar** (substitui os dados atuais, pede para você digitar `YES`):

```bash
./deploy/restore.sh ~/backups/db_2026-11-30_0300.dump ~/backups/uploads_2026-11-30_0300.tar.gz
```

> Teste a restauração **uma vez** com dados de teste, antes de precisar dela de verdade.

## 9. Aviso quando cair

Crie uma conta grátis no [UptimeRobot](https://uptimerobot.com), adicione um monitor HTTPS para `https://SEU-DOMINIO` a cada 5 minutos e ligue o alerta por e-mail.

## 10. Atualizar para uma versão nova

O caminho do código é sempre o mesmo, e **nunca se edita nada direto no servidor**:

```
seu computador ──git push──► GitHub ──git pull──► VPS ──► o sistema atualizado
```

1. No seu computador: altera, testa, faz o commit e o `git push` (e uma tag para marcar a versão, por exemplo `v1.2.1`).
2. No servidor, um comando só:

```bash
cd ~/stockflow-api
./deploy/update.sh              # o código mais novo (branch main)
./deploy/update.sh v1.2.1       # ou exatamente uma versão
```

Ele faz o backup, baixa o código, reconstrói e reinicia. Os **dados não se perdem** (o banco e as fotos ficam em "volumes" separados do código) e o banco é atualizado sozinho. O sistema fica indisponível por alguns segundos durante a troca.

Se uma versão der problema: `./deploy/update.sh v1.2.0` volta para a anterior (e, se mexeu em dados, o backup de antes está em `~/backups`).

## 11. Comandos do dia a dia

```bash
docker compose -f docker-compose.prod.yml ps                 # o que está rodando
docker compose -f docker-compose.prod.yml logs -f api       # o que a API está dizendo
docker compose -f docker-compose.prod.yml restart api       # reiniciar a API
docker compose -f docker-compose.prod.yml down              # desligar (os dados ficam)
```

Nunca use `down -v`: o `-v` **apaga os dados**.

## 12. Se algo der errado

| Sintoma | Causa provável |
|---|---|
| O site não abre / sem cadeado | O DNS ainda não aponta para a VPS, ou as portas 80/443 estão fechadas. Veja `docker compose ... logs web`. |
| Tela de login mas "não foi possível conectar" | A API caiu. `logs api` mostra o motivo (quase sempre variável faltando no `.env`). |
| "Muitas tentativas erradas" no login | O bloqueio de 5 erros em 5 minutos. Espere ou reinicie a API (`restart api`). |
| Subiu mas está lento ao construir | Pouca memória: crie o swap (passo 4). |

## Lista de segurança

- [ ] Login por senha e como root desligados no SSH
- [ ] Firewall ligado com só SSH, 80 e 443
- [ ] `.env` só no servidor (nunca no GitHub) e `SECRET_KEY` guardada em outro lugar
- [ ] Backup noturno funcionando **e restauração testada**
- [ ] Cópia dos backups fora do servidor
- [ ] Monitor de disponibilidade avisando por e-mail
