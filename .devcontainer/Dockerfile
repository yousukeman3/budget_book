FROM node:18

# pnpm グローバルインストール
RUN npm install -g pnpm

# /app の用意とパーミッション変更
RUN mkdir -p /app && chown node:node /app && mkdir -p /home/node/.pnpm-store && chown -R node:node /home/node/.pnpm-store
RUN mkdir -p /home/node/.ssh && chown -R node:node /home/node

# ワーキングディレクトリを /app に
WORKDIR /app

# すでに存在する UID 1000 / GID 1000 の node ユーザーに切り替え
USER node
