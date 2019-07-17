# specify the node base image with your desired version node:<version>
FROM node:6

# USER node

WORKDIR /crib
COPY . /crib/
RUN npm install

EXPOSE 3000
CMD ["node", "app"]
