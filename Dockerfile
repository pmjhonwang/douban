FROM node:7.7.4
WORKDIR /app
ADD ./app /app

CMD ["node", "index.js"]