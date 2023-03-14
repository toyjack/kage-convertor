for f in ./dkw_svg/*.svg
do
 echo "Processing $f"
 vips copy $f ./dkw_png/$(basename $f .svg).png
done