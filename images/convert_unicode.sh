for f in ./unicode_svg/*.svg
do
 echo "Processing $f"
 vips copy $f ./unicode_png/$(basename $f .svg).png
done