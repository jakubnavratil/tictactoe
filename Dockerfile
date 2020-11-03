
# Cachovani node_modules, dokud se nezmeni zavislosti
# https://stackoverflow.com/a/58487433

# Info
# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md


############## PREPARATION ##############
FROM node:12-alpine as prep

COPY package.json package-lock.json ./

# Create temporary package.json where version is set to 0.0.0
# – this way the cache of the build step won't be invalidated
# if only the version changed.
RUN ["node", "-e", "\
    const pkg = JSON.parse(fs.readFileSync('/package.json', 'utf-8'));\
    const pkgLock = JSON.parse(fs.readFileSync('/package-lock.json', 'utf-8'));\
    fs.writeFileSync('/package.json', JSON.stringify({ ...pkg, version: '0.0.0' }));\
    fs.writeFileSync('/package-run.json', JSON.stringify({ ...pkg, version: '0.0.0', scripts: {} }));\
    fs.writeFileSync('/package-lock.json', JSON.stringify({ ...pkgLock, version: '0.0.0' }));\
    "]


############## BUILD ##############
FROM node:12-alpine as build

RUN apk add --no-cache python make g++

# prep workdir
RUN mkdir -p /app/server
WORKDIR /app/server

# install and cache node modules
COPY server/package.json server/package-lock.json ./
RUN npm install --unsafe-perm

# copy and build all
COPY server .
RUN npm run build

RUN mkdir -p /app/client
WORKDIR /app/client

# install and cache node modules
COPY client/package.json client/package-lock.json ./
RUN npm install --unsafe-perm

# copy and build all
COPY client .
RUN npm run build -- --prod


############## APP ##############
FROM node:12-alpine as app

# prep workdir
RUN mkdir -p /app
WORKDIR /app

# copy packages json without scripts - cache
COPY server/package.json server/package-lock.json ./

# install (without devDependencies)
RUN npm install --only=prod

# copy builded apps
COPY --from=build /app/server/lib ./lib
COPY --from=build /app/client/dist/client ./public

ENV port 2567
EXPOSE 2567

# run app, use node directly so SIGTERM works
CMD ["node", "lib/index.js"]
