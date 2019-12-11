package main

import (
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"os"
	"golang.org/x/image/draw"
)

const (
	THUMBNAIL_SIZE = 384
	MAX_WEIGHT = 20
	WEIGHT_UNIT = 1200 * 1200
)

func generate_thumbnail(src *os.File) (image.Image, error) {

	src_img, _, err := image.Decode(src)
	if err != nil {
		return nil, err
	}

	dest_rect := image.Rect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE)
	dest_img := image.NewRGBA(dest_rect)

	src_box := src_img.Bounds()
	dx := src_box.Dx()
	dy := src_box.Dy()

	crop_len := dx
	if crop_len > dy {
		crop_len = dy
	}

	sx := src_box.Min.X + (dx - crop_len) / 2
	sy := src_box.Min.Y + (dy - crop_len) / 2
	crop_box := image.Rect(sx, sy, sx + crop_len, sy + crop_len)

	draw.ApproxBiLinear.Scale(dest_img, dest_rect, src_img, crop_box, draw.Src, nil)
	return dest_img, nil
}

func calculate_weight(src *os.File) (int64, error) {

	conf, _, err := image.DecodeConfig(src)
	if err != nil {
		return 0, err
	}

	w := float64(conf.Width)
	h := float64(conf.Height)
	t := w * h
	s := math.Min(math.Ceil(t / WEIGHT_UNIT), float64(MAX_WEIGHT))

	return int64(s), nil
}
