package main

import (
	"encoding/json"
	"fmt"
	"image/jpeg"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
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

func get_native_path(root, slash_path string) string {
	slash_path = path.Clean(slash_path)
	rel_path := filepath.FromSlash(strings.TrimPrefix(slash_path, "/"))
	file_path := filepath.Join(root, rel_path)
	return file_path
}

func get_url(slash_path string) string {

	slash_comps := strings.Split(slash_path, "/")
	safe_slash_comps := []string{}
	for _, c := range slash_comps {
		safe_slash_comps = append(safe_slash_comps, url.PathEscape(c))
	}

	return strings.Join(safe_slash_comps, "/")
}

func is_image_ext(name string) bool {
	exts := []string{".png", ".jpg", ".jpeg", ".bmp", ".gif"}
	target := strings.ToLower(filepath.Ext(name))
	for _, e := range exts {
		if e == target {
			return true
		}
	}
	return false
}

func get_resource_info(path string, file_info os.FileInfo) (ResourceInfo, bool) {

	name := file_info.Name()

	if file_info.Mode().IsRegular() && is_image_ext(name) {
		return ResourceInfo{
			Type: "file",
			Name: name,
			Path: path,
			ModifiedAt: file_info.ModTime().Unix(),
			Size: file_info.Size(),
		}, true
	} else if file_info.IsDir() {
		return ResourceInfo{
			Type: "directory",
			Name: name,
			Path: path,
			ModifiedAt: file_info.ModTime().Unix(),
			Size: 0,
		}, true
	}
	return ResourceInfo{}, false
}

func (s *SuzunoServer) serve_file(w http.ResponseWriter, req *http.Request) {
	file_path := get_native_path(s.root, req.URL.Path)
	http.ServeFile(w, req, file_path)
}

func (s *SuzunoServer) serve_thumbnail(w http.ResponseWriter, req *http.Request) {

	file_path := get_native_path(s.root, req.URL.Path)

	stat, err := os.Stat(file_path)
	if err != nil && !os.IsNotExist(err) {
		http.Error(w, "stat failed", http.StatusInternalServerError)
		return
	}

	ok := (err == nil && stat.Mode().IsRegular())
	if !ok {
		http.NotFound(w, req)
		return
	}

	file, err := os.Open(file_path)
	if err != nil {
		http.Error(w, "IO failed", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	img, err := generate_thumbnail(file)
	if err != nil {
		err_msg := fmt.Sprintf("thumbnail error: %v\n", err)
		fmt.Fprintf(os.Stderr, "[%s, 500] thumbnail error: %v\n", req.URL.Path, err)
		http.Error(w, err_msg, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/jpeg")
	jpeg.Encode(w, img, nil)
}

func (s *SuzunoServer) serve_meta_directory(w http.ResponseWriter, req *http.Request) {
	file_path := get_native_path(s.root, req.URL.Path)

	stat, err := os.Stat(file_path)
	if err != nil && !os.IsNotExist(err) {
		http.Error(w, "stat failed", http.StatusInternalServerError)
		return
	}

	ok := (err == nil && stat.IsDir())
	if !ok {
		http.NotFound(w, req)
		return
	}

	entries, err := ioutil.ReadDir(file_path)
	if err != nil {
		http.Error(w, "stat failed", http.StatusInternalServerError)
		return
	}

	resp := struct {
		Resources []ResourceInfo `json:"resources"`
		Path string `json:"path"`
	}{
		Resources: []ResourceInfo{},
		Path: req.URL.Path,
	}

	for _, entry := range entries {
		full_slash_path := path.Join(req.URL.Path, entry.Name())
		full_url := get_url(full_slash_path)
		res, ok := get_resource_info(full_slash_path, entry)
		if ok {
			if res.Type == "file" {
				res.ThumbnailUrl = s.thumbnail_url_prefix + full_url
				res.FileUrl = s.file_url_prefix + full_url
			}
			resp.Resources = append(resp.Resources, res)
		}
	}

	bin, err := json.Marshal(&resp)
	if err != nil {
		http.Error(w, "marshaling failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(bin)
}
