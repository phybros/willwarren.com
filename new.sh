#!/usr/bin/env bash

export HUGO_TITLE=${1:-}
export HUGO_TITLE_SLUG="$(echo -n "$HUGO_TITLE" | sed -e 's/[^[:alnum:]]/-/g' | sed -e 's/\<of\>//g' | sed -e 's/\<on\>//g' | sed -e 's/\<a\>//g' | sed -e 's/\<for\>//g' | sed -e 's/\<the\>//g' | sed -e 's/\<in\>//g' | tr -s '-' | tr A-Z a-z | sed -e 's/-$//' -e 's/^-//')"

hugo new --kind post-bundle posts/$HUGO_TITLE_SLUG
unset HUGO_TITLE
unset HUGO_TITLE_SLUG
