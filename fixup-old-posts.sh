#!/bin/sh

FILES=$(find content/posts -maxdepth 1 -name "*.md" -o -name "*.markdown")

for file in $FILES
do
    echo ""
    echo ""
    echo "Processing $file"
    if yq -e -N --front-matter="extract" $file ; then
        echo "$file works"
        basefile=$(basename $file)
        post_date=$(yq -e -N --front-matter="extract" '.date' $file)
        echo ""
        echo ""
        echo "OLD FILENAME ${file}"
        echo "NEW FILENAME ${post_date}-${basefile}"
        echo ""
        echo ""
    else
        echo "$file doesn't work"
    fi
    echo ""
done
