FROM node:21-alpine

WORKDIR /app

COPY package.json .

RUN yarn

COPY . .

RUN yarn build

EXPOSE 5173

CMD [ "yarn", "preview", "--port", "5173" ]
