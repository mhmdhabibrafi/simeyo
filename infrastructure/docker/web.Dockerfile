FROM node:24-bookworm-slim
WORKDIR /repo/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY packages ./packages
COPY apps/web ./apps/web
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
