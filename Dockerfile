# Container image for bryanporter.com — builds the Jekyll site and serves it
# with nginx. Multi-stage so the final image is just nginx + static _site.
#
#   docker build -t ghcr.io/brporter/bryanporter:latest .

# ---- stage 1: build the Jekyll site ----
# Debian-based ruby image (has a C toolchain) so native gems build reliably.
FROM ruby:3.3 AS build
WORKDIR /site

COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3

COPY . .
RUN bundle exec jekyll build --destination /site/_site

# ---- stage 2: serve with nginx ----
FROM nginx:alpine
COPY --from=build /site/_site /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
