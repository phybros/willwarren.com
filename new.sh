#!/usr/bin/env bash

TITLE=${1:-}

TITLE_SLUG="$(echo -n "$TITLE" | sed -e 's/[^[:alnum:]]/-/g' | sed -e 's/\<of\>//g' | sed -e 's/\<on\>//g' | sed -e 's/\<a\>//g' | sed -e 's/\<for\>//g' | sed -e 's/\<the\>//g' | sed -e 's/\<in\>//g' | tr -s '-' | tr A-Z a-z | sed -e 's/-$//' -e 's/^-//')"
DATE="$(date +"%F")"
SLUG="$DATE-$TITLE_SLUG"

#hugo new --kind post-bundle posts/$SLUG
echo $SLUG
