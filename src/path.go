package main

import (
	"net/url"
	"path"
	"path/filepath"
	"strings"
)

func get_native_path(root, slash_path string) string {
	slash_path = path.Clean(slash_path)
	rel_path := filepath.FromSlash(strings.TrimPrefix(slash_path, "/"))
	file_path := filepath.Join(root, rel_path)
	return file_path
}

func get_encoded_path(slash_path string) string {
	slash_comps := strings.Split(slash_path, "/")
	encoded_comps := []string{}
	for _, c := range slash_comps {
		encoded_comps = append(encoded_comps, url.PathEscape(c))
	}
	return strings.Join(encoded_comps, "/")
}

func has_image_ext(name string) bool {
	exts := []string{".png", ".jpg", ".jpeg", ".bmp", ".gif"}
	target := strings.ToLower(filepath.Ext(name))
	for _, e := range exts {
		if e == target {
			return true
		}
	}
	return false
}

func has_video_ext(name string) bool {
	exts := []string{".mp4"}
	target := strings.ToLower(filepath.Ext(name))
	for _, e := range exts {
		if e == target {
			return true
		}
	}
	return false
}
