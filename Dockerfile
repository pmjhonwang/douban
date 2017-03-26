FROM node:7.7.4
WORKDIR /app
ADD ./app /app
RUN npm install
CMD ["node", "index.js"]
