package main

import (
	"os"
)

type ResourceInfo struct {
	Type string `json:"type"`
	Name string `json:"name"`
	Path string `json:"path"`
	ModifiedAt int64 `json:"modified_at"`
	Size int64 `json:"size"`
	ThumbnailUrl string `json:"thumbnail_url,omitempty"`
	FileUrl string `json:"file_url,omitempty"`
}

func make_empty_resource_info(slash_path, name string) ResourceInfo {
	return ResourceInfo{
		Type: "empty",
		Name: name,
		Path: slash_path,
		ModifiedAt: 0,
		Size: 0,
	}
}

func (s *SuzunoServer) get_resource_info(slash_path string, file_info os.FileInfo) (ResourceInfo, bool) {

	name := file_info.Name()
	if slash_path == "/" {
		name = "/"
	}

	if file_info.Mode().IsRegular() && has_image_ext(name) {
		encoded_path := get_encoded_path(slash_path)
		return ResourceInfo{
			Type: "file",
			Name: name,
			Path: slash_path,
			ModifiedAt: file_info.ModTime().Unix(),
			Size: file_info.Size(),
			ThumbnailUrl: s.thumbnail_url_prefix + encoded_path,
			FileUrl: s.file_url_prefix + encoded_path,
		}, true
	} else if file_info.IsDir() {
		return ResourceInfo{
			Type: "directory",
			Name: name,
			Path: slash_path,
			ModifiedAt: file_info.ModTime().Unix(),
			Size: 0,
		}, true
	}
	return ResourceInfo{}, false
}
