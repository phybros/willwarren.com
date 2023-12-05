#!/usr/bin/env bash

TITLE=${1:-}

TITLE_SLUG="$(echo -n "$TITLE" | sed -e 's/[^[:alnum:]]/-/g' | tr -s '-' | tr A-Z a-z)"
DATE="$(date +"%F")"
SLUG="$DATE-$TITLE_SLUG"

hugo new --kind post-bundle posts/$SLUG
