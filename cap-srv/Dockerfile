FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY . .
RUN chmod +x start.sh
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["./start.sh"]
