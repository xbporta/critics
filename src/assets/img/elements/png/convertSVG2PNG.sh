#!/bin/bash
for f in `find . -type f -name "*.svg"` ; do
	filename=$(basename $f)
        echo "Now Processing File: ${filename}"
        let filelength=${#filename}-4
        filenamenoext=${filename:0:${filelength}}
        if [ ! -f "$filenamenoext".png ]
        then
        	convert -background none "$f" -resize 64x64 "$filenamenoext".png
        fi
done
